"""Настройки симулятора — все параметры в одном месте."""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # === БАЗОВЫЕ ===
    PROJECT_NAME: str = "AI Economy Simulator"
    DEBUG: bool = True
    
    # === БАЗА ДАННЫХ ===
    DATABASE_URL: str = "postgresql+asyncpg://economy:economy@localhost:5432/economy"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # === СИМУЛЯЦИЯ ===
    TICK_INTERVAL_SECONDS: int = 60  # Тик каждые 60 секунд
    INITIAL_AGENTS: int = 500
    INITIAL_CAPITAL: float = 100000.0  # ₽ на старте каждому
    
    # === ЭКОНОМИКА ===
    INFLATION_RATE: float = 0.002  # 0.2% за тик
    TAX_RATE: float = 0.13  # 13% НДФЛ
    INTEREST_RATE: float = 0.05  # 5% ставка ЦБ
    UNEMPLOYMENT_BENEFIT: float = 5000.0  # ₽/тик пособие
    
    # === АГЕНТЫ ===
    AGENT_MEMORY_SIZE: int = 50  # Сколько прошлых решений помнит
    AGENT_PERSONALITY_TRAITS: int = 5  # Число черт характера (риск, жадность и т.д.)
    
    # === AI ===
    OPENROUTER_API_KEY: str = ""  # Из .env
    
    # Модели для разных задач
    AI_MODEL_SIMPLE: str = "openrouter/sherlock-dash-alpha"  # Быстрые решения
    AI_MODEL_TRADE: str = "deepseek/deepseek-v4-flash"       # Торговля
    AI_MODEL_STRATEGY: str = "x-ai/grok-4.1-fast"            # Стратегия
    AI_MODEL_RESEARCH: str = "openrouter/hunter-alpha"        # Инновации
    AI_MODEL_REASONING: str = "openrouter/sherlock-think-alpha"  # Сложные решения
    
    # Лимиты API
    AI_REQUESTS_PER_TICK: int = 50  # Максимум AI-запросов за тик
    AI_BATCH_SIZE: int = 10         # Агентов в одном промпте
    
    # === СЕКТОРЫ ЭКОНОМИКИ ===
    SECTORS: List[str] = [
        "agriculture",      # Сельское хозяйство
        "manufacturing",    # Производство
        "construction",     # Строительство
        "trade",           # Торговля
        "transport",       # Транспорт
        "finance",         # Финансы
        "education",       # Образование
        "healthcare",      # Здравоохранение
        "defense",         # Оборона
        "technology",      # Технологии
        "energy",          # Энергетика
        "real_estate",     # Недвижимость
    ]
    
    # === РОЛИ АГЕНТОВ ===
    ROLES: List[str] = [
        "worker",           # Работник
        "entrepreneur",     # Предприниматель
        "investor",         # Инвестор
        "banker",           # Банкир
        "government",       # Государственный служащий
        "researcher",       # Исследователь
    ]
    
    class Config:
        env_file = ".env"


settings = Settings()
