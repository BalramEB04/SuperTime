import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.scheduler.weekly_timesheet_lock import lock_past_weekly_timesheets
from app.scheduler.weekly_timesheet_reminder import send_weekly_timesheet_reminders
from app.scheduler.daily_eod_slack_job import dispatch_daily_eod_report

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def ping_database_keepalive():
    """
    Lightweight ping executed every 2.5 minutes to prevent Neon Serverless PostgreSQL
    compute from suspending into cold sleep, keeping the connection pool pre-warmed.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        logger.debug(f"DB keepalive ping encountered transient error: {exc}")


def start_scheduler():
    """
    Scheduler disabled per configuration. Background cron jobs removed.
    """
    logger.info("Background scheduler is disabled.")
    return


def shutdown_scheduler():
    """
    Gracefully shuts down the scheduler.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("AsyncIOScheduler shut down successfully.")
