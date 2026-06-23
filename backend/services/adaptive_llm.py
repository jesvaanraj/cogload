"""
Adaptive LLM Service — returns adaptive responses based on cognitive load.
Uses fallback messages by default (no API key needed).
"""
import os
import httpx
from typing import Dict, Any

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

FALLBACK_MESSAGES = {
    "fresh": (
        "You're in peak condition!",
        "Try tackling that refactor or architecture task you've been putting off."
    ),
    "normal": (
        "Coding steadily.",
        "Keep going — your pace is solid."
    ),
    "tired": (
        "Signs of fatigue detected.",
        "Consider a 5-minute break before continuing."
    ),
    "critical": (
        "High cognitive load detected.",
        "Take a break now. Bugs increase significantly when overloaded."
    ),
    "flow": ("", ""),
}


async def get_adaptive_response(
    score: float,
    state: str,
    features: Dict[str, Any]
) -> Dict[str, Any]:
    if state == "flow":
        return {"score": score, "state": state, "message": "", "suggestion": ""}

    fallback = FALLBACK_MESSAGES.get(state, FALLBACK_MESSAGES["normal"])
    return {
        "score": score,
        "state": state,
        "message": fallback[0],
        "suggestion": fallback[1],
    }