from sqlalchemy import Column, Integer, String, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base
from easypath_shared.constants import TableNames

class User(Base):
    __tablename__ = TableNames.USERS
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    flows = relationship("Flow", back_populates="owner")

class Flow(Base):
    __tablename__ = TableNames.FLOWS
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    flow_data = Column(JSON)
    owner_id = Column(String, ForeignKey(f"{TableNames.USERS}.id"))
    owner = relationship("User", back_populates="flows")
    status = Column(String, default="draft")
    folder = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
