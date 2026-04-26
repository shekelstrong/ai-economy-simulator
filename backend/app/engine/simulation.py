"""Движок симуляции — ядро логики."""

import asyncio
import random
import json
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
        self._ai_budget_remaining = 0  # AI-запросы оставшиеся в тике
    
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
            
            logger.info(f"Tick {self.current_tick}: {tick_summary['transactions']} txns, {tick_summary['bankruptcies']} bankruptcies")
            return tick_summary
    
    async def _update_markets(self, session: AsyncSession):
        """Обновить рыночные цены на основе supply/demand."""
        result = await session.execute(select(Market))
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
        """Агенты принимают решения. Возвращает список транзакций."""
        result = await session.execute(
            select(Agent).where(Agent.status == "active")
        )
        agents = result.scalars().all()
        
        transactions = []
        
        # Группируем агентов по ролям для батчевой AI-обработки
        batches = []
        current_batch = []
        
        for agent in agents:
            current_batch.append(agent)
            if len(current_batch) >= settings.AI_BATCH_SIZE:
                batches.append(current_batch)
                current_batch = []
        if current_batch:
            batches.append(current_batch)
        
        # Обрабатываем батчи
        for batch in batches:
            if self._ai_budget_remaining <= 0:
                # Лимит AI исчерпан — используем эвристику
                for agent in batch:
                    txn = self._heuristic_decision(agent)
                    if txn:
                        transactions.append(txn)
            else:
                # AI обработка (пока заглушка — будет реализовано в ai_service)
                for agent in batch:
                    txn = self._heuristic_decision(agent)
                    if txn:
                        transactions.append(txn)
                self._ai_budget_remaining -= 1
        
        return transactions
    
    def _heuristic_decision(self, agent: Agent) -> Optional[Dict]:
        """Эвристическое решение агента (без AI)."""
        r = random.random()
        
        if agent.role == "worker":
            # Работник: заработать → потратить
            if r < 0.3:
                return {
                    "type": "salary",
                    "from": None,  # От "государства"/компании
                    "to": agent.id,
                    "amount": random.uniform(1000, 5000) * (1 + agent.intelligence),
                    "description": "Зарплата",
                }
            elif r < 0.8:
                return {
                    "type": "consumption",
                    "from": agent.id,
                    "to": None,
                    "amount": random.uniform(500, 3000) * (1 + agent.greediness),
                    "description": "Покупка товаров",
                }
        
        elif agent.role == "entrepreneur":
            # Предприниматель: инвестировать → получить прибыль
            if r < 0.4 and agent.capital > 10000:
                return {
                    "type": "investment",
                    "from": agent.id,
                    "to": None,
                    "amount": agent.capital * agent.risk_tolerance * 0.1,
                    "description": "Инвестиция в бизнес",
                }
            elif r < 0.7:
                return {
                    "type": "trade",
                    "from": None,
                    "to": agent.id,
                    "amount": random.uniform(2000, 10000) * agent.intelligence,
                    "description": "Выручка от продаж",
                }
        
        elif agent.role == "investor":
            # Инвестор: купить/продать активы
            if r < 0.5 and agent.capital > 20000:
                return {
                    "type": "investment",
                    "from": agent.id,
                    "to": None,
                    "amount": agent.capital * agent.risk_tolerance * 0.2,
                    "description": "Покупка акций/активов",
                }
        
        elif agent.role == "banker":
            # Банкир: выдать кредит
            if r < 0.3 and agent.capital > 50000:
                return {
                    "type": "loan",
                    "from": agent.id,
                    "to": None,
                    "amount": agent.capital * 0.1,
                    "description": "Выдача кредита",
                }
        
        return None
    
    async def _execute_transactions(self, session: AsyncSession, transactions: List[Dict]):
        """Исполнить транзакции и обновить балансы."""
        for txn in transactions:
            amount = txn["amount"]
            
            # Обновляем баланс отправителя
            if txn["from"] is not None:
                result = await session.execute(
                    select(Agent).where(Agent.id == txn["from"]).with_for_update()
                )
                from_agent = result.scalar_one_or_none()
                if from_agent and from_agent.capital >= amount:
                    from_agent.capital -= amount
                    from_agent.expenses += amount
                else:
                    continue  # Не хватает денег
            
            # Обновляем баланс получателя
            if txn["to"] is not None:
                result = await session.execute(
                    select(Agent).where(Agent.id == txn["to"]).with_for_update()
                )
                to_agent = result.scalar_one_or_none()
                if to_agent:
                    to_agent.capital += amount
                    to_agent.income += amount
            
            # Записываем транзакцию
            record = Transaction(
                type=txn["type"],
                from_agent_id=txn.get("from"),
                to_agent_id=txn.get("to"),
                amount=amount,
                description=txn.get("description", ""),
                tick=self.current_tick,
            )
            session.add(record)
    
    async def _process_salaries_taxes(self, session: AsyncSession):
        """Обработать зарплаты и налоги."""
        result = await session.execute(
            select(Agent).where(Agent.status == "active")
        )
        agents = result.scalars().all()
        
        for agent in agents:
            # Налог
            if agent.income > 0:
                tax = agent.income * settings.TAX_RATE
                agent.capital -= tax
            
            # Инфляция съедает часть капитала
            agent.capital *= (1 - settings.INFLATION_RATE)
            
            # Обновляем счётчик решений
            agent.decisions_count += 1
    
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
        """Записать макроэкономические показатели."""
        result = await session.execute(
            select(Agent).where(Agent.status == "active")
        )
        agents = result.scalars().all()
        
        if not agents:
            return
        
        capitals = sorted([a.capital for a in agents])
        total_capital = sum(capitals)
        n = len(capitals)
        
        def percentile(arr, p):
            idx = int(len(arr) * p / 100)
            return arr[min(idx, len(arr) - 1)]
        
        # Gini coefficient
        gini = 0
        if total_capital > 0:
            for c in capitals:
                gini += abs(c * n - total_capital)
            gini = gini / (2 * n * total_capital) if total_capital > 0 else 0
        
        # Bankruptcies this tick
        bankrupt_count = await session.execute(
            select(func.count(Agent.id)).where(Agent.status == "bankrupt")
        )
        
        # Active companies
        company_count = await session.execute(
            select(func.count(Company.id)).where(Company.is_active == True)
        )
        
        # Transactions this tick
        txn_count = await session.execute(
            select(func.count(Transaction.id)).where(Transaction.tick == self.current_tick)
        )
        
        indicator = MacroIndicator(
            tick=self.current_tick,
            gdp=total_capital,
            total_capital=total_capital,
            avg_income=total_capital / n if n > 0 else 0,
            gini_coefficient=gini,
            unemployment_rate=0.0,  # TODO: считать по ролям
            inflation_rate=settings.INFLATION_RATE * 100,
            total_transactions=txn_count.scalar() or 0,
            active_companies=company_count.scalar() or 0,
            bankruptcies=bankrupt_count.scalar() or 0,
            wealth_p10=percentile(capitals, 10),
            wealth_p25=percentile(capitals, 25),
            wealth_p50=percentile(capitals, 50),
            wealth_p75=percentile(capitals, 75),
            wealth_p90=percentile(capitals, 90),
        )
        session.add(indicator)
