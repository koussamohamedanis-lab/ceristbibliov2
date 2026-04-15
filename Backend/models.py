from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

# 1. On garde l'Enum pour la logique Python
class UserRole(str, enum.Enum):
    CHERCHEUR = "chercheur"
    CHEF_EQUIPE = "chef_equipe"
    CHEF_LABO = "chef_labo"
    DIRECTEUR = "directeur"
    TUTELLE = "tutelle"

class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    ville = Column(String(100))
    adresse = Column(Text, nullable=True)
    directeur_id = Column(Integer, nullable=True)
    tutelle_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships - keep it simple to avoid ambiguity
    laboratoires = relationship("Laboratoire", back_populates="institution")
    tutelle_user = relationship("User", foreign_keys=[tutelle_id], backref="managed_institutions_as_tutelle")


class Laboratoire(Base):
    __tablename__ = "laboratoires"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    domaine = Column(String(100), nullable=True)
    chef_labo_id = Column(Integer, nullable=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    institution = relationship("Institution", back_populates="laboratoires")
    equipes = relationship("Equipe", back_populates="laboratoire")


class Equipe(Base):
    __tablename__ = "equipes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    chef_equipe_id = Column(Integer, nullable=True)
    labo_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    laboratoire = relationship("Laboratoire", back_populates="equipes")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100))
    prenom = Column(String(100))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Utilisation de String(50) pour éviter les conflits de type PG
    # On définit la valeur par défaut via l'Enum
    role = Column(String(50), default=UserRole.CHERCHEUR.value)
    
    # Profils externes (provisoirement dans les métadonnées JSON)
    author_id_openalex = Column(String(100), unique=True, nullable=True)
    
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Clés étrangères
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    labo_id = Column(Integer, ForeignKey("laboratoires.id"), nullable=True)
    equipe_id = Column(Integer, ForeignKey("equipes.id"), nullable=True)

    # Relations
    institution = relationship("Institution", foreign_keys=[institution_id])
    laboratoire_rel = relationship("Laboratoire", foreign_keys=[labo_id])
    equipe_rel = relationship("Equipe", foreign_keys=[equipe_id])
    
    publications = relationship("Publication", back_populates="owner")
    rapports = relationship("Rapport", back_populates="author")

    @property
    def institution_name(self):
        return self.institution.nom if self.institution else None

    @property
    def labo_name(self):
        return self.laboratoire_rel.nom if self.laboratoire_rel else None

    @property
    def equipe_name(self):
        return self.equipe_rel.nom if self.equipe_rel else None

class Publication(Base):
    __tablename__ = "publications"
    
    id = Column(Integer, primary_key=True, index=True)
    openalex_id = Column(String(100), unique=True, nullable=False)
    title = Column(Text, nullable=False)
    doi = Column(String(255), nullable=True)
    publication_year = Column(Integer, nullable=True)
    cited_by_count = Column(Integer, default=0)
    type = Column(String(50), nullable=True)
    
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="publications")
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Rapport(Base):
    __tablename__ = "rapports"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    
    author = relationship("User", back_populates="rapports")
    institution = relationship("Institution")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    user_rel = relationship("User", backref="notifications")
