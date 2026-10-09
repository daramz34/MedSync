from fastapi import APIRouter

from api.v1.endpoints import (admin,
    appointment,
    auth,
    drugs,
    logs,
    medications,
    prescriptions,
    streak,
    reminders,
    users)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(appointment.router)
api_router.include_router(prescriptions.router)
api_router.include_router(medications.router)
api_router.include_router(logs.router)
api_router.include_router(streak.router)
api_router.include_router(drugs.router)
api_router.include_router(admin.router)
api_router.include_router(reminders.router)