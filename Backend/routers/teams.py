from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, Equipe, Publication
from routers import auth
from services.bibliometrix import calculate_group_h_index, calculate_bibliometrics

router = APIRouter(prefix="/api/teams", tags=["Teams"])
get_current_user = auth.get_current_user

@router.get("/{user_id}")
def get_my_team_members(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch all members of the team managed by the user_id (who must be CHEF_EQUIPE)"""
    # 1. Verify that the requested user_id is the current user or current user is higher level
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # 2. Find the team where this user is chef
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        # Fallback: maybe they are just a member, let's see their own team
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
    
    if not team:
        return [] # No team linked
        
    # 3. Return only researchers in that team (active only)
    members = db.query(User).filter(
        User.equipe_id == team.id, 
        User.role == "chercheur",
        User.is_active == True
    ).all()
    
    return [
        {
            "id": m.id,
            "nom": m.nom,
            "prenom": m.prenom,
            "email": m.email,
            "role": m.role
        }
        for m in members
    ]

@router.get("/{user_id}/statistics")
def get_team_stats(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Aggregate stats for the team managed by user_id — uses Bibliometrix for group H-index."""
    # 1. Access check
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # 2. Find internal team
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
    
    if not team:
        return {"publications_by_year": [], "total_publications": 0, "h_index": 0, "total_citations": 0}
    
    # 3. Get all members of this team
    members = db.query(User).filter(User.equipe_id == team.id).all()
    member_ids = [m.id for m in members]
    
    # 4. Get ALL publications from ALL team members
    pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
    
    # 5. Convert to dict format for Bibliometrix service
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "doi": p.doi,
            "publication_year": p.publication_year,
            "cited_by_count": p.cited_by_count or 0,
            "type": p.type,
        }
        for p in pubs
    ]
    
    # 6. Use Bibliometrix to calculate GROUP H-index (merged, no duplicates)
    biblio_result = calculate_group_h_index(pub_dicts)
    
    return {
        "team_name": team.nom,
        "team_id": team.id,
        "total_members": len(members),
        "total_publications": biblio_result["total_publications"],
        "total_citations": biblio_result["total_citations"],
        "h_index": biblio_result["h_index"],
        "avg_h_index": biblio_result["h_index"],  # For frontend compatibility
        "publications_by_year": biblio_result["publications_by_year"],
        "method": biblio_result["method"],
    }


@router.get("/{user_id}/bibliometrics")
def get_team_bibliometrics(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Extended bibliometric analysis for the team — H-index, G-index, i10-index via Bibliometrix."""
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
    
    if not team:
        return {"h_index": 0, "g_index": 0, "i10_index": 0, "total_publications": 0, "total_citations": 0}
    
    members = db.query(User).filter(User.equipe_id == team.id).all()
    member_ids = [m.id for m in members]
    pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
    
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "doi": p.doi,
            "publication_year": p.publication_year,
            "cited_by_count": p.cited_by_count or 0,
            "type": p.type,
        }
        for p in pubs
    ]
    
    # Full Bibliometrix analysis
    result = calculate_bibliometrics(pub_dicts)
    result["team_name"] = team.nom
    result["team_id"] = team.id
    result["total_members"] = len(members)
    
    return result

@router.get("/{user_id}/advanced-mapping")
def get_team_advanced_mapping(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Advanced bibliometric mapping (Radar, Network, Thematic, World) for the team."""
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.equipe_id:
            team = db.query(Equipe).filter(Equipe.id == user.equipe_id).first()
            
    if not team:
        from services.bibliometrix import generate_advanced_mapping
        return generate_advanced_mapping([], [])
        
    members = db.query(User).filter(User.equipe_id == team.id).all()
    member_ids = [m.id for m in members]
    pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
    
    member_dicts = [{"id": m.id, "nom": m.nom, "prenom": m.prenom, "role": m.role} for m in members]
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "cited_by_count": p.cited_by_count or 0,
            "publication_year": p.publication_year,
            "user_id": p.user_id,
        }
        for p in pubs
    ]
    
    from services.bibliometrix import generate_advanced_mapping
    return generate_advanced_mapping(member_dicts, pub_dicts)


# ==================== SEARCH & ADD TO TEAM ====================

@router.get("/{user_id}/search-researchers")
def search_researchers_for_team(
    user_id: int,
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search researchers (annuaire) that can be added to the team.
    
    Returns researchers in the same institution who are NOT already in any team,
    or who are in a different team (for transfer consideration).
    """
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Find the team
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Aucune équipe liée à cet utilisateur")
    
    from models import Laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == team.labo_id).first()
    institution_id = labo.institution_id if labo else None
    
    # Search by name or email within the same institution
    query = db.query(User).filter(
        User.is_active == True,
        User.role == "chercheur",
        (User.nom.ilike(f"%{q}%") | User.prenom.ilike(f"%{q}%") | User.email.ilike(f"%{q}%")),
    )
    
    # Scope to same institution
    if institution_id:
        query = query.filter(User.institution_id == institution_id)
    
    # Exclude users already in THIS team
    query = query.filter((User.equipe_id != team.id) | (User.equipe_id == None))
    
    researchers = query.limit(20).all()
    
    return [
        {
            "id": r.id,
            "nom": r.nom,
            "prenom": r.prenom,
            "email": r.email,
            "equipe_id": r.equipe_id,
            "current_team": r.equipe_rel.nom if r.equipe_rel else None,
        }
        for r in researchers
    ]


@router.post("/{user_id}/add-member/{researcher_id}")
def add_member_to_team(
    user_id: int,
    researcher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a researcher to the team managed by user_id."""
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    # Find the team
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Aucune équipe liée")
    
    # Find the researcher
    researcher = db.query(User).filter(User.id == researcher_id, User.role == "chercheur").first()
    if not researcher:
        raise HTTPException(status_code=404, detail="Chercheur non trouvé")
    
    # Assign to team
    researcher.equipe_id = team.id
    researcher.labo_id = team.labo_id
    
    from models import Laboratoire
    labo = db.query(Laboratoire).filter(Laboratoire.id == team.labo_id).first()
    if labo:
        researcher.institution_id = labo.institution_id
    
    db.commit()
    
    return {
        "message": f"{researcher.prenom} {researcher.nom} ajouté(e) à l'équipe {team.nom}",
        "success": True
    }


@router.post("/{user_id}/remove-member/{researcher_id}")
def remove_member_from_team(
    user_id: int,
    researcher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a researcher from the team (soft — sets equipe_id to null, not delete)."""
    if current_user.id != user_id and current_user.role not in ["tutelle", "directeur", "chef_labo"]:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    team = db.query(Equipe).filter(Equipe.chef_equipe_id == user_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Aucune équipe liée")
    
    researcher = db.query(User).filter(User.id == researcher_id, User.equipe_id == team.id).first()
    if not researcher:
        raise HTTPException(status_code=404, detail="Chercheur non trouvé dans cette équipe")
    
    researcher.equipe_id = None
    db.commit()
    
    return {
        "message": f"{researcher.prenom} {researcher.nom} retiré(e) de l'équipe",
        "success": True
    }
