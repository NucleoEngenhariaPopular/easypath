from fastapi import FastAPI, Depends, HTTPException
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
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    flows = relationship("Flow", back_populates="owner")

class Flow(Base):
    __tablename__ = "flows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    flow_data = Column(JSON)
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="flows")

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
    owner_id: int

    class Config:
        orm_mode = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: int
    flows: list[FlowSchema] = []

    class Config:
        orm_mode = True

app = FastAPI()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/users/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # In a real app, hash the password
    db_user = User(email=user.email, hashed_password=user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserSchema)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/flows/", response_model=FlowSchema)
def create_flow(flow: FlowCreate, owner_id: int, db: Session = Depends(get_db)):
    db_flow = Flow(**flow.dict(), owner_id=owner_id)
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

@app.get("/users/{user_id}/flows/", response_model=list[FlowSchema])
def read_user_flows(user_id: int, db: Session = Depends(get_db)):
    flows = db.query(Flow).filter(Flow.owner_id == user_id).all()
    return flows