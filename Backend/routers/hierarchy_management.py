from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Institution, Laboratoire, Equipe, User
from . import auth

get_current_user = auth.get_current_user

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy Management"])


# ==================== LABORATOIRES ====================

@router.post("/laboratories")
def create_laboratory(
    lab_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Créer un laboratoire - Only tutelle/directeur can create"""
    try:
        # Check if user has permission
        if current_user.role not in ["tutelle", "directeur"]:
            raise HTTPException(status_code=403, detail="Seul un tutelle ou directeur peut créer des laboratoires")
        
        # Check if lab already exists
        existing = db.query(Laboratoire).filter(Laboratoire.nom == lab_data.get('nom'), Laboratoire.institution_id == lab_data.get('institution_id')).first()
        if existing:
            raise HTTPException(status_code=400, detail="Laboratoire déjà existant")
        
        # Check if institution exists
        institution = db.query(Institution).filter(Institution.id == lab_data.get('institution_id')).first()
        if not institution:
            raise HTTPException(status_code=404, detail="Institution non trouvée")
        
        # Create lab
        lab = Laboratoire(
            nom=lab_data.get('nom'),
            institution_id=lab_data.get('institution_id'),
            description=lab_data.get('description'),
            domaine=lab_data.get('domaine'),
        )
        
        db.add(lab)
        db.commit()
        db.refresh(lab)
        
        return {
            "id": lab.id,
            "nom": lab.nom,
            "institution_id": lab.institution_id,
            "message": "Laboratoire créé avec succès"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ÉQUIPES ====================

@router.post("/teams")
def create_team(
    team_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Créer une équipe - Only tutelle/directeur/chef_labo can create"""
    try:
        # Check if user has permission
        if current_user.role not in ["tutelle", "directeur", "chef_labo"]:
            raise HTTPException(status_code=403, detail="Seul un tutelle, directeur ou chef de labo peut créer des équipes")
        
        # Check if team already exists
        existing = db.query(Equipe).filter(Equipe.nom == team_data.get('nom'), Equipe.labo_id == team_data.get('labo_id')).first()
        if existing:
            raise HTTPException(status_code=400, detail="Équipe déjà existante")
        
        # Check if lab exists
        lab = db.query(Laboratoire).filter(Laboratoire.id == team_data.get('labo_id')).first()
        if not lab:
            raise HTTPException(status_code=404, detail="Laboratoire non trouvé")
        
        # Create team
        team = Equipe(
            nom=team_data.get('nom'),
            labo_id=team_data.get('labo_id'),
            description=team_data.get('description'),
        )
        
        db.add(team)
        db.commit()
        db.refresh(team)
        
        return {
            "id": team.id,
            "nom": team.nom,
            "labo_id": team.labo_id,
            "message": "Équipe créée avec succès"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ==================== LIST LABORATORIES & TEAMS ====================

@router.get("/laboratories")
def get_laboratories(db: Session = Depends(get_db)):
    """Obtenir tous les laboratoires"""
    try:
        labs = db.query(Laboratoire).all()
        return [
            {
                "id": lab.id,
                "nom": lab.nom,
                "institution_id": lab.institution_id,
                "description": lab.description,
                "domaine": lab.domaine,
            }
            for lab in labs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    """Obtenir toutes les équipes"""
    try:
        teams = db.query(Equipe).all()
        return [
            {
                "id": team.id,
                "nom": team.nom,
                "labo_id": team.labo_id,
                "description": team.description,
            }
            for team in teams
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GET USERS BY HIERARCHY ====================

@router.get("/laboratories/{lab_id}/users")
def get_laboratory_users(lab_id: int, db: Session = Depends(get_db)):
    """Obtenir tous les utilisateurs d'un laboratoire"""
    try:
        users = db.query(User).filter(User.labo_id == lab_id).all()
        
        return [
            {
                "id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "role": user.role,
            }
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/teams/{team_id}/users")
def get_team_users(team_id: int, db: Session = Depends(get_db)):
    """Obtenir tous les utilisateurs d'une équipe"""
    try:
        users = db.query(User).filter(User.equipe_id == team_id).all()
        
        return [
            {
                "id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "role": user.role,
            }
            for user in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
