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
    Starts the AsyncIOScheduler and registers recurring background tasks.
    """
    if scheduler.running:
        logger.warning("Scheduler is already running.")
        return

    # Job 1: Weekly Timesheet Lock - Every Sunday at 23:59 (Midnight lock)
    scheduler.add_job(
        func=lock_past_weekly_timesheets,
        trigger=CronTrigger(day_of_week="sun", hour=23, minute=59),
        id="weekly_timesheet_lock_job",
        replace_existing=True,
        name="Lock past week timesheets",
    )

    # Job 2: Weekly Timesheet Reminder - Every Monday at 09:00 AM
    scheduler.add_job(
        func=send_weekly_timesheet_reminders,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_timesheet_reminder_job",
        replace_existing=True,
        name="Send weekly timesheet 40h reminders",
    )

    # Job 3: Daily EOD Timesheet Report to Slack - Every day at 20:00 (8:00 PM IST)
    scheduler.add_job(
        func=dispatch_daily_eod_report,
        trigger=CronTrigger(hour=20, minute=0, timezone="Asia/Kolkata"),
        id="daily_eod_slack_report_job",
        replace_existing=True,
        name="Daily EOD Timesheet Report to Slack (8:00 PM IST)",
    )

    # Job 4: Neon Database Keep-Alive - Every 2.5 minutes (150 seconds)
    scheduler.add_job(
        func=ping_database_keepalive,
        trigger=IntervalTrigger(seconds=150),
        id="neon_db_keepalive_job",
        replace_existing=True,
        name="Keep Neon Serverless PostgreSQL awake and warm",
    )

    scheduler.start()
    logger.info("AsyncIOScheduler started successfully with scheduled cron jobs and Neon keep-alive.")


def shutdown_scheduler():
    """
    Gracefully shuts down the scheduler.
    """
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("AsyncIOScheduler shut down successfully.")
