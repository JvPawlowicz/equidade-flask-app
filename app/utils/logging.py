import json
import logging
from pythonjsonlogger import jsonlogger

def setup_logging(app):
    class StructuredFormatter(jsonlogger.JsonFormatter):
        def add_fields(self, log_record, record, message_dict):
            super().add_fields(log_record, record, message_dict)
            log_record.update({
                "timestamp": record.created,
                "level": record.levelname,
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno
            })
    
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)