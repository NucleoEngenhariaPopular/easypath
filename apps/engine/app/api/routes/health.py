from fastapi import APIRouter


router = APIRouter()


@router.get("/")
def health_status():
    return {"status": "ok"}


@router.get("/ping")
def health_ping():
    return {"message": "pong"}


