"""AI Service — Batch LLM decisions via OpenRouter.

1000 agents → 20 batches × 50 agents = 20 API calls per tick.
Each batch: one prompt → LLM returns decisions for all 50 agents.
"""

import os
import json
import random
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from loguru import logger

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Free/cheap models that handle batch JSON well
PRIMARY_MODEL = "deepseek/deepseek-v4-flash"
FALLBACK_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free"

BATCH_SIZE = 50  # agents per API call
MAX_CONCURRENT = 5  # parallel API calls

BATCH_SYSTEM_PROMPT = """You are an economic simulation engine. You receive a batch of agents and must return a JSON array of decisions.

ECONOMY RULES (CLOSED LOOP — money circulates, never created/destroyed):
- Workers earn salary FROM entrepreneurs (entrepreneur pays)
- Workers spend ON goods FROM entrepreneurs (money circulates)
- Entrepreneurs hire workers and produce goods
- Investors get ROI/dividends based on market performance
- Bankers lend money TO real agents, get repaid with interest
- Government collects taxes and distributes subsidies
- Researchers boost sector productivity

DECISION FORMAT — return ONLY a JSON array. One object per agent, in the SAME ORDER as input.

Available actions per role:
- worker: {"id": N, "action": "spend", "amount": X, "target_role": "entrepreneur"}  — buy goods (money goes to a random entrepreneur)
- worker: {"id": N, "action": "save"}  — skip this tick
- entrepreneur: {"id": N, "action": "hire", "amount": X}  — pay salaries to workers
- entrepreneur: {"id": N, "action": "produce", "sector": "X", "amount": X}  — invest in production
- entrepreneur: {"id": N, "action": "save"}  — skip
- investor: {"id": N, "action": "invest", "amount": X, "sector": "X"}  — invest capital
- investor: {"id": N, "action": "dividend", "amount": X}  — take profits (from market returns)
- investor: {"id": N, "action": "save"}  — skip
- banker: {"id": N, "action": "lend", "amount": X, "rate": 0.05-0.15}  — give loan to needy agents
- banker: {"id": N, "action": "save"}  — skip
- government: {"id": N, "action": "subsidy", "sector": "X", "amount": X}  — support sector
- government: {"id": N, "action": "tax_cut", "rate": 0.05-0.10}  — reduce taxes
- government: {"id": N, "action": "save"}  — skip
- researcher: {"id": N, "action": "innovate", "sector": "X", "amount": X}  — boost sector
- researcher: {"id": N, "action": "save"}  — skip

BE STRATEGIC:
- Consider each agent's capital, personality, and market conditions
- Workers with low capital should save; with high capital should spend to stimulate economy
- Entrepreneurs: hire if profitable, produce if demand exists, cut costs if losing money
- Investors: diversify, take profits when up, buy when sectors are cheap
- Bankers: lend when economy needs liquidity, be cautious during crisis
- Government: subsidize struggling sectors, cut taxes in recession, stimulate growth
- Researchers: focus on sectors with most impact

CRITICAL: Return ONLY valid JSON array. No markdown, no explanation. Just:
[{"id": 0, "action": "spend", "amount": 2500, "target_role": "entrepreneur"}, {"id": 1, "action": "hire", "amount": 8000}, ...]"""


def _build_batch_prompt(agents: List[Any], market_snapshot: Dict) -> str:
    """Build user prompt describing all agents in batch."""
    lines = [
        f"Current tick: {market_snapshot.get('tick', '?')}",
        f"Active agents: {market_snapshot.get('active_agents', '?')}",
        f"GDP: {market_snapshot.get('gdp', 0)/1e6:.1f}M",
        f"Gini: {market_snapshot.get('gini', 0):.3f}",
        f"Avg income: {market_snapshot.get('avg_income', 0):.0f}",
        "",
        "Make decisions for these agents:",
        "",
    ]
    
    for i, a in enumerate(agents):
        lines.append(
            f"[{i}] id={a.id} role={a.role} capital={a.capital:.0f} "
            f"income={a.income:.0f} expenses={a.expenses:.0f} "
            f"debt={a.debt:.0f} sector={a.sector or 'general'} "
            f"risk={a.risk_tolerance:.2f} greed={a.greediness:.2f} "
            f"intelligence={a.intelligence:.2f} innovation={a.innovation:.2f}"
        )
    
    lines.append("")
    lines.append("Return JSON array of decisions:")
    
    return "\n".join(lines)


async def _call_llm(
    prompt: str,
    model: str,
    client: httpx.AsyncClient,
) -> Optional[str]:
    """Single LLM API call."""
    resp = await client.post(
        OPENROUTER_URL,
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/shekelstrong/ai-economy-simulator",
        },
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": BATCH_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 4000,
        },
    )
    
    if resp.status_code != 200:
        logger.debug(f"LLM {model} returned {resp.status_code}")
        return None
    
    data = resp.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    
    if not content or not isinstance(content, str):
        return None
    
    return content.strip()


def _parse_batch_response(content: str, expected_count: int) -> List[Dict]:
    """Parse LLM response into list of decisions."""
    # Strip markdown code fences
    if content.startswith("```"):
        lines = content.split("\n")
        content = "\n".join(lines[1:])
        if "```" in content:
            content = content.rsplit("```", 1)[0]
    
    try:
        decisions = json.loads(content)
    except json.JSONDecodeError:
        # Try to find JSON array in the response
        start = content.find("[")
        end = content.rfind("]") + 1
        if start >= 0 and end > start:
            try:
                decisions = json.loads(content[start:end])
            except json.JSONDecodeError:
                return []
        else:
            return []
    
    if not isinstance(decisions, list):
        return []
    
    # Validate each decision
    valid = []
    for d in decisions[:expected_count]:
        if not isinstance(d, dict):
            continue
        action = d.get("action")
        if not action or action == "save":
            valid.append({"action": "save"})
            continue
        
        amount = d.get("amount", 0)
        if isinstance(amount, (int, float)) and amount > 0:
            valid.append(d)
        else:
            valid.append({"action": "save"})
    
    # Pad with "save" if LLM returned fewer decisions
    while len(valid) < expected_count:
        valid.append({"action": "save"})
    
    return valid[:expected_count]


async def get_batch_decisions(
    agents: List[Any],
    market_snapshot: Dict[str, Any],
) -> Dict[int, Dict]:
    """Get LLM decisions for a batch of agents. Returns {agent_index: decision}."""
    
    if not OPENROUTER_API_KEY:
        return {}
    
    prompt = _build_batch_prompt(agents, market_snapshot)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Try primary model
        content = await _call_llm(prompt, PRIMARY_MODEL, client)
        
        if not content:
            # Try fallback
            content = await _call_llm(prompt, FALLBACK_MODEL, client)
        
        if not content:
            return {}
    
    decisions = _parse_batch_response(content, len(agents))
    
    results = {}
    for i, decision in enumerate(decisions):
        if i < len(agents):
            results[i] = decision
    
    return results


async def get_all_agent_decisions(
    agents: List[Any],
    market_snapshot: Dict[str, Any],
) -> Dict[int, Dict]:
    """Process ALL agents through LLM in batches. Returns {agent.id: decision}."""
    
    if not OPENROUTER_API_KEY:
        return {}
    
    # Split into batches
    batches = []
    for i in range(0, len(agents), BATCH_SIZE):
        batches.append(agents[i:i + BATCH_SIZE])
    
    results = {}
    
    # Process batches with concurrency limit
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    
    async def _process_batch(batch_idx: int, batch: List[Any]):
        async with semaphore:
            try:
                batch_decisions = await get_batch_decisions(batch, market_snapshot)
                for local_idx, decision in batch_decisions.items():
                    if local_idx < len(batch):
                        results[batch[local_idx].id] = decision
            except Exception as e:
                logger.debug(f"Batch {batch_idx} error: {e}")
                # All agents in this batch get heuristic fallback
    
    tasks = [_process_batch(i, b) for i, b in enumerate(batches)]
    await asyncio.gather(*tasks)
    
    return results
