from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models
class Flow(Base):
    __tablename__ = "flows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    flow_data = Column(JSON)

Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class FlowBase(BaseModel):
    name: str
    description: str
    flow_data: dict

class FlowCreate(FlowBase):
    pass

class FlowSchema(FlowBase):
    id: int

    class Config:
        orm_mode = True

app = FastAPI(title="EasyPath Platform API", version="1.0.0")

# CORS Configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/flows/", response_model=FlowSchema)
def create_flow(flow: FlowCreate, db: Session = Depends(get_db)):
    db_flow = Flow(**flow.dict())
    db.add(db_flow)
    db.commit()
    db.refresh(db_flow)
    return db_flow

@app.get("/flows/{flow_id}", response_model=FlowSchema)
def read_flow(flow_id: int, db: Session = Depends(get_db)):
    db_flow = db.query(Flow).filter(Flow.id == flow_id).first()
    if db_flow is None:
        raise HTTPException(status_code=404, detail="Flow not found")
    return db_flow

@app.get("/flows/", response_model=list[FlowSchema])
def list_flows(db: Session = Depends(get_db)):
    """List all flows."""
    flows = db.query(Flow).all()
    return flows