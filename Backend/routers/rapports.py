from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import User, Rapport, Institution
from schemas import RapportCreate, RapportResponse, UserRoleEnum
from routers.auth import get_current_user

router = APIRouter(
    prefix="/rapports",
    tags=["Rapports"]
)

@router.post("/", response_model=RapportResponse)
def create_rapport(
    rapport: RapportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Créer un nouveau rapport (réservé aux directeurs).
    """
    if current_user.role != UserRoleEnum.DIRECTEUR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les directeurs peuvent créer des rapports."
        )

    # Vérifier que le directeur est bien affilié à l'institution
    if current_user.institution_id != rapport.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne pouvez pas créer de rapport pour une autre institution."
        )

    db_rapport = Rapport(
        title=rapport.title,
        content=rapport.content,
        institution_id=rapport.institution_id,
        author_id=current_user.id
    )
    db.add(db_rapport)
    db.commit()
    db.refresh(db_rapport)
    return db_rapport

@router.get("/", response_model=List[RapportResponse])
def get_rapports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les rapports (Tutelle voit tout, Directeur voit les siens).
    """
    if current_user.role == UserRoleEnum.TUTELLE:
        # La tutelle peut voir tous les rapports de ses institutions
        # (Pour simplifier, on renvoie tous les rapports ou on filtre par tutelle)
        return db.query(Rapport).all()
    
    elif current_user.role == UserRoleEnum.DIRECTEUR:
        # Le directeur ne voit que les rapports de son institution
        return db.query(Rapport).filter(Rapport.institution_id == current_user.institution_id).all()
    
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès aux rapports."
        )

@router.get("/institution/{institution_id}", response_model=List[RapportResponse])
def get_rapports_by_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Récupérer les rapports pour une institution spécifique.
    """
    if current_user.role not in [UserRoleEnum.TUTELLE, UserRoleEnum.DIRECTEUR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé."
        )
        
    if current_user.role == UserRoleEnum.DIRECTEUR and current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès aux rapports de cette institution."
        )
        
    return db.query(Rapport).filter(Rapport.institution_id == institution_id).all()
