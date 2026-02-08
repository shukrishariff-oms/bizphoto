from contextlib import asynccontextmanager
from fastapi import FastAPI
from backend.database import database
from backend.routers import auth, events, dashboard

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

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(dashboard.router)
from backend.routers import expenses, cameras, finance, clients, invoices
app.include_router(expenses.router)
app.include_router(cameras.router)
app.include_router(finance.router)
app.include_router(clients.router)
app.include_router(invoices.router)

@app.get("/")
async def root():
    return {"message": "System is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "database": "connected" if database.is_connected else "disconnected"}
