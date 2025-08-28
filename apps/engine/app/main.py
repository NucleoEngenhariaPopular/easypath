

import logging
import argparse
import orchestrator

def setup_logging(log_level=logging.INFO):
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )


if __name__ == "__main__":
    
    parser = argparse.ArgumentParser()
    parser.add_argument('--log-level', default='INFO',
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'])
    args = parser.parse_args()
    
    setup_logging(getattr(logging, args.log_level))
    
    
    orchestrator.run()