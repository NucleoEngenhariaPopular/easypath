from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
import os
import logging
import time
from dotenv import load_dotenv
from app.core.logging_config import setup_logging
from easypath_shared.constants import TableNames

load_dotenv()

# Configure logging with file rotation
setup_logging(log_level=os.getenv("LOG_LEVEL", "INFO"), log_dir="logs")
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# SQLAlchemy Models
class Flow(Base):
    __tablename__ = TableNames.FLOWS
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

# Request/Response Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    # Log incoming request
    logger.info(
        f"Incoming request: method={request.method} path={request.url.path} "
        f"client={request.client.host if request.client else 'unknown'}"
    )

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log response
    logger.info(
        f"Request completed: method={request.method} path={request.url.path} "
        f"status_code={response.status_code} duration={duration:.3f}s"
    )

    return response

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/flows/", response_model=FlowSchema)
def create_flow(flow: FlowCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating new flow: name='{flow.name}', description='{flow.description}'")
    try:
        db_flow = Flow(**flow.dict())
        db.add(db_flow)
        db.commit()
        db.refresh(db_flow)
        logger.info(f"Flow created successfully: flow_id={db_flow.id}, name='{db_flow.name}'")
        return db_flow
    except Exception as e:
        logger.error(f"Failed to create flow: name='{flow.name}', error={str(e)}", exc_info=True)
        db.rollback()
        raise

@app.get("/flows/{flow_id}", response_model=FlowSchema)
def read_flow(flow_id: int, db: Session = Depends(get_db)):
    logger.info(f"Retrieving flow: flow_id={flow_id}")
    try:
        db_flow = db.query(Flow).filter(Flow.id == flow_id).first()
        if db_flow is None:
            logger.warning(f"Flow not found: flow_id={flow_id}")
            raise HTTPException(status_code=404, detail="Flow not found")
        logger.info(f"Flow retrieved successfully: flow_id={flow_id}, name='{db_flow.name}'")
        return db_flow
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve flow: flow_id={flow_id}, error={str(e)}", exc_info=True)
        raise

@app.get("/flows/", response_model=list[FlowSchema])
def list_flows(db: Session = Depends(get_db)):
    """List all flows."""
    logger.info("Retrieving all flows")
    try:
        flows = db.query(Flow).all()
        logger.info(f"Retrieved {len(flows)} flow(s)")
        return flows
    except Exception as e:
        logger.error(f"Failed to retrieve flows: error={str(e)}", exc_info=True)
        raise

@app.put("/flows/{flow_id}", response_model=FlowSchema)
def update_flow(flow_id: int, flow: FlowCreate, db: Session = Depends(get_db)):
    logger.info(f"Updating flow: flow_id={flow_id}, new_name='{flow.name}'")
    try:
        db_flow = db.query(Flow).filter(Flow.id == flow_id).first()
        if db_flow is None:
            logger.warning(f"Flow not found for update: flow_id={flow_id}")
            raise HTTPException(status_code=404, detail="Flow not found")

        old_name = db_flow.name
        db_flow.name = flow.name
        db_flow.description = flow.description
        db_flow.flow_data = flow.flow_data

        db.commit()
        db.refresh(db_flow)
        logger.info(
            f"Flow updated successfully: flow_id={flow_id}, "
            f"old_name='{old_name}', new_name='{db_flow.name}'"
        )
        return db_flow
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to update flow: flow_id={flow_id}, new_name='{flow.name}', error={str(e)}",
            exc_info=True,
        )
        db.rollback()
        raise

@app.delete("/flows/{flow_id}")
def delete_flow(flow_id: int, db: Session = Depends(get_db)):
    logger.info(f"Deleting flow: flow_id={flow_id}")
    try:
        db_flow = db.query(Flow).filter(Flow.id == flow_id).first()
        if db_flow is None:
            logger.warning(f"Flow not found for deletion: flow_id={flow_id}")
            raise HTTPException(status_code=404, detail="Flow not found")

        flow_name = db_flow.name
        db.delete(db_flow)
        db.commit()
        logger.info(f"Flow deleted successfully: flow_id={flow_id}, name='{flow_name}'")
        return {"message": "Flow deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to delete flow: flow_id={flow_id}, error={str(e)}",
            exc_info=True,
        )
        db.rollback()
        raise