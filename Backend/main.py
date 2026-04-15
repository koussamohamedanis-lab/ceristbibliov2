from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, institutions, users, hierarchy, hierarchy_management, rapports, teams, registration
from fastapi import Request
from fastapi.responses import JSONResponse
import logging
import traceback

# Cette ligne crée les tables dans ta base ceristbiblio au démarrage
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CERIST Bibliométrie API")

# Configuration du CORS (Indispensable pour React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Global Exception: {exc}")
    logging.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Erreur interne du serveur", "error": str(exc)},
    )

# Inclure les routes
app.include_router(auth.router)
app.include_router(institutions.router)
app.include_router(users.router)
app.include_router(hierarchy.router)
app.include_router(hierarchy_management.router)
app.include_router(rapports.router)
app.include_router(teams.router)
app.include_router(registration.router)

@app.get("/")
def root():
    return {"message": "Bienvenue sur l'API du projet PFE"}