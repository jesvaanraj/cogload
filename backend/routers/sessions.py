from fastapi import APIRouter
from db.repository import get_sessions, get_session_history

router = APIRouter()


@router.get("/")
async def list_sessions():
    return await get_sessions()


@router.get("/{session_id}")
async def session_history(session_id: str):
    return await get_session_history(session_id)
