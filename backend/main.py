from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.database import database
from backend.routers import auth, events, dashboard
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.connect()
    yield
    await database.disconnect()

app = FastAPI(title="Business Photography System", lifespan=lifespan)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix to match frontend axios config
app.include_router(auth.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")

# Lazy import other routers to avoid circular dependencies if any
from backend.routers import expenses, cameras, finance, clients, invoices
app.include_router(expenses.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(finance.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(invoices.router, prefix="/api")

# Mount static files (Frontend build)
# Typically the Dockerfile copies 'frontend/dist' to '/app/frontend/dist'
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="assets")
    
    # Catch-all route for SPA (React Router)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Allow API routes to pass through (already handled above by routers)
        if full_path.startswith("api"):
            return {"error": "API route not found"}
            
        # Serve index.html for all other routes
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))
else:
    print(f"Static directory not found: {STATIC_DIR}. Running in API-only mode.")

@app.get("/health")
async def health_check():
    return {"status": "ok", "database": "connected" if database.is_connected else "disconnected"}
