import json
from pathlib import Path
from typing import Optional

from ..models.flow import Flow


def load_flow_from_file(file_path: str | Path) -> Flow:
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return Flow.model_validate(data)


def try_load_flow(file_path: str | Path) -> Optional[Flow]:
    path = Path(file_path)
    if not path.exists():
        return None
    return load_flow_from_file(path)


