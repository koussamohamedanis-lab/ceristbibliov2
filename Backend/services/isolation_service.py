"""
Data isolation and authorization helpers for Tutelle-based access control
"""
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import User, Institution, Laboratoire, Equipe

def get_user_tutelle_id(user: User, db: Session) -> int:
    """
    Get the tutelle_id for a user based on their role and organizational hierarchy.
    
    - Tutelle users: Use their own tutelle relationship if they're linked
    - Directeur: Get tutelle from their institution
    - Chef Labo: Get tutelle from their lab->institution
    - Chef Équipe: Get tutelle from their team->lab->institution
    - Chercheur: Get tutelle from their institution or team->lab->institution
    """
    if user.role == "tutelle":
        # Tutelle users are roots - they manage specific institutions
        # Return None or a special tutelle_id if they have one
        return getattr(user, 'tutelle_id', None)
    
    if user.role == "directeur":
        # Get tutelle from their institution
        if user.institution_id:
            inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
            return inst.tutelle_id if inst else None
    
    if user.role == "chef_labo":
        # Get tutelle from lab->institution
        if user.labo_id:
            lab = db.query(Laboratoire).filter(Laboratoire.id == user.labo_id).first()
            if lab:
                inst = db.query(Institution).filter(Institution.id == lab.institution_id).first()
                return inst.tutelle_id if inst else None
    
    if user.role == "chef_equipe" or user.role == "chercheur":
        # Get tutelle from team->lab->institution or directly from institution
        if user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
            if team:
                lab = db.query(Laboratoire).filter(Laboratoire.id == team.labo_id).first()
                if lab:
                    inst = db.query(Institution).filter(Institution.id == lab.institution_id).first()
                    return inst.tutelle_id if inst else None
        
        if user.institution_id:
            inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
            return inst.tutelle_id if inst else None
    
    return None


def get_user_institutions(user: User, db: Session):
    """
    Get all institutions visible to a user based on their role and tutelle.
    
    Returns a query object that filters institutions appropriately.
    """
    if user.role == "tutelle":
        # Tutelle sees all institutions they manage
        return db.query(Institution).filter(
            Institution.tutelle_id == user.id
        )
    
    if user.role == "directeur":
        # Directeur sees their own institution
        if user.institution_id:
            return db.query(Institution).filter(Institution.id == user.institution_id)
        return db.query(Institution).filter(Institution.id == None)  # No access
    
    if user.role == "chef_labo":
        # Chef de labo sees their institution
        if user.labo_id:
            lab = db.query(Laboratoire).filter(Laboratoire.id == user.labo_id).first()
            if lab:
                return db.query(Institution).filter(Institution.id == lab.institution_id)
        return db.query(Institution).filter(Institution.id == None)  # No access
    
    # Chef équipe and Chercheur don't have institution-level access
    return db.query(Institution).filter(Institution.id == None)


def get_user_laboratories(user: User, db: Session):
    """
    Get all laboratories visible to a user based on their role and scope.
    """
    if user.role == "tutelle":
        # Tutelle sees all labs in their institutions
        tutelle_id = user.id
        return db.query(Laboratoire).join(Institution).filter(
            Institution.tutelle_id == tutelle_id
        )
    
    if user.role == "directeur":
        # Directeur sees all labs in their institution
        if user.institution_id:
            return db.query(Laboratoire).filter(
                Laboratoire.institution_id == user.institution_id
            )
        return db.query(Laboratoire).filter(Laboratoire.id == None)
    
    if user.role == "chef_labo":
        # Chef de labo sees only their lab
        if user.labo_id:
            return db.query(Laboratoire).filter(Laboratoire.id == user.labo_id)
        return db.query(Laboratoire).filter(Laboratoire.id == None)
    
    if user.role == "chef_equipe" or user.role == "chercheur":
        # Chercheur and chef équipe see their lab (if they have one)
        if user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
            if team:
                return db.query(Laboratoire).filter(Laboratoire.id == team.labo_id)
        if user.labo_id:
            return db.query(Laboratoire).filter(Laboratoire.id == user.labo_id)
        return db.query(Laboratoire).filter(Laboratoire.id == None)
    
    return db.query(Laboratoire).filter(Laboratoire.id == None)


def get_user_teams(user: User, db: Session):
    """
    Get all teams visible to a user based on their role and scope.
    """
    if user.role == "tutelle":
        # Tutelle sees all teams in their institutions
        tutelle_id = user.id
        return db.query(Equipe).join(Laboratoire).join(Institution).filter(
            Institution.tutelle_id == tutelle_id
        )
    
    if user.role == "directeur":
        # Directeur sees all teams in their institution
        if user.institution_id:
            return db.query(Equipe).join(Laboratoire).filter(
                Laboratoire.institution_id == user.institution_id
            )
        return db.query(Equipe).filter(Equipe.id == None)
    
    if user.role == "chef_labo":
        # Chef de labo sees all teams in their lab
        if user.labo_id:
            return db.query(Equipe).filter(Equipe.labo_id == user.labo_id)
        return db.query(Equipe).filter(Equipe.id == None)
    
    if user.role == "chef_equipe":
        # Chef d'équipe sees only their team
        if user.equipe_id:
            return db.query(Equipe).filter(Equipe.id == user.equipe_id)
        return db.query(Equipe).filter(Equipe.id == None)
    
    if user.role == "chercheur":
        # Chercheur sees their team
        if user.equipe_id:
            return db.query(Equipe).filter(Equipe.id == user.equipe_id)
        return db.query(Equipe).filter(Equipe.id == None)
    
    return db.query(Equipe).filter(Equipe.id == None)


def get_user_researchers(user: User, db: Session):
    """
    Get all researchers (User objects with role=chercheur) visible to a user.
    """
    if user.role == "tutelle":
        # Tutelle sees all researchers in their institutions
        tutelle_id = user.id
        return db.query(User).filter(
            User.role.in_(["chercheur", "chef_equipe"]),
        ).join(Institution, Institution.id == User.institution_id).filter(
            Institution.tutelle_id == tutelle_id
        )
    
    if user.role == "directeur":
        # Directeur sees all researchers in their institution
        if user.institution_id:
            return db.query(User).filter(
                User.institution_id == user.institution_id,
                User.role.in_(["chercheur", "chef_equipe"])
            )
        return db.query(User).filter(User.id == None)
    
    if user.role == "chef_labo":
        # Chef de labo sees researchers in their lab
        if user.labo_id:
            return db.query(User).filter(
                User.labo_id == user.labo_id,
                User.role.in_(["chercheur", "chef_equipe"])
            )
        return db.query(User).filter(User.id == None)
    
    if user.role == "chef_equipe":
        # Chef d'équipe sees researchers in their team
        if user.equipe_id:
            return db.query(User).filter(
                User.equipe_id == user.equipe_id,
                User.role == "chercheur"
            )
        return db.query(User).filter(User.id == None)
    
    # Chercheur can't see other researchers
    return db.query(User).filter(User.id == None)


def check_can_access_institution(user: User, institution_id: int, db: Session) -> bool:
    """Check if user can access an institution"""
    if user.role == "tutelle":
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        return inst and inst.tutelle_id == user.id
    
    if user.role == "directeur":
        return user.institution_id == institution_id
    
    # Other roles check via their lab
    lab = db.query(Laboratoire).filter(Laboratoire.institution_id == institution_id).first()
    if not lab:
        return False
    
    return check_can_access_laboratory(user, lab.id, db)


def check_can_access_laboratory(user: User, labo_id: int, db: Session) -> bool:
    """Check if user can access a laboratory"""
    if user.role == "tutelle" or user.role == "directeur":
        lab = db.query(Laboratoire).filter(Laboratoire.id == labo_id).first()
        if not lab:
            return False
        return check_can_access_institution(user, lab.institution_id, db)
    
    if user.role == "chef_labo":
        return user.labo_id == labo_id
    
    # Chef équipe and Chercheur check via their team
    if user.equipe_id:
        team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
        if team:
            return team.labo_id == labo_id
    
    return user.labo_id == labo_id if user.labo_id else False


def check_can_access_team(user: User, equipe_id: int, db: Session) -> bool:
    """Check if user can access a team"""
    team = db.query(Equipe).filter(Equipe.id == equipe_id).first()
    if not team:
        return False
    
    if user.role == "tutelle" or user.role == "directeur":
        return check_can_access_laboratory(user, team.labo_id, db)
    
    if user.role == "chef_labo":
        return user.labo_id == team.labo_id
    
    if user.role == "chef_equipe":
        return user.equipe_id == equipe_id
    
    if user.role == "chercheur":
        return user.equipe_id == equipe_id
    
    return False
