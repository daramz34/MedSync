from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api.v1.router import api_router
from core.cache import cache
from core.config import settings
from core.limiter import limiter
from database import Base, engine
from services.scheduler import shutdown_scheduler, start_scheduler


# ── Lifespan: startup & shutdown ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)

    scheduler_started = False
    try:
        if settings.SCHEDULER_ENABLED:
            start_scheduler()
            scheduler_started = True
        yield
    finally:
        # Shutdown — always runs, even if startup half-failed
        if scheduler_started:
            shutdown_scheduler()
        cache.close()


app = FastAPI(
    title=settings.APP_NAME,
    description="MedSync — Your Health, Tracked",
    version=settings.VERSION,
    lifespan=lifespan,
)

# ── Rate limiter (the ONE shared limiter from core/limiter.py) ──
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)   # ← makes the global default limit apply
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://medsync-frontend2.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Routers ──
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "Welcome to MedSync API", "docs": "/docs"}
    