from pydantic import BaseModel
from datetime import datetime

class FlowBase(BaseModel):
    name: str
    description: str
    flow_data: dict
    status: str | None = 'draft'
    folder: str | None = None

class FlowCreate(FlowBase):
    pass

class FlowSchema(FlowBase):
    id: int
    owner_id: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class UserSchema(UserBase):
    id: str
    flows: list[FlowSchema] = []

    class Config:
        from_attributes = True
