from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

# ====================== ENUMS ======================

class UserRoleEnum(str, Enum):
    CHERCHEUR = "chercheur"
    CHEF_EQUIPE = "chef_equipe"
    CHEF_LABO = "chef_labo"
    DIRECTEUR = "directeur"
    TUTELLE = "tutelle"


# ====================== INSTITUTION SCHEMAS ======================

class InstitutionCreate(BaseModel):
    nom: str
    ville: str
    adresse: Optional[str] = None


class InstitutionResponse(BaseModel):
    id: int
    nom: str
    ville: str
    adresse: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ====================== LABORATOIRE SCHEMAS ======================

class LaboratoireCreate(BaseModel):
    nom: str
    institution_id: int
    description: Optional[str] = None
    domaine: Optional[str] = None
    chef_labo_id: Optional[int] = None


class LaboratoireResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    domaine: Optional[str]
    institution_id: int
    chef_labo_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ====================== EQUIPE SCHEMAS ======================

class EquipeCreate(BaseModel):
    nom: str
    labo_id: int


class EquipeResponse(BaseModel):
    id: int
    nom: str
    description: Optional[str]
    labo_id: int
    chef_equipe_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ====================== USER SCHEMAS ======================

class UserCreate(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    password: str
    role: Optional[UserRoleEnum] = UserRoleEnum.CHERCHEUR
    institution_id: int
    labo_id: Optional[int] = None
    equipe_id: Optional[int] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None


class UserResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    role: UserRoleEnum
    author_id_openalex: Optional[str]
    institution_id: Optional[int]
    labo_id: Optional[int]
    equipe_id: Optional[int]
    institution_name: Optional[str] = None
    labo_name: Optional[str] = None
    equipe_name: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    role: Optional[UserRoleEnum] = None
    author_id_openalex: Optional[str] = None
    labo_id: Optional[int] = None
    equipe_id: Optional[int] = None
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ====================== PUBLICATION SCHEMAS ======================

class PublicationCreate(BaseModel):
    openalex_id: str
    title: str
    doi: Optional[str] = None
    publication_year: Optional[int] = None
    cited_by_count: int = 0
    type: Optional[str] = None
    user_id: int


class PublicationResponse(BaseModel):
    id: int
    openalex_id: str
    title: str
    doi: Optional[str]
    publication_year: Optional[int]
    cited_by_count: int
    type: Optional[str]
    user_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    doi: Optional[str] = None
    publication_year: Optional[int] = None
    cited_by_count: Optional[int] = None
    type: Optional[str] = None

# ====================== RAPPORT SCHEMAS ======================

class RapportCreate(BaseModel):
    title: str
    content: str
    institution_id: int

class RapportResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    author_id: int
    institution_id: int
    
    class Config:
        from_attributes = True
