from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def get_hello():
    return "Welcome to the Hospital Visitor Tracking System API."
