"""
Database setup using aiosqlite (dev) — swap connection string for PostgreSQL in prod.
"""
import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "cogload.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS snapshots (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id  TEXT NOT NULL,
                timestamp   INTEGER NOT NULL,
                wpm         REAL,
                error_rate  REAL,
                backspace_rate REAL,
                pause_avg_ms   REAL,
                paste_ratio    REAL,
                session_minutes REAL,
                active_language TEXT,
                load_score  REAL,
                load_state  TEXT,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_session ON snapshots(session_id)
        """)
        await db.commit()
    print("✅ Database initialized")
