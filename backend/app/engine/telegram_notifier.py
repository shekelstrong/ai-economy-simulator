"""Telegram Bot — уведомления о событиях симулятора."""

import os
import json
import asyncio
import httpx
from datetime import datetime
from loguru import logger

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"


async def send_telegram_message(text: str, parse_mode: str = "HTML"):
    """Отправить сообщение в Telegram."""
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": text,
                    "parse_mode": parse_mode,
                },
            )
            if resp.status_code != 200:
                logger.warning(f"Telegram send error: {resp.status_code} {resp.text[:100]}")
    except Exception as e:
        logger.warning(f"Telegram error: {e}")


async def send_tick_report(tick: int, summary: dict, macro: dict):
    """Отправить сводку за тик (каждые 5 тиков)."""
    if tick % 5 != 0:
        return
    
    gdp = macro.get('gdp', 0)
    gini = macro.get('gini_coefficient', 0)
    active = summary.get('active_agents', 0)
    bankrupt = summary.get('bankrupt_agents', 0)
    txns = summary.get('transactions', 0)
    events = summary.get('events', [])
    
    # Определяем фазу экономики
    if gini < 0.1:
        phase = "🟢 Равенство"
    elif gini < 0.2:
        phase = "🟡 Расслоение"
    elif gini < 0.4:
        phase = "🟠 Неравенство"
    else:
        phase = "🔴 Олигархия"
    
    text = f"""📊 <b>Тик #{tick}</b> — Сводка

💰 ВВП: <b>{gdp/1e6:.1f}M₽</b>
👥 Активных: <b>{active}</b> | 💀 Банкротов: <b>{bankrupt}</b>
📈 Gini: <b>{gini:.3f}</b> — {phase}
🔄 Транзакций: <b>{txns}</b>"""
    
    # Добавляем события если есть
    if events:
        event_names = {
            'innovation': '💡', 'crisis': '🔥', 'bankruptcy': '💀',
        }
        for ev in events[:3]:
            text += f"\n{event_names.get(ev, '⚡')} {ev}"
    
    await send_telegram_message(text)


async def send_crisis_alert(event: dict):
    """Отправить алерт о кризисе."""
    severity_emoji = {
        'info': '💡', 'warning': '⚠️', 'critical': '🚨'
    }
    emoji = severity_emoji.get(event.get('severity', 'info'), '⚡')
    title = event.get('title', 'Событие')
    desc = event.get('description', '')
    
    text = f"{emoji} <b>{title}</b>\n{desc}"
    await send_telegram_message(text)


async def send_bankruptcy_milestone(count: int, tick: int):
    """Отправить уведомление о里程碑 банкротств."""
    milestones = [10, 25, 50, 100, 200, 500]
    if count in milestones:
        text = f"💀 <b>Банкротств: {count}</b> (тик #{tick})\nЭкономика теряет участников."
        await send_telegram_message(text)
