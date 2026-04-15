from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Institution

router = APIRouter(prefix="/institutions", tags=["Institutions"])

@router.post("/")
def create_institution(nom: str, ville: str, db: Session = Depends(get_db)):
    """Créer une institution"""
    institution = Institution(nom=nom, ville=ville)
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution

@router.get("/")
def list_institutions(db: Session = Depends(get_db)):
    """Lister toutes les institutions"""
    return db.query(Institution).all()
