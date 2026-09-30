from fastapi import APIRouter

from api.v1.endpoints import (
    admin,
    appointments,
    auth,
    drugs,
    logs,
    medications,
    prescriptions,
    streaks,
    users
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(appointments.router)
api_router.include_router(prescriptions.router)
api_router.include_router(medications.router)
api_router.include_router(logs.router)
api_router.include_router(streaks.router)
api_router.include_router(drugs.router)
api_router.include_router(admin.router)
