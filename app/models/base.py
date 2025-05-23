from datetime import datetime
from sqlalchemy import Column, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

class TimestampMixin:
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

Base = declarative_base()