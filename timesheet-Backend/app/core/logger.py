import logging
from logging.handlers import RotatingFileHandler
import os

# Setup the logger
logger = logging.getLogger("timesheet_app")
logger.setLevel(logging.INFO)

# Create formatters
log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Create handlers
if not logger.handlers:
    # Console handler (standard output, always works and is captured by Vercel / Cloud logs)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    # In serverless environments (like Vercel / AWS Lambda), the filesystem is read-only.
    # Only create file handler if the filesystem is writable and not in a serverless environment.
    if not os.environ.get("VERCEL") and not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        try:
            LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
            os.makedirs(LOG_DIR, exist_ok=True)
            LOG_FILE = os.path.join(LOG_DIR, "app.log")
            file_handler = RotatingFileHandler(LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5)
            file_handler.setFormatter(log_format)
            logger.addHandler(file_handler)
        except (OSError, PermissionError):
            pass
