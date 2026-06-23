"""
Session Store — in-memory store for active WebSocket sessions.
Uses Redis in production; falls back to a local dict for dev.
"""
from typing import Dict, Any
from datetime import datetime


class SessionStore:
    def __init__(self):
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def update(self, session_id: str, score: float, state: str) -> None:
        if session_id not in self._sessions:
            self._sessions[session_id] = {"created_at": datetime.utcnow().isoformat()}
        self._sessions[session_id].update({
            "last_score": score,
            "last_state": state,
            "updated_at": datetime.utcnow().isoformat(),
        })

    def get(self, session_id: str) -> Dict[str, Any]:
        return self._sessions.get(session_id, {})

    def remove(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def all_sessions(self) -> Dict[str, Any]:
        return self._sessions
