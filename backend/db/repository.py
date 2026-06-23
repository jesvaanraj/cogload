"""
Database repository — all read/write operations.
"""
import aiosqlite
from typing import Dict, Any, List
from db.database import DB_PATH


async def save_snapshot(
    session_id: str,
    data: Dict[str, Any],
    score: float,
    state: str
) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            INSERT INTO snapshots
                (session_id, timestamp, wpm, error_rate, backspace_rate,
                 pause_avg_ms, paste_ratio, session_minutes, active_language,
                 load_score, load_state)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            session_id,
            data.get("timestamp", 0),
            data.get("wpm", 0),
            data.get("error_rate", 0),
            data.get("backspace_rate", 0),
            data.get("pause_avg_ms", 0),
            data.get("paste_ratio", 0),
            data.get("session_minutes", 0),
            data.get("active_language", "unknown"),
            score,
            state,
        ))
        await db.commit()


async def get_sessions() -> List[Dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT session_id,
                   COUNT(*)        AS snapshots,
                   AVG(load_score) AS avg_score,
                   MIN(created_at) AS started_at,
                   MAX(created_at) AS last_seen
            FROM snapshots
            GROUP BY session_id
            ORDER BY last_seen DESC
            LIMIT 50
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_session_history(session_id: str) -> List[Dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT * FROM snapshots
            WHERE session_id = ?
            ORDER BY timestamp ASC
        """, (session_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
