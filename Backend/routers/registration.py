"""
Registration Router - Role-based registration with cascading organizational selection.

This module handles:
- Multi-step registration with role selection
- Cascading organization selection (tutelle -> institution -> labo -> equipe)
- Public endpoints to list organizations for registration forms
- Password change (mandatory on first login)
- Profile/settings update (author_id_openalex)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models import User, Institution, Laboratoire, Equipe, UserRole
from routers.auth import get_current_user, get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/registration", tags=["Registration"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ====================== SCHEMAS ======================

class RegisterChercheur(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    equipe_id: int
    author_id_openalex: Optional[str] = None

class RegisterChefEquipe(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    labo_id: int
    equipe_name: str
    author_id_openalex: Optional[str] = None

class RegisterChefLabo(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    institution_id: int
    labo_name: str

class RegisterDirecteur(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    tutelle_id: int
    institution_name: str
    ville: Optional[str] = "Algérie"

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    author_id_openalex: Optional[str] = None
    nom: Optional[str] = None
    prenom: Optional[str] = None

# ====================== PUBLIC ENDPOINTS FOR FORM DATA ======================

@router.get("/public/tutelles")
def get_tutelles_for_registration(db: Session = Depends(get_db)):
    """List all tutelles for the registration form (public)"""
    tutelles = db.query(User).filter(User.role == UserRole.TUTELLE.value, User.is_active == True).all()
    return [{"id": t.id, "name": f"{t.prenom} {t.nom}"} for t in tutelles]

@router.get("/public/institutions")
def get_institutions_for_registration(tutelle_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List institutions (optionally filtered by tutelle) for the registration form (public)"""
    query = db.query(Institution).filter(Institution.is_active == True)
    if tutelle_id:
        query = query.filter(Institution.tutelle_id == tutelle_id)
    institutions = query.all()
    return [{"id": i.id, "name": i.nom, "ville": i.ville, "tutelle_id": i.tutelle_id} for i in institutions]

@router.get("/public/laboratoires")
def get_laboratoires_for_registration(institution_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List laboratoires (optionally filtered by institution) for the registration form (public)"""
    query = db.query(Laboratoire)
    if institution_id:
        query = query.filter(Laboratoire.institution_id == institution_id)
    laboratoires = query.all()
    return [{"id": l.id, "name": l.nom, "institution_id": l.institution_id} for l in laboratoires]

@router.get("/public/equipes")
def get_equipes_for_registration(labo_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List equipes (optionally filtered by labo) for the registration form (public)"""
    query = db.query(Equipe)
    if labo_id:
        query = query.filter(Equipe.labo_id == labo_id)
    equipes = query.all()
    return [{"id": e.id, "name": e.nom, "labo_id": e.labo_id} for e in equipes]

# ====================== ROLE-BASED REGISTRATION ======================

@router.post("/chercheur")
def register_chercheur(data: RegisterChercheur, db: Session = Depends(get_db)):
    """Register as a Chercheur - must select an existing equipe"""
    # Check email uniqueness
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Validate equipe exists
    equipe = db.query(Equipe).filter(Equipe.id == data.equipe_id).first()
    if not equipe:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    
    # Get labo and institution from equipe
    labo = db.query(Laboratoire).filter(Laboratoire.id == equipe.labo_id).first()
    institution_id = labo.institution_id if labo else None
    
    new_user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.CHERCHEUR.value,
        equipe_id=data.equipe_id,
        labo_id=equipe.labo_id,
        institution_id=institution_id,
        author_id_openalex=data.author_id_openalex,
        is_active=True,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Auto-login: create token
    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "role": new_user.role,
        "nom": new_user.nom,
        "prenom": new_user.prenom,
        "email": new_user.email,
        "must_change_password": False,
        "message": "Inscription réussie en tant que Chercheur"
    }


@router.post("/chef_equipe")
def register_chef_equipe(data: RegisterChefEquipe, db: Session = Depends(get_db)):
    """Register as a Chef d'Équipe - must select a labo and name the new equipe"""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Validate labo exists
    labo = db.query(Laboratoire).filter(Laboratoire.id == data.labo_id).first()
    if not labo:
        raise HTTPException(status_code=404, detail="Laboratoire non trouvé")
    
    # Create the equipe
    new_equipe = Equipe(
        nom=data.equipe_name,
        labo_id=data.labo_id,
    )
    db.add(new_equipe)
    db.flush()  # Get the equipe ID
    
    # Create user
    new_user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.CHEF_EQUIPE.value,
        equipe_id=new_equipe.id,
        labo_id=data.labo_id,
        institution_id=labo.institution_id,
        author_id_openalex=data.author_id_openalex,
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    
    # Set the chef_equipe_id on the equipe
    new_equipe.chef_equipe_id = new_user.id
    
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "role": new_user.role,
        "nom": new_user.nom,
        "prenom": new_user.prenom,
        "email": new_user.email,
        "equipe_id": new_equipe.id,
        "equipe_name": new_equipe.nom,
        "must_change_password": False,
        "message": f"Inscription réussie. Équipe '{data.equipe_name}' créée."
    }


@router.post("/chef_labo")
def register_chef_labo(data: RegisterChefLabo, db: Session = Depends(get_db)):
    """Register as a Chef de Labo - must select an institution and name the new labo"""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Validate institution exists
    institution = db.query(Institution).filter(Institution.id == data.institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    
    # Create the laboratoire
    new_labo = Laboratoire(
        nom=data.labo_name,
        institution_id=data.institution_id,
    )
    db.add(new_labo)
    db.flush()
    
    # Create user
    new_user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.CHEF_LABO.value,
        labo_id=new_labo.id,
        institution_id=data.institution_id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    
    # Set chef_labo_id on the labo
    new_labo.chef_labo_id = new_user.id
    
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "role": new_user.role,
        "nom": new_user.nom,
        "prenom": new_user.prenom,
        "email": new_user.email,
        "labo_id": new_labo.id,
        "labo_name": new_labo.nom,
        "institution_id": data.institution_id,
        "must_change_password": False,
        "message": f"Inscription réussie. Laboratoire '{data.labo_name}' créé."
    }


@router.post("/directeur")
def register_directeur(data: RegisterDirecteur, db: Session = Depends(get_db)):
    """Register as a Directeur - must select a tutelle and name the new institution"""
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    # Validate tutelle exists
    tutelle = db.query(User).filter(User.id == data.tutelle_id, User.role == UserRole.TUTELLE.value).first()
    if not tutelle:
        raise HTTPException(status_code=404, detail="Tutelle non trouvée")
    
    # Create the institution
    new_institution = Institution(
        nom=data.institution_name,
        ville=data.ville or "Algérie",
        tutelle_id=data.tutelle_id,
        is_active=True,
    )
    db.add(new_institution)
    db.flush()
    
    # Create user
    new_user = User(
        nom=data.nom,
        prenom=data.prenom,
        email=data.email,
        password_hash=get_password_hash(data.password),
        role=UserRole.DIRECTEUR.value,
        institution_id=new_institution.id,
        is_active=True,
    )
    db.add(new_user)
    db.flush()
    
    # Set directeur_id on the institution
    new_institution.directeur_id = new_user.id
    
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "role": new_user.role,
        "nom": new_user.nom,
        "prenom": new_user.prenom,
        "email": new_user.email,
        "institution_id": new_institution.id,
        "institution_name": new_institution.nom,
        "must_change_password": False,
        "message": f"Inscription réussie. Institution '{data.institution_name}' créée."
    }


# ====================== PASSWORD & PROFILE ======================

@router.post("/change-password")
def change_password(data: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Change password - can be mandatory on first login"""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    
    current_user.password_hash = get_password_hash(data.new_password)
    if hasattr(current_user, 'must_change_password'):
        current_user.must_change_password = False
    
    db.commit()
    
    return {"message": "Mot de passe modifié avec succès", "success": True}


@router.put("/profile")
def update_profile(data: ProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update profile settings (author_id_openalex, nom, prenom)"""
    if data.author_id_openalex is not None:
        current_user.author_id_openalex = data.author_id_openalex
    if data.nom is not None:
        current_user.nom = data.nom
    if data.prenom is not None:
        current_user.prenom = data.prenom
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profil mis à jour avec succès",
        "success": True,
        "user": {
            "id": current_user.id,
            "nom": current_user.nom,
            "prenom": current_user.prenom,
            "email": current_user.email,
            "role": current_user.role,
            "author_id_openalex": current_user.author_id_openalex,
        }
    }
