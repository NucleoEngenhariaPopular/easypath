import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler


def setup_logging(log_level: str = "INFO", log_dir: str = "logs") -> None:
    """
    Configure logging with both file and console handlers.

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files (default: "logs")
    """
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Create logs directory if it doesn't exist
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)

    # Define log format with more details
    detailed_format = "%(asctime)s - %(levelname)-8s - [%(name)s:%(funcName)s:%(lineno)d] - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Create formatters
    formatter = logging.Formatter(detailed_format, datefmt=date_format)

    # File handler with rotation (10MB max, keep 5 backup files)
    file_handler = RotatingFileHandler(
        log_path / "engine.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(numeric_level)
    file_handler.setFormatter(formatter)

    # Console handler with simpler format for readability
    console_format = "%(asctime)s - %(levelname)-8s - %(message)s"
    console_formatter = logging.Formatter(console_format, datefmt=date_format)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(console_formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()

    # Add handlers
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    # Log startup message
    logging.info("=" * 80)
    logging.info("Engine logging initialized - Level: %s, Log file: %s",
                 log_level.upper(), log_path / "engine.log")
    logging.info("=" * 80)


