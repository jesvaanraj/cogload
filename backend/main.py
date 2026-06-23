"""
CogLoad Backend — FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import uvicorn
import os

from routers import telemetry, sessions, health
from db.database import init_db

app = FastAPI(
    title="CogLoad API",
    description="Cognitive Load-Aware Coding Assistant Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(telemetry.router, prefix="/ws", tags=["Telemetry"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])


@app.on_event("startup")
async def startup():
    await init_db()
    print("✅ CogLoad backend started")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    dashboard_path = os.path.join(os.path.dirname(__file__), "dashboard", "index.html")
    with open(dashboard_path) as f:
        return f.read()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
