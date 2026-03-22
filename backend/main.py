from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine, settings
from models import event, message  # ensure models are registered
from routers.events import router as events_router
from routers.whatsapp import router as whatsapp_router
from routers.email_router import router as email_router
from routers.messages import router as messages_router
from routers.settings_router import router as settings_router
from services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables
    Base.metadata.create_all(bind=engine)
    # Start background scheduler
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Calendar App API",
    description="Hebrew/Gregorian calendar with event management, WhatsApp & email scheduling",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — open to all origins (single-user personal app, no auth/cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(events_router, prefix="/api")
app.include_router(whatsapp_router, prefix="/api")
app.include_router(email_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
