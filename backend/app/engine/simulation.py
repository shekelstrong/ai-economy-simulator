"""Движок симуляции — ядро логики."""

import asyncio
import random
import math
from datetime import datetime
from typing import List, Dict, Any, Optional
from loguru import logger

from sqlalchemy import select, update, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.schema import Agent, Company, Transaction, Market, Event, MacroIndicator


class SimulationEngine:
    """Основной движок симуляции экономики."""
    
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.current_tick = 0
        self.is_running = False
        self._ai_budget_remaining = 0
        self._txn_count_this_tick = 0
    
    async def initialize(self) -> int:
        """Инициализация: создать агентов и начальные рынки. Возвращает начальный тик."""
        async with self.session_factory() as session:
            # Проверяем последний тик
            result = await session.execute(
                select(func.max(MacroIndicator.tick))
            )
            last_tick = result.scalar()
            if last_tick is not None:
                self.current_tick = last_tick
                logger.info(f"Resuming from tick {self.current_tick}")
                return self.current_tick
            
            # Первый запуск — создаём агентов
            agents_count = await session.execute(select(func.count(Agent.id)))
            count = agents_count.scalar()
            
            if count == 0:
                await self._create_initial_agents(session)
                await self._create_initial_markets(session)
                await self._record_macro(session)
                logger.info(f"Initialized simulation with {settings.INITIAL_AGENTS} agents")
            
            return 0
    
    async def _create_initial_agents(self, session: AsyncSession):
        """Создать начальных агентов с случайными характеристиками."""
        agents = []
        roles = settings.ROLES
        
        for i in range(settings.INITIAL_AGENTS):
            # Распределение ролей: 70% workers, 15% entrepreneurs, 10% investors, 5% другие
            r = random.random()
            if r < 0.70:
                role = "worker"
            elif r < 0.85:
                role = "entrepreneur"
            elif r < 0.95:
                role = "investor"
            else:
                role = random.choice(["banker", "government", "researcher"])
            
            agent = Agent(
                name=f"Agent_{i+1:04d}",
                role=role,
                capital=settings.INITIAL_CAPITAL,
                risk_tolerance=random.uniform(0.1, 0.9),
                greediness=random.uniform(0.1, 0.9),
                innovation=random.uniform(0.1, 0.9),
                social=random.uniform(0.1, 0.9),
                intelligence=random.uniform(0.1, 0.9),
                sector=random.choice(settings.SECTORS) if role != "worker" else None,
                memory=[],
            )
            agents.append(agent)
        
        session.add_all(agents)
        await session.commit()
        logger.info(f"Created {len(agents)} agents")
    
    async def _create_initial_markets(self, session: AsyncSession):
        """Создать начальные рыночные записи."""
        for sector in settings.SECTORS:
            market = Market(
                sector=sector,
                price_index=100.0,
                supply=random.uniform(80, 120),
                demand=random.uniform(80, 120),
                volume=0.0,
                tick=0,
            )
            session.add(market)
        await session.commit()
    
    async def tick(self) -> Dict[str, Any]:
        """Один тик симуляции. Возвращает сводку."""
        self.current_tick += 1
        self._ai_budget_remaining = settings.AI_REQUESTS_PER_TICK
        
        async with self.session_factory() as session:
            tick_summary = {
                "tick": self.current_tick,
                "transactions": 0,
                "events": [],
                "bankruptcies": 0,
            }
            
            # 1. Обновить рынки (supply/demand → цены)
            await self._update_markets(session)
            
            # 2. Агенты принимают решения
            decisions = await self._process_agent_decisions(session)
            tick_summary["transactions"] = len(decisions)
            
            # 3. Исполнить транзакции
            await self._execute_transactions(session, decisions)
            self._txn_count_this_tick = len(decisions)
            
            # 4. Зарплаты и налоги
            await self._process_salaries_taxes(session)
            
            # 5. Проверить банкротства
            bankruptcies = await self._check_bankruptcies(session)
            tick_summary["bankruptcies"] = bankruptcies
            
            # 6. Инновации (случайные)
            events = await self._check_innovations(session)
            tick_summary["events"] = events
            
            # 7. Записать макро-показатели
            await self._record_macro(session)
            
            await session.commit()
        
        # 8. Telegram уведомления (вне сессии, fire-and-forget)
        try:
            import asyncio
            from app.engine.telegram_notifier import send_tick_report, send_crisis_alert, send_bankruptcy_milestone
            
            # Простой подсчёт — не блокируем
            async def _notify():
                try:
                    async with self.session_factory() as ns:
                        active = await ns.scalar(select(func.count(Agent.id)).where(Agent.status == "active"))
                        bankrupt = await ns.scalar(select(func.count(Agent.id)).where(Agent.status == "bankrupt"))
                        macro_result = await ns.execute(
                            select(MacroIndicator).where(MacroIndicator.tick == self.current_tick)
                        )
                        macro_data = macro_result.scalar_one_or_none()
                    
                    if macro_data:
                        await send_tick_report(self.current_tick, {
                            "active_agents": active,
                            "bankrupt_agents": bankrupt,
                            "transactions": tick_summary["transactions"],
                            "events": tick_summary["events"],
                        }, {
                            "gdp": macro_data.gdp,
                            "gini_coefficient": macro_data.gini_coefficient,
                        })
                    
                    if bankrupt and bankrupt > 0:
                        await send_bankruptcy_milestone(bankrupt, self.current_tick)
                    
                    for ev in tick_summary.get("events", []):
                        if ev == "crisis":
                            await send_crisis_alert({"severity": "critical", "title": "Экономический кризис!", "description": f"Тик {self.current_tick}"})
                except Exception:
                    pass
            
            asyncio.create_task(_notify())
        except Exception:
            pass


            
            msg = f"Tick {self.current_tick}: {tick_summary['transactions']} txns, {tick_summary['bankruptcies']} bankruptcies"
            logger.info(msg)
            print(msg, flush=True)
            return tick_summary
    
    async def _update_markets(self, session: AsyncSession):
        """Обновить рыночные цены на основе supply/demand."""
        # Загружаем только рынки предыдущего тика
        result = await session.execute(
            select(Market).where(Market.tick == self.current_tick - 1)
        )
        markets = result.scalars().all()
        
        for market in markets:
            # Простой закон спроса и предложения
            if market.supply > 0 and market.demand > 0:
                ratio = market.demand / market.supply
                price_change = (ratio - 1.0) * 0.05  # ±5% за тик
                market.price_index *= (1 + price_change)
            
            # Случайный шум
            market.price_index *= (1 + random.gauss(0, 0.005))
            market.price_index = max(10.0, market.price_index)  # Floor
            
            # Обновляем tick
            market_new = Market(
                sector=market.sector,
                price_index=market.price_index,
                supply=market.supply * random.uniform(0.95, 1.05),
                demand=market.demand * random.uniform(0.95, 1.05),
                volume=0.0,  # Сброс объёма
                tick=self.current_tick,
            )
            session.add(market_new)
    
    async def _process_agent_decisions(self, session: AsyncSession) -> List[Dict]:
        """Гибрид: ключевые роли через LLM, рабочие на эвристике."""
        result = await session.execute(
            select(Agent).where(Agent.status == "active")
        )
        agents = result.scalars().all()
        
        if not agents:
            return []
        
        # Разделяем: ключевые роли → LLM, рабочие → эвристика
        strategic_agents = [a for a in agents if a.role in ("entrepreneur", "investor", "banker", "government", "researcher")]
        workers = [a for a in agents if a.role == "worker"]
        entrepreneurs = [a for a in agents if a.role == "entrepreneur"]
        ent_ids = {e.id: e for e in entrepreneurs}
        
        transactions = []
        
        # ============================================
        # 1. СТРАТЕГИЧЕСКИЕ АГЕНТЫ → LLM BATCH
        # ============================================
        if strategic_agents:
            market_snapshot = {
                "tick": self.current_tick,
                "active_agents": len(agents),
                "workers": len(workers),
                "entrepreneurs": len(entrepreneurs),
                "gini": 0,
                "gdp": 0,
                "avg_income": 0,
            }
            
            try:
                macro_result = await session.execute(
                    select(MacroIndicator).order_by(MacroIndicator.tick.desc()).limit(1)
                )
                macro = macro_result.scalar_one_or_none()
                if macro:
                    market_snapshot["gini"] = macro.gini_coefficient
                    market_snapshot["gdp"] = macro.gdp
                    market_snapshot["avg_income"] = macro.avg_income
            except Exception:
                pass
            
            try:
                from app.engine.ai_service import get_all_agent_decisions
                
                ai_decisions = await asyncio.wait_for(
                    get_all_agent_decisions(strategic_agents, market_snapshot),
                    timeout=50.0
                )
                
                for agent in strategic_agents:
                    decision = ai_decisions.get(agent.id)
                    if not decision or decision.get("action") == "save":
                        continue
                    txn = self._llm_decision_to_txn(agent, decision, ent_ids)
                    if txn:
                        transactions.append(txn)
                
                decided = len([d for d in ai_decisions.values() if d.get("action") != "save"])
                logger.info(f"LLM: {decided}/{len(strategic_agents)} strategic agents decided, {len(transactions)} txns")
                
            except asyncio.TimeoutError:
                logger.warning("LLM timeout for strategic agents")
            except Exception as e:
                logger.warning(f"LLM error: {e}")
        
        # ============================================
        # 2. РАБОЧИЕ → умная эвристика (замкнутый цикл)
        # ============================================
        random.shuffle(workers)
        for i, worker in enumerate(workers):
            employer = entrepreneurs[i % len(entrepreneurs)] if entrepreneurs else None
            salary = random.uniform(1000, 5000) * (1 + worker.intelligence)
            
            if employer and employer.capital > salary:
                transactions.append({
                    "type": "salary", "from": employer.id, "to": worker.id,
                    "amount": salary, "description": "Зарплата",
                })
            elif employer:
                salary = max(employer.capital * 0.3, 0)
                if salary > 100:
                    transactions.append({
                        "type": "salary", "from": employer.id, "to": worker.id,
                        "amount": salary, "description": "Зарплата (сокращённая)",
                    })
            
            spend = random.uniform(2000, 6000) * (1 + worker.greediness)
            if worker.capital > spend and entrepreneurs:
                seller = random.choice(entrepreneurs)
                transactions.append({
                    "type": "consumption", "from": worker.id, "to": seller.id,
                    "amount": spend, "description": "Покупка товаров",
                })
        
        # Предприниматели получают выручку пропорционально продажам
        # (компенсация за ЗП + прибыль от бизнеса)
        for ent in entrepreneurs:
            if ent.status == "active":
                revenue = len(workers) * random.uniform(10, 30)  # ~5000-15000 за тик
                transactions.append({
                    "type": "trade", "from": None, "to": ent.id,
                    "amount": revenue,
                    "description": "Выручка от продаж",
                })
        
        return transactions
    
    def _llm_decision_to_txn(self, agent: Agent, decision: Dict, ent_ids: Dict) -> Optional[Dict]:
        """Конвертировать LLM decision в замкнутую транзакцию."""
        action = decision.get("action")
        amount = decision.get("amount", 0)
        sector = decision.get("sector", agent.sector or "trade")
        target_role = decision.get("target_role", "")
        
        if not action or not isinstance(amount, (int, float)) or amount <= 0:
            return None
        
        # Clamp amount to agent's capital for spending actions
        if action in ("spend", "invest", "lend", "hire", "produce", "innovate"):
            amount = min(amount, agent.capital * 0.8)
            if amount < 100:
                return None
        
        # ЗАМКНУТАЯ ЭКОНОМИКА: деньги идут от агента к агенту
        if action == "spend" and agent.role == "worker":
            # Рабочий тратит → деньги предпринимателю
            if ent_ids:
                seller = random.choice(list(ent_ids.values()))
                return {"type": "consumption", "from": agent.id, "to": seller.id,
                        "amount": amount, "description": "Покупка товаров"}
            return None
        
        elif action == "hire" and agent.role == "entrepreneur":
            # Предприниматель платит ЗП → рабочим
            return {"type": "salary", "from": agent.id, "to": None,
                    "amount": amount, "description": "Зарплата сотрудникам"}
        
        elif action == "produce" and agent.role == "entrepreneur":
            # Производство — деньги в компанию
            return {"type": "production", "from": agent.id, "to": None,
                    "amount": amount, "description": f"Производство ({sector})"}
        
        elif action == "invest" and agent.role == "investor":
            return {"type": "investment", "from": agent.id, "to": None,
                    "amount": amount, "description": f"Инвестиция в {sector}"}
        
        elif action == "dividend" and agent.role == "investor":
            # ROI — ограничиваем чтобы не генерировать деньги из ниоткуда
            roi_cap = agent.capital * 0.03  # макс 3% за тик
            amount = min(amount, roi_cap)
            if amount < 100:
                return None
            return {"type": "dividend", "from": None, "to": agent.id,
                    "amount": amount, "description": "Дивиденды"}
        
        elif action == "lend" and agent.role == "banker":
            # Кредит — ищем реального заёмщика
            return {"type": "loan", "from": agent.id, "to": None,
                    "amount": amount, "description": "Выдача кредита"}
        
        elif action == "subsidy" and agent.role == "government":
            # Субсидия от правительства → предпринимателю
            if ent_ids:
                target = random.choice(list(ent_ids.values()))
                return {"type": "subsidy", "from": agent.id, "to": target.id,
                        "amount": amount, "description": f"Субсидия {sector}"}
            return None
        
        elif action == "tax_cut" and agent.role == "government":
            return None  # Обрабатывается отдельно через tax_rate
        
        elif action == "innovate" and agent.role == "researcher":
            return {"type": "innovation", "from": agent.id, "to": None,
                    "amount": amount, "description": f"Исследование ({sector})"}
        
        return None
    
    def _heuristic_fallback(self, agents: List[Agent], entrepreneurs: List[Agent]) -> List[Dict]:
        """Fallback эвристика если LLM не ответил."""
        transactions = []
        workers = [a for a in agents if a.role == "worker"]
        
        random.shuffle(workers)
        for i, worker in enumerate(workers):
            employer = entrepreneurs[i % len(entrepreneurs)] if entrepreneurs else None
            salary = random.uniform(1000, 5000) * (1 + worker.intelligence)
            if employer and employer.capital > salary:
                transactions.append({"type": "salary", "from": employer.id, "to": worker.id,
                                     "amount": salary, "description": "Зарплата"})
            
            spend = random.uniform(500, 3000) * (1 + worker.greediness)
            if worker.capital > spend and entrepreneurs:
                seller = random.choice(entrepreneurs)
                transactions.append({"type": "consumption", "from": worker.id, "to": seller.id,
                                     "amount": spend, "description": "Покупка товаров"})
        
        for ent in entrepreneurs:
            if ent.capital > 5000:
                transactions.append({"type": "production", "from": ent.id, "to": None,
                                     "amount": ent.capital * 0.03, "description": "Производство"})
            transactions.append({"type": "trade", "from": None, "to": ent.id,
                                 "amount": random.uniform(500, 3000), "description": "Выручка"})
        
        return transactions
    
    async def _execute_transactions(self, session: AsyncSession, transactions: List[Dict]):
        """Исполнить транзакции батчем — один запрос к БД вместо N+1."""
        if not transactions:
            return
        
        # 1. Собрать все ID агентов
        agent_ids = set()
        for txn in transactions:
            if txn.get("from") is not None:
                agent_ids.add(txn["from"])
            if txn.get("to") is not None:
                agent_ids.add(txn["to"])
        
        if not agent_ids:
            # Только системные транзакции без агентов — просто записать
            for txn in transactions:
                session.add(Transaction(
                    type=txn["type"],
                    from_agent_id=None,
                    to_agent_id=None,
                    amount=txn["amount"],
                    description=txn.get("description", ""),
                    tick=self.current_tick,
                ))
            return
        
        # 2. Загрузить всех нужных агентов ОДНИМ запросом
        result = await session.execute(
            select(Agent).where(Agent.id.in_(agent_ids))
        )
        agents_map: Dict[int, Agent] = {a.id: a for a in result.scalars().all()}
        
        # 3. Обновить балансы в памяти
        records = []
        for txn in transactions:
            amount = txn["amount"]
            from_id = txn.get("from")
            to_id = txn.get("to")
            
            # Проверяем отправителя
            if from_id is not None:
                from_agent = agents_map.get(from_id)
                if not from_agent or from_agent.capital < amount:
                    continue  # Не хватает денег
                from_agent.capital -= amount
                from_agent.expenses += amount
            
            # Начисляем получателю
            if to_id is not None:
                to_agent = agents_map.get(to_id)
                if to_agent:
                    to_agent.capital += amount
                    to_agent.income += amount
            
            # Записываем транзакцию
            records.append(Transaction(
                type=txn["type"],
                from_agent_id=from_id,
                to_agent_id=to_id,
                amount=amount,
                description=txn.get("description", ""),
                tick=self.current_tick,
            ))
        
        # 4. Добавить все записи батчем
        session.add_all(records)
    
    async def _process_salaries_taxes(self, session: AsyncSession):
        """Обработать налоги и инфляцию — батч-обновление."""
        # Налог на доход — одним UPDATE запросом
        await session.execute(
            update(Agent)
            .where(Agent.status == "active", Agent.income > 0)
            .values(capital=Agent.capital - (Agent.income * settings.TAX_RATE))
        )
        
        # Инфляция — одним UPDATE запросом
        inflation_factor = 1 - settings.INFLATION_RATE
        await session.execute(
            update(Agent)
            .where(Agent.status == "active")
            .values(
                capital=Agent.capital * inflation_factor,
                decisions_count=Agent.decisions_count + 1,
            )
        )
    
    async def _check_bankruptcies(self, session: AsyncSession) -> int:
        """Проверить и обработать банкротства."""
        result = await session.execute(
            select(Agent).where(
                and_(
                    Agent.status == "active",
                    Agent.capital < -10000  # Порог банкротства
                )
            )
        )
        bankrupts = result.scalars().all()
        
        for agent in bankrupts:
            agent.status = "bankrupt"
            
            # Записываем событие
            event = Event(
                event_type="bankruptcy",
                severity="warning",
                title=f"{agent.name} обанкротился",
                description=f"Капитал: {agent.capital:.0f}₽",
                tick=self.current_tick,
            )
            session.add(event)
        
        return len(bankrupts)
    
    async def _check_innovations(self, session: AsyncSession) -> List[str]:
        """Случайные инновации и события."""
        events = []
        
        # 5% шанс инновации за тик
        if random.random() < 0.05:
            sector = random.choice(settings.SECTORS)
            event = Event(
                event_type="innovation",
                severity="info",
                title=f"Инновация в секторе {sector}",
                description=f"Новая технология повышает производительность",
                data={"sector": sector, "productivity_boost": random.uniform(1.01, 1.10)},
                tick=self.current_tick,
            )
            session.add(event)
            events.append(f"innovation_{sector}")
        
        # 2% шанс кризиса
        if random.random() < 0.02:
            event = Event(
                event_type="crisis",
                severity="critical",
                title="Экономический кризис!",
                description="Резкое падение цен и доверия",
                tick=self.current_tick,
            )
            session.add(event)
            events.append("crisis")
        
        return events
    
    async def _record_macro(self, session: AsyncSession):
        """Записать макроэкономические показатели — оптимизировано."""
        # Один запрос — только capital, не грузим всех агентов целиком
        result = await session.execute(
            select(Agent.capital).where(Agent.status == "active").order_by(Agent.capital)
        )
        capitals = [r[0] for r in result.all()]
        
        if not capitals:
            return
        
        n = len(capitals)
        total_capital = sum(capitals)
        
        def percentile(arr, p):
            idx = int(len(arr) * p / 100)
            return arr[min(idx, len(arr) - 1)]
        
        # Gini — O(n log n) формула (сортированный массив)
        gini = 0.0
        if total_capital > 0 and n > 0:
            # Формула: G = (2 * Σ(i * xi)) / (n * Σ(xi)) - (n+1)/n
            cumsum = 0.0
            for i, c in enumerate(capitals, 1):
                cumsum += i * c
            gini = (2.0 * cumsum) / (n * total_capital) - (n + 1.0) / n
            gini = max(0.0, min(1.0, gini))  # Clamp
        
        # Параллельные COUNT запросы
        bankrupt_count, company_count = await asyncio.gather(
            session.execute(select(func.count(Agent.id)).where(Agent.status == "bankrupt")),
            session.execute(select(func.count(Company.id)).where(Company.is_active == True)),
        )
        
        indicator = MacroIndicator(
            tick=self.current_tick,
            gdp=total_capital,
            total_capital=total_capital,
            avg_income=total_capital / n,
            gini_coefficient=gini,
            unemployment_rate=0.0,
            inflation_rate=settings.INFLATION_RATE * 100,
            total_transactions=self._txn_count_this_tick,  # Из кэша
            active_companies=company_count.scalar() or 0,
            bankruptcies=bankrupt_count.scalar() or 0,
            wealth_p10=percentile(capitals, 10),
            wealth_p25=percentile(capitals, 25),
            wealth_p50=percentile(capitals, 50),
            wealth_p75=percentile(capitals, 75),
            wealth_p90=percentile(capitals, 90),
        )
        session.add(indicator)
