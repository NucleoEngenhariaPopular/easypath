from fastapi import APIRouter, HTTPException
from ...storage.flow_repository import try_load_flow


router = APIRouter()


@router.get("/load")
def load_flow(file_path: str):
    flow = try_load_flow(file_path)
    if not flow:
        raise HTTPException(status_code=404, detail="Flow file not found")
    return flow


