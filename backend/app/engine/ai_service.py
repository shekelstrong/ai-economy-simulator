"""AI Service — LLM-powered agent decisions via OpenRouter."""

import os
import json
import random
import httpx
from typing import List, Dict, Any, Optional
from loguru import logger

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Модели для разных задач (реально существующие на OpenRouter)
MODELS = {
    "quick": "nvidia/nemotron-3-nano-30b-a3b:free",       # Быстрые решения (free)
    "trade": "deepseek/deepseek-v4-flash",              # Торговля
    "strategy": "x-ai/grok-4.1-fast",                   # Стратегия
    "research": "deepseek/deepseek-v4-flash",           # Исследования
    "reasoning": "deepseek/deepseek-v4-flash",          # Сложные решения
}

# Fallback free models
FALLBACK_MODELS = {
    "quick": "deepseek/deepseek-v4-flash",
    "trade": "nvidia/nemotron-3-nano-30b-a3b:free",
    "strategy": "deepseek/deepseek-v4-flash",
    "research": "nvidia/nemotron-3-nano-30b-a3b:free",
    "reasoning": "deepseek/deepseek-v4-flash",
}

# Системный промпт для агента
SYSTEM_PROMPT = """You are an economic agent in a simulation with 1000 agents. 
You must make ONE financial decision this tick based on your role and situation.

Available actions (respond with JSON only, no explanation):
1. {"action": "earn", "amount": <number>} — earn salary/work income (workers, from employer)
2. {"action": "spend", "amount": <number>} — buy goods/services (money goes to companies)
3. {"action": "invest", "amount": <number>, "sector": "<sector>"} — invest in a sector
4. {"action": "dividend", "amount": <number>} — receive investment returns (from market)
5. {"action": "lend", "amount": <number>, "rate": <0.01-0.15>} — give a loan (bankers)
6. {"action": "borrow", "amount": <number>} — take a loan (entrepreneurs)
7. {"action": "hire", "amount": <number>} — pay salary to workers (entrepreneurs)
8. {"action": "produce", "sector": "<sector>", "amount": <number>} — produce goods
9. {"action": "innovate", "sector": "<sector>"} — research boost for sector
10. {"action": "tax", "rate": <0.05-0.30>} — set tax rate (government)
11. {"action": "subsidy", "sector": "<sector>", "amount": <number>} — subsidize sector
12. {"action": "save"} — do nothing this tick

RULES:
- Amounts MUST be positive numbers
- Never spend/invest more than your capital
- Be strategic: consider your capital, market conditions, and future
- Workers: earn wages, spend on necessities
- Entrepreneurs: hire workers, produce goods, seek profit
- Investors: buy low, sell high, diversify
- Bankers: lend at profit, manage risk
- Government: balance budget, support economy
- Researchers: focus innovation on promising sectors

Respond with ONLY the JSON object, nothing else."""


async def get_agent_decision(
    agent: Any,
    market_snapshot: Dict[str, Any],
    task_type: str = "quick",
) -> Optional[Dict[str, Any]]:
    """Получить решение от LLM для одного агента."""
    
    if not OPENROUTER_API_KEY:
        return None  # Fallback to heuristic
    
    # Формируем контекст агента
    agent_context = f"""Your status:
- Role: {agent.role}
- Capital: {agent.capital:.0f}₽
- Income this period: {agent.income:.0f}₽
- Expenses this period: {agent.expenses:.0f}₽
- Debt: {agent.debt:.0f}₽
- Sector: {agent.sector or 'general'}
- Risk tolerance: {agent.risk_tolerance:.2f} (0=cautious, 1=risky)
- Greediness: {agent.greediness:.2f} (0=generous, 1=greedy)
- Intelligence: {agent.intelligence:.2f}
- Innovation: {agent.innovation:.2f}

Market snapshot:
{json.dumps(market_snapshot, indent=2, ensure_ascii=False)}

Make your decision now. Respond with ONLY valid JSON."""

    model = MODELS.get(task_type, MODELS["quick"])
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
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
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": agent_context},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 200,
                },
            )
            
            if resp.status_code != 200:
                # Try fallback model
                fb_model = FALLBACK_MODELS.get(task_type)
                if fb_model and fb_model != model:
                    resp = await client.post(
                        OPENROUTER_URL,
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": fb_model,
                            "messages": [
                                {"role": "system", "content": SYSTEM_PROMPT},
                                {"role": "user", "content": agent_context},
                            ],
                            "temperature": 0.7,
                            "max_tokens": 200,
                        },
                    )
                
                if resp.status_code != 200:
                    return None
            
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            
            if not content or not isinstance(content, str):
                return None
            
            content = content.strip()
            
            # Parse JSON from response
            # Handle cases where LLM adds ```json wrapper
            if content.startswith("```"):
                content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            
            decision = json.loads(content)
            return decision
            
    except (json.JSONDecodeError, KeyError, httpx.TimeoutException) as e:
        logger.debug(f"AI decision parse error for {agent.name}: {e}")
        return None
    except Exception as e:
        logger.warning(f"AI service error: {e}")
        return None


async def get_batch_decisions(
    agents: List[Any],
    market_snapshot: Dict[str, Any],
    task_type: str = "quick",
) -> Dict[int, Optional[Dict]]:
    """Получить решения для батча агентов. Возвращает {agent_id: decision}."""
    
    results = {}
    
    if not OPENROUTER_API_KEY:
        return results
    
    # Для экономии — отправляем только по 1 запросу за раз
    # Но каждый запрос содержит контекст одного агента
    for agent in agents[:5]:  # Max 5 AI calls per batch
        decision = await get_agent_decision(agent, market_snapshot, task_type)
        results[agent.id] = decision
    
    return results
