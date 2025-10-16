"""
Automatic database migration runner.

Runs SQL migrations on service startup.
"""
import logging
from pathlib import Path
from sqlalchemy import text
from ..database import engine

logger = logging.getLogger(__name__)


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
            with open(migration_file, 'r', encoding='utf-8') as f:
                migration_sql = f.read()

            # Execute migration
            statement_count = 0
            with engine.begin() as conn:
                # Split by semicolon and execute each statement
                statements = [s.strip() for s in migration_sql.split(';') if s.strip()]

                for statement in statements:
                    # Skip comments and empty statements
                    if statement.startswith('--') or not statement:
                        continue

                    try:
                        # Log what we're executing (first 100 chars)
                        preview = statement.replace('\n', ' ')[:100]
                        logger.info(f"  Executing: {preview}...")
                        conn.execute(text(statement))
                        statement_count += 1
                    except Exception as e:
                        # Log but continue - migration might have already been applied
                        logger.warning(f"  Statement note: {str(e)[:200]}")

            logger.info(f"✓ Migration completed: {migration_file.name} ({statement_count} statement(s) executed)")

        except Exception as e:
            logger.error(f"✗ Error running migration {migration_file.name}: {e}", exc_info=True)
            # Continue with other migrations

    logger.info("All migrations processed")
