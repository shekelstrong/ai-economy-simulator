"""FastAPI application."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import settings
from app.core.database import engine as db_engine, async_session, Base
from app.api.routes import router, ws_manager
from app.engine.simulation import SimulationEngine


# Глобальный движок
engine = SimulationEngine(async_session)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown."""
    # Create tables
    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    
    # Initialize simulation
    await engine.initialize()
    
    # Start simulation loop in background
    task = asyncio.create_task(_simulation_loop())
    
    yield
    
    # Shutdown
    engine.is_running = False
    task.cancel()
    logger.info("Simulation stopped")


async def _simulation_loop():
    """Фоновый цикл симуляции."""
    engine.is_running = True
    
    while engine.is_running:
        try:
            summary = await engine.tick()
            
            # Отправить обновление через WebSocket
            await ws_manager.broadcast({
                "type": "tick",
                "data": summary,
            })
            
        except Exception as e:
            logger.error(f"Tick error: {e}")
        
        await asyncio.sleep(settings.TICK_INTERVAL_SECONDS)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
