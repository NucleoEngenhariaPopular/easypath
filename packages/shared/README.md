# EasyPath Shared Package

Shared constants, enums, and utilities used across EasyPath services.

## Installation

Install as an editable package in each service:

```bash
pip install -e ../../packages/shared
```

Or add to requirements.txt:

```
-e ../../packages/shared
```

## Usage

```python
from easypath_shared.constants import TableNames, MessagingPlatform

# Use table names
__tablename__ = TableNames.BOT_CONFIGS

# Use enums
platform = MessagingPlatform.TELEGRAM
```

## Structure

- `constants/tables.py` - Database table name constants
- `constants/enums.py` - Shared enums across services
- `constants/__init__.py` - Re-exports for easy importing

