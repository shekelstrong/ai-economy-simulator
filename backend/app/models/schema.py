"""Модели данных — SQLAlchemy."""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AgentRole(str, enum.Enum):
    WORKER = "worker"
    ENTREPRENEUR = "entrepreneur"
    INVESTOR = "investor"
    BANKER = "banker"
    GOVERNMENT = "government"
    RESEARCHER = "researcher"


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    BANKRUPT = "bankrupt"
    INACTIVE = "inactive"


class TransactionType(str, enum.Enum):
    TRADE = "trade"
    SALARY = "salary"
    INVESTMENT = "investment"
    LOAN = "loan"
    TAX = "tax"
    SUBSIDY = "subsidy"
    PRODUCTION = "production"
    CONSUMPTION = "consumption"


# ============================================================================
# AGENT — ИИ-агент (экономический actor)
# ============================================================================

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="worker")
    status = Column(String(20), nullable=False, default="active")
    
    # Финансы
    capital = Column(Float, nullable=False, default=100000.0)
    income = Column(Float, nullable=False, default=0.0)
    expenses = Column(Float, nullable=False, default=0.0)
    debt = Column(Float, nullable=False, default=0.0)
    savings = Column(Float, nullable=False, default=0.0)
    
    # Характер (5 черт: 0.0 - 1.0)
    risk_tolerance = Column(Float, nullable=False, default=0.5)    # Риск
    greediness = Column(Float, nullable=False, default=0.5)        # Жадность
    innovation = Column(Float, nullable=False, default=0.5)         # Инновационность
    social = Column(Float, nullable=False, default=0.5)            # Социальность
    intelligence = Column(Float, nullable=False, default=0.5)      # Интеллект
    
    # Сектор деятельности
    sector = Column(String(50), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Память (JSON: последние решения и их исходы)
    memory = Column(JSON, nullable=False, default=list)
    
    # Стратегия (текущая AI-стратегия агента)
    current_strategy = Column(Text, nullable=True)
    strategy_updated_at = Column(DateTime, nullable=True)
    
    # Метаданные
    generation = Column(Integer, nullable=False, default=1)  # Поколение обучения
    decisions_count = Column(Integer, nullable=False, default=0)
    successful_decisions = Column(Integer, nullable=False, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    transactions_sent = relationship("Transaction", foreign_keys="Transaction.from_agent_id", back_populates="from_agent")
    transactions_received = relationship("Transaction", foreign_keys="Transaction.to_agent_id", back_populates="to_agent")
    company = relationship("Company", back_populates="employees", foreign_keys=[company_id])


# ============================================================================
# COMPANY — Компания (создаётся агентами-предпринимателями)
# ============================================================================

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    sector = Column(String(50), nullable=False)
    owner_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    
    capital = Column(Float, nullable=False, default=0.0)
    revenue = Column(Float, nullable=False, default=0.0)
    profit = Column(Float, nullable=False, default=0.0)
    employees_count = Column(Integer, nullable=False, default=1)
    
    production_capacity = Column(Float, nullable=False, default=100.0)
    market_share = Column(Float, nullable=False, default=0.0)
    
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    employees = relationship("Agent", back_populates="company", foreign_keys="Agent.company_id")


# ============================================================================
# TRANSACTION — Финансовая транзакция
# ============================================================================

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)
    from_agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    to_agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    
    tick = Column(Integer, nullable=False, index=True)  # Номер тика симуляции
    created_at = Column(DateTime, server_default=func.now())
    
    from_agent = relationship("Agent", foreign_keys=[from_agent_id], back_populates="transactions_sent")
    to_agent = relationship("Agent", foreign_keys=[to_agent_id], back_populates="transactions_received")


# ============================================================================
# MARKET — Рыночные цены по секторам
# ============================================================================

class Market(Base):
    __tablename__ = "markets"
    
    id = Column(Integer, primary_key=True, index=True)
    sector = Column(String(50), nullable=False)
    price_index = Column(Float, nullable=False, default=100.0)  # Индекс цен
    supply = Column(Float, nullable=False, default=0.0)
    demand = Column(Float, nullable=False, default=0.0)
    volume = Column(Float, nullable=False, default=0.0)  # Объём торгов за тик
    
    tick = Column(Integer, nullable=False)
    updated_at = Column(DateTime, server_default=func.now())


# ============================================================================
# EVENT — Событие в симуляции (для дашборда)
# ============================================================================

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # bankruptcy, deal, innovation, crisis
    severity = Column(String(20), nullable=False, default="info")  # info, warning, critical
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    data = Column(JSON, nullable=True)  # Дополнительные данные
    
    tick = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


# ============================================================================
# GOVERNMENT_POLICY — Государственная политика
# ============================================================================

class GovernmentPolicy(Base):
    __tablename__ = "government_policies"
    
    id = Column(Integer, primary_key=True, index=True)
    policy_type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=True)
    
    proposed_by = Column(Integer, ForeignKey("agents.id"), nullable=True)
    votes_for = Column(Integer, nullable=False, default=0)
    votes_against = Column(Integer, nullable=False, default=0)
    
    is_active = Column(Boolean, nullable=False, default=False)
    tick_proposed = Column(Integer, nullable=False)
    tick_activated = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ============================================================================
# MACRO_INDICATORS — Макроэкономические показатели за тик
# ============================================================================

class MacroIndicator(Base):
    __tablename__ = "macro_indicators"
    
    id = Column(Integer, primary_key=True, index=True)
    tick = Column(Integer, nullable=False, unique=True)
    
    gdp = Column(Float, nullable=False, default=0.0)
    total_capital = Column(Float, nullable=False, default=0.0)
    avg_income = Column(Float, nullable=False, default=0.0)
    gini_coefficient = Column(Float, nullable=False, default=0.0)
    unemployment_rate = Column(Float, nullable=False, default=0.0)
    inflation_rate = Column(Float, nullable=False, default=0.0)
    total_transactions = Column(Integer, nullable=False, default=0)
    active_companies = Column(Integer, nullable=False, default=0)
    bankruptcies = Column(Integer, nullable=False, default=0)
    
    # Распределение богатства (перцентили)
    wealth_p10 = Column(Float, nullable=True)
    wealth_p25 = Column(Float, nullable=True)
    wealth_p50 = Column(Float, nullable=True)
    wealth_p75 = Column(Float, nullable=True)
    wealth_p90 = Column(Float, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
