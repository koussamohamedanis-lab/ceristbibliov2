from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt
import os
import logging
from sqlalchemy.orm import joinedload
from dotenv import load_dotenv

load_dotenv()

from database import get_db
from models import User
from schemas import UserCreate, UserResponse, UserLogin

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

# Configuration de la sécurité
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-prod")
ALGORITHM = "HS256"

# --- Fonctions de sécurité ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Créer un JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials = Depends(security)):
    """Vérifier et décoder le JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )

def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    """Récupérer l'utilisateur actuellement authentifié"""
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    return user

# --- Routes ---

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """Enregistrer un nouvel utilisateur"""
    # 1. Vérifier si l'email existe déjà
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email déjà utilisé"
        )
    
    # 2. Créer l'utilisateur avec le mot de passe HACHÉ
    new_user = User(
        nom=user.nom,
        prenom=user.prenom,
        email=user.email,
        password_hash=get_password_hash(user.password),  # Sécurité!
        role=user.role,
        institution_id=user.institution_id,
        labo_id=user.labo_id,
        equipe_id=user.equipe_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Se connecter et retourner un JWT token"""
    # 1. Trouver l'utilisateur
    user = db.query(User).filter(User.email == credentials.email).first()
    
    # 2. Vérifier l'utilisateur et le mot de passe haché
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect"
        )
    
    # 3. Créer le JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email,
        "labo_id": user.labo_id,
        "institution_id": user.institution_id,
        "equipe_id": user.equipe_id,
        "author_id_openalex": user.author_id_openalex,
        "must_change_password": getattr(user, 'must_change_password', False) or False,
    }


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Récupérer les informations d'un utilisateur"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    return user


@router.get("/profile/me")
def get_profile(current_user: User = Depends(get_current_user)):
    """Récupérer le profil de l'utilisateur actuellement authentifié (route protégée)"""
    try:
        return {
            "id": current_user.id,
            "nom": current_user.nom,
            "prenom": current_user.prenom,
            "email": current_user.email,
            "role": current_user.role,
            "institution_id": current_user.institution_id,
            "labo_id": current_user.labo_id,
            "equipe_id": current_user.equipe_id,
            "institution_name": current_user.institution_name,
            "labo_name": current_user.labo_name,
            "equipe_name": current_user.equipe_name,
            "author_id_openalex": current_user.author_id_openalex,
            "phone_number": current_user.phone_number,
            "date_of_birth": str(current_user.date_of_birth) if current_user.date_of_birth else None,
            "profile_picture_url": current_user.profile_picture_url,
            "is_active": current_user.is_active,
            "created_at": str(current_user.created_at) if current_user.created_at else None
        }
    except Exception as e:
        logging.error(f"Erreur dans get_profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")
