"""
WebSocket endpoint — receives telemetry from VSCode extension,
scores cognitive load, returns adaptive response.
"""
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.feature_extractor import extract_features
from services.load_scorer import score_cognitive_load
from services.session_store import SessionStore
from services.adaptive_llm import get_adaptive_response
from db.repository import save_snapshot

logger = logging.getLogger(__name__)
router = APIRouter()
store = SessionStore()


@router.websocket("/telemetry")
async def telemetry_ws(websocket: WebSocket):
    await websocket.accept()
    session_id = None
    logger.info("New WebSocket connection accepted")

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            session_id = data.get("session_id", "unknown")

            # 1. Extract features from raw telemetry
            features = extract_features(data)

            # 2. Score cognitive load (1–10)
            score, state = score_cognitive_load(features)

            # 3. Get adaptive LLM response
            response = await get_adaptive_response(score, state, features)

            # 4. Persist to database
            await save_snapshot(session_id, data, score, state)

            # 5. Update session store
            store.update(session_id, score, state)

            # 6. Return to extension
            await websocket.send_text(json.dumps(response))
            logger.info(f"[{session_id}] Score: {score}/10  State: {state}")

    except WebSocketDisconnect:
        logger.info(f"[{session_id}] Disconnected")
        if session_id:
            store.remove(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()
