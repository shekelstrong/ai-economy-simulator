"""API endpoints — REST + WebSocket."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy import select, func, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from pydantic import BaseModel

from app.core.database import get_session
from app.models.schema import Agent, Transaction, Market, Event, MacroIndicator, Company


router = APIRouter()


# ============================================================================
# Pydantic схемы
# ============================================================================

class AgentBrief(BaseModel):
    id: int
    name: str
    role: str
    capital: float
    sector: Optional[str]
    class Config:
        from_attributes = True


class AgentDetail(BaseModel):
    id: int
    name: str
    role: str
    status: str
    capital: float
    income: float
    expenses: float
    debt: float
    savings: float
    risk_tolerance: float
    greediness: float
    innovation: float
    social: float
    intelligence: float
    sector: Optional[str]
    decisions_count: int
    successful_decisions: int
    class Config:
        from_attributes = True


class MacroSnapshot(BaseModel):
    tick: int
    gdp: float
    total_capital: float
    avg_income: float
    gini_coefficient: float
    unemployment_rate: float
    inflation_rate: float
    total_transactions: int
    active_companies: int
    bankruptcies: int
    wealth_p10: Optional[float]
    wealth_p25: Optional[float]
    wealth_p50: Optional[float]
    wealth_p75: Optional[float]
    wealth_p90: Optional[float]
    class Config:
        from_attributes = True


class EventBrief(BaseModel):
    id: int
    event_type: str
    severity: str
    title: str
    description: Optional[str]
    tick: int
    class Config:
        from_attributes = True


class MarketBrief(BaseModel):
    sector: str
    price_index: float
    supply: float
    demand: float
    tick: int
    class Config:
        from_attributes = True


class SimulationStatus(BaseModel):
    tick: int
    is_running: bool
    total_agents: int
    active_agents: int
    bankrupt_agents: int
    total_companies: int


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/status", response_model=SimulationStatus)
async def get_status(request, session: AsyncSession = Depends(get_session)):
    """Текущий статус симуляции."""
    from app.main import engine
    
    total = await session.execute(select(func.count(Agent.id)))
    active = await session.execute(select(func.count(Agent.id)).where(Agent.status == "active"))
    bankrupt = await session.execute(select(func.count(Agent.id)).where(Agent.status == "bankrupt"))
    companies = await session.execute(select(func.count(Company.id)).where(Company.is_active == True))
    
    return SimulationStatus(
        tick=engine.current_tick,
        is_running=engine.is_running,
        total_agents=total.scalar() or 0,
        active_agents=active.scalar() or 0,
        bankrupt_agents=bankrupt.scalar() or 0,
        total_companies=companies.scalar() or 0,
    )


@router.get("/macro", response_model=List[MacroSnapshot])
async def get_macro_history(
    limit: int = Query(100, le=1000),
    session: AsyncSession = Depends(get_session),
):
    """История макро-показателей."""
    result = await session.execute(
        select(MacroIndicator).order_by(desc(MacroIndicator.tick)).limit(limit)
    )
    return list(reversed(result.scalars().all()))


@router.get("/agents", response_model=List[AgentBrief])
async def get_agents(
    role: Optional[str] = None,
    sector: Optional[str] = None,
    sort: str = Query("capital", regex="^(capital|income|name)$"),
    order: str = Query("desc", regex="^(asc|desc)$"),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    """Список агентов с фильтрацией."""
    q = select(Agent).where(Agent.status == "active")
    
    if role:
        q = q.where(Agent.role == role)
    if sector:
        q = q.where(Agent.sector == sector)
    
    sort_col = getattr(Agent, sort)
    if order == "desc":
        q = q.order_by(desc(sort_col))
    else:
        q = q.order_by(sort_col)
    
    q = q.limit(limit).offset(offset)
    result = await session.execute(q)
    return result.scalars().all()


@router.get("/agents/{agent_id}", response_model=AgentDetail)
async def get_agent(agent_id: int, session: AsyncSession = Depends(get_session)):
    """Детальная информация об агенте."""
    result = await session.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        from fastapi import HTTPException
        raise HTTPException(404, "Agent not found")
    return agent


@router.get("/events", response_model=List[EventBrief])
async def get_events(
    limit: int = Query(50, le=200),
    event_type: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Последние события."""
    q = select(Event).order_by(desc(Event.tick))
    if event_type:
        q = q.where(Event.event_type == event_type)
    q = q.limit(limit)
    result = await session.execute(q)
    return result.scalars().all()


@router.get("/markets", response_model=List[MarketBrief])
async def get_markets(session: AsyncSession = Depends(get_session)):
    """Текущие рыночные цены."""
    # Берём последние записи для каждого сектора
    result = await session.execute(
        select(Market).order_by(desc(Market.tick))
    )
    markets = result.scalars().all()
    
    # Группируем по сектору — берём последний
    latest = {}
    for m in markets:
        if m.sector not in latest:
            latest[m.sector] = m
    
    return list(latest.values())


@router.get("/wealth-distribution")
async def get_wealth_distribution(session: AsyncSession = Depends(get_session)):
    """Распределение богатства."""
    result = await session.execute(
        select(Agent.capital).where(Agent.status == "active").order_by(Agent.capital)
    )
    capitals = [r[0] for r in result.all()]
    
    if not capitals:
        return {"buckets": [], "total": 0}
    
    n = len(capitals)
    total = sum(capitals)
    
    # 10 бакетов
    bucket_size = n // 10
    buckets = []
    for i in range(10):
        start = i * bucket_size
        end = (i + 1) * bucket_size if i < 9 else n
        bucket_capitals = capitals[start:end]
        buckets.append({
            "range": f"{i*10}-{(i+1)*10}%",
            "count": len(bucket_capitals),
            "total_capital": sum(bucket_capitals),
            "avg_capital": sum(bucket_capitals) / len(bucket_capitals) if bucket_capitals else 0,
            "share_of_total": sum(bucket_capitals) / total * 100 if total > 0 else 0,
        })
    
    return {"buckets": buckets, "total_agents": n, "total_capital": total}


# ============================================================================
# WebSocket для real-time обновлений
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

ws_manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
