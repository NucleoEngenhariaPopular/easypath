import logging


def setup_logging(log_level: str = "INFO") -> None:
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
        # You can add options here, e.g.:
        # datefmt="%Y-%m-%d %H:%M:%S",
        # filename="app.log",
        # filemode="a",
        # handlers=[...],
        # encoding="utf-8",
        # style="%",
        # stream=sys.stdout,
        # etc.
    )


