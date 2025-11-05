"""
Automatic database migration runner.

Runs SQL migrations on service startup.
"""

import logging
from pathlib import Path
from sqlalchemy import text
from ..database import engine

logger = logging.getLogger(__name__)
"""""" """""" """""" """"""


def run_migrations():
    """
    Run all pending SQL migrations from the migrations directory.

    Migrations are simple SQL files that can be run multiple times safely
    (using IF NOT EXISTS, IF EXISTS checks, etc.)
    """
    migrations_dir = Path(__file__).parent.parent.parent / "migrations"

    if not migrations_dir.exists():
        logger.warning(f"Migrations directory not found: {migrations_dir}")
        return

    # Get all .sql files sorted by name
    migration_files = sorted(migrations_dir.glob("*.sql"))

    if not migration_files:
        logger.info("No migration files found")
        return

    logger.info(f"Found {len(migration_files)} migration file(s) in {migrations_dir}")

    for migration_file in migration_files:
        try:
            logger.info(f"Running migration: {migration_file.name}")

            # Read migration file
            with open(migration_file, "r", encoding="utf-8") as f:
                migration_sql = f.read()

            # If file is empty, skip it
            if not migration_sql.strip():
                logger.warning(f"Skipping empty migration file: {migration_file.name}")
                continue

            # Execute migration
            with engine.begin() as conn:
                logger.info(f"Executing migration: {migration_file.name}")
                _ = conn.execute(text(migration_sql))

            logger.info(f"✓ Migration completed: {migration_file.name}")

        except Exception as e:
            logger.error(
                f"✗ Error running migration {migration_file.name}: {e}", exc_info=True
            )
            # Continue with other migrations

    logger.info("All migrations processed")
