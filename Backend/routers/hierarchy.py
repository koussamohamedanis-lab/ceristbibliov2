from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Institution, Laboratoire, Equipe, User, Publication, UserRole
from services.isolation_service import get_user_institutions, get_user_laboratories, get_user_teams, check_can_access_institution
from routers import auth
from typing import List, Optional

router = APIRouter(prefix="/hierarchy", tags=["Hierarchy"])

# Get current user (optional - endpoints will work without auth but with limited data)
get_current_user = auth.get_current_user

# Helper function for optional auth
def optional_auth(token: Optional[str] = None) -> Optional[User]:
    """Optional authentication - returns user if valid token, None otherwise"""
    return None  # For now, just return None to allow public access

# ==================== TUTELLES ====================

@router.get("/tutelles")
def get_all_tutelles(db: Session = Depends(get_db)):
    """Lister toutes les tutelles"""
    tutelles = db.query(User).filter(User.role == UserRole.TUTELLE.value).all()
    return [{"id": t.id, "name": f"{t.prenom} {t.nom}", "email": t.email} for t in tutelles]

# ==================== INSTITUTIONS & DIRECTEURS ====================

@router.get("/institutions")
def get_all_institutions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lister les institutions accessibles par l'utilisateur"""
    institutions_query = get_user_institutions(current_user, db)
    institutions = institutions_query.all()
    
    result = []
    for inst in institutions:
        # Fallback: check if any director has this institution_id set
        directeur = db.query(User).filter(User.id == inst.directeur_id).first()
        if not directeur:
            directeur = db.query(User).filter(User.role == "directeur", User.institution_id == inst.id).first()
            
        result.append({
            "id": inst.id,
            "name": inst.nom,
            "ville": inst.ville,
            "tutelle_id": inst.tutelle_id,
            "directeur_id": directeur.id if directeur else inst.directeur_id,
            "directeur_name": f"{directeur.prenom} {directeur.nom}" if directeur else "Pas de directeur"
        })
    return result

@router.get("/institutions/{institution_id}")
def get_institution_details(institution_id: int, db: Session = Depends(get_db)):
    """Obtenir les détails d'une institution"""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    laboratories = db.query(Laboratoire).filter(Laboratoire.institution_id == inst.id).all()
    return {
        "id": inst.id,
        "name": inst.nom,
        "ville": inst.ville,
        "laboratoires": [
            {
                "id": lab.id,
                "name": lab.nom,
                "description": lab.description,
                "domaine": lab.domaine,
                "chef_labo_id": lab.chef_labo_id,
            }
            for lab in laboratories
        ]
    }


@router.get("/directors")
def get_all_directors(db: Session = Depends(get_db)):
    """Lister tous les directeurs (publicly accessible)"""
    try:
        # Public: show all directors
        directors = db.query(User).filter(User.role == "directeur").all()
        
        result = []
        for director in directors:
            # Fallback strategy: check explicitly assigned directeur_id OR fallback to director.institution_id
            institution = db.query(Institution).filter(Institution.directeur_id == director.id).first()
            if not institution and director.institution_id:
                institution = db.query(Institution).filter(Institution.id == director.institution_id).first()
                
            result.append({
                "id": director.id,
                "name": f"{director.prenom} {director.nom}",
                "email": director.email,
                "institution_id": institution.id if institution else None,
                "institution_name": institution.nom if institution else "Pas d'institution",
            })
        return result
    except Exception as e:
        print(f"[ERROR] get_all_directors: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/directors/{director_id}")
def get_director_details(director_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Obtenir les détails d'un directeur avec ses laboratoires"""
    director = db.query(User).filter(User.id == director_id, User.role == UserRole.DIRECTEUR.value).first()
    if not director:
        raise HTTPException(status_code=404, detail="Directeur non trouvé")
    
    # Check access - tutelle can access if director's institution is theirs
    if current_user.role == "tutelle":
        institution = db.query(Institution).filter(Institution.directeur_id == director_id).first()
        if not institution or institution.tutelle_id != current_user.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
    elif current_user.role == "directeur":
        if current_user.id != director_id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez voir que votre propre profil")
    else:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    institution = db.query(Institution).filter(Institution.directeur_id == director_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution non trouvée")
    
    laboratories = db.query(Laboratoire).filter(Laboratoire.institution_id == institution.id).all()
    
    return {
        "id": director.id,
        "name": f"{director.prenom} {director.nom}",
        "email": director.email,
        "institution": {
            "id": institution.id,
            "name": institution.nom,
            "ville": institution.ville,
        },
        "laboratoires": [
            {
                "id": lab.id,
                "name": lab.nom,
                "description": lab.description,
                "domaine": lab.domaine,
                "chef_labo_id": lab.chef_labo_id,
            }
            for lab in laboratories
        ],
    }

@router.get("/institutions/{institution_id}/advanced-mapping")
def get_institution_advanced_mapping(institution_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Advanced bibliometric mapping for entire institution (Radar, Thematic, etc.)"""
    # 1. Access Check
    if current_user.role == "directeur" and current_user.institution_id != institution_id:
        # Fallback check if they are the official director of that inst
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if not inst or inst.directeur_id != current_user.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
            
    # 2. Get all researchers in this institution
    members = db.query(User).filter(User.institution_id == institution_id).all()
    member_ids = [m.id for m in members]
    
    # 3. Get all publications
    from models import Publication
    pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
    
    # 4. Prepare data for Bibliometrix
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



# ==================== TUTELLE FULL HIERARCHY ====================

@router.get("/tutelle/full-hierarchy")
def get_tutelle_full_hierarchy(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retourner l'arborescence complète pour un utilisateur Tutelle:
    Tutelle -> Institutions -> (Directeur + Laboratoires -> Équipes -> Chercheurs)
    """
    if current_user.role not in ["tutelle", "directeur"]:
        raise HTTPException(status_code=403, detail="Accès réservé aux tutelles et directeurs")
    
    if current_user.role == "directeur":
        # Directeur: only their own institution
        institution = db.query(Institution).filter(
            (Institution.directeur_id == current_user.id) | (Institution.id == current_user.institution_id)
        ).first()
        
        if not institution:
            return {"tutelle_name": "N/A", "institutions": []}
        
        institutions_list = [institution]
        tutelle_name = "Directeur"
    else:
        # Tutelle: all institutions under their command
        institutions_list = db.query(Institution).filter(
            Institution.tutelle_id == current_user.id
        ).all()
        tutelle_name = f"{current_user.prenom} {current_user.nom}"
    
    result_institutions = []
    total_labs = 0
    total_teams = 0
    total_researchers = 0
    
    for inst in institutions_list:
        # Get director
        directeur = db.query(User).filter(User.id == inst.directeur_id).first()
        if not directeur:
            directeur = db.query(User).filter(User.role == "directeur", User.institution_id == inst.id).first()
        
        # Get laboratories
        laboratories = db.query(Laboratoire).filter(Laboratoire.institution_id == inst.id).all()
        labs_data = []
        
        for lab in laboratories:
            # Get chef labo
            chef_labo = db.query(User).filter(User.id == lab.chef_labo_id).first()
            
            # Get teams in this lab
            equipes = db.query(Equipe).filter(Equipe.labo_id == lab.id).all()
            teams_data = []
            lab_researcher_count = 0
            
            for eq in equipes:
                # Get chef equipe
                chef_equipe = db.query(User).filter(User.id == eq.chef_equipe_id).first()
                
                # Get researchers in this team
                members = db.query(User).filter(
                    User.equipe_id == eq.id,
                    User.role.in_(["chercheur", "chef_equipe"])
                ).all()
                
                lab_researcher_count += len(members)
                
                teams_data.append({
                    "id": eq.id,
                    "name": eq.nom,
                    "description": eq.description,
                    "chef_equipe": f"{chef_equipe.prenom} {chef_equipe.nom}" if chef_equipe else None,
                    "researcher_count": len(members),
                    "researchers": [
                        {
                            "id": m.id,
                            "name": f"{m.prenom} {m.nom}",
                            "role": m.role,
                            "email": m.email
                        }
                        for m in members
                    ]
                })
            
            total_teams += len(equipes)
            total_researchers += lab_researcher_count
            
            labs_data.append({
                "id": lab.id,
                "name": lab.nom,
                "description": lab.description,
                "domaine": lab.domaine,
                "chef_labo": f"{chef_labo.prenom} {chef_labo.nom}" if chef_labo else None,
                "team_count": len(equipes),
                "researcher_count": lab_researcher_count,
                "teams": teams_data
            })
        
        total_labs += len(laboratories)
        
        result_institutions.append({
            "id": inst.id,
            "name": inst.nom,
            "ville": inst.ville,
            "directeur": f"{directeur.prenom} {directeur.nom}" if directeur else None,
            "directeur_id": directeur.id if directeur else None,
            "lab_count": len(laboratories),
            "laboratories": labs_data
        })
    
    return {
        "tutelle_name": tutelle_name,
        "tutelle_role": current_user.role,
        "total_institutions": len(result_institutions),
        "total_laboratories": total_labs,
        "total_teams": total_teams,
        "total_researchers": total_researchers,
        "institutions": result_institutions
    }


# ==================== LABORATOIRES ====================

@router.get("/laboratories")
def get_all_laboratories(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lister les laboratoires accessibles par l'utilisateur"""
    try:
        labs_query = get_user_laboratories(current_user, db)
        laboratories = labs_query.all()
        
        return [
            {
                "id": lab.id,
                "name": lab.nom,
                "description": lab.description,
                "domaine": lab.domaine,
                "institution_id": lab.institution_id,
                "chef_labo_id": lab.chef_labo_id,
            }
            for lab in laboratories
        ]
    except Exception as e:
        print(f"[ERROR] get_all_laboratories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/laboratories/{lab_id}")
def get_laboratory_details(lab_id: int, db: Session = Depends(get_db)):
    """Obtenir les détails d'un laboratoire avec ses équipes et statistiques"""
    lab = db.query(Laboratoire).filter(Laboratoire.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratoire non trouvé")
    
    equipes = db.query(Equipe).filter(Equipe.labo_id == lab_id).all()
    
    # Récupérer les chercheurs du labo via les équipes
    total_researchers = db.query(User).filter(
        User.labo_id == lab_id,
        User.role == UserRole.CHERCHEUR.value
    ).count()
    
    # Statistiques du labo
    publications = db.query(Publication).join(User).filter(User.labo_id == lab_id).all()
    total_publications = len(publications)
    total_citations = sum([p.cited_by_count for p in publications])
    
    return {
        "id": lab.id,
        "name": lab.nom,
        "description": lab.description,
        "domaine": lab.domaine,
        "institution_id": lab.institution_id,
        "chef_labo_id": lab.chef_labo_id,
        "equipes": [
            {
                "id": eq.id,
                "name": eq.nom,
                "description": eq.description,
                "chef_equipe_id": eq.chef_equipe_id,
            }
            for eq in equipes
        ],
        "total_researchers": total_researchers,
        "total_publications": total_publications,
        "total_citations": total_citations,
    }

@router.get("/laboratories/{lab_id}/advanced-mapping")
def get_lab_advanced_mapping(lab_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Advanced bibliometric mapping for laboratory (Radar, Thematic, etc.)"""
    # 1. Access Check
    if current_user.role == "chef_labo" and current_user.labo_id != lab_id:
        raise HTTPException(status_code=403, detail="Accès refusé")
    
    lab = db.query(Laboratoire).filter(Laboratoire.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratoire non trouvé")
    
    # 2. Get all researchers in this lab
    members = db.query(User).filter(User.labo_id == lab_id).all()
    member_ids = [m.id for m in members]
    
    # 3. Get all publications
    from models import Publication
    pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
    
    # 4. Prepare data for Bibliometrix
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


@router.get("/labos/me/stats")
def get_my_lab_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """API Routes : Créer des points de terminaison (endpoints) qui respectent le scope de chaque rôle (ex: /labos/me/stats)."""
    if current_user.role not in [UserRole.CHEF_LABO.value, UserRole.CHERCHEUR.value, UserRole.CHEF_EQUIPE.value]:
        raise HTTPException(status_code=403, detail="Vous n'avez pas de laboratoire rattaché ou rôle non autorisé.")
    
    lab_id = current_user.labo_id
    if current_user.equipe_id and not lab_id:
        equipe = db.query(Equipe).filter(Equipe.id == current_user.equipe_id).first()
        if equipe:
            lab_id = equipe.labo_id

    if not lab_id:
        raise HTTPException(status_code=404, detail="Aucun laboratoire associé à ce compte.")

    return get_laboratory_statistics(lab_id, db=db)



@router.post("/laboratories")
def create_laboratory(
    nom: str,
    institution_id: int,
    description: str = None,
    domaine: str = None,
    chef_labo_id: int = None,
    db: Session = Depends(get_db)
):
    """Créer un laboratoire"""
    lab = Laboratoire(
        nom=nom,
        institution_id=institution_id,
        description=description,
        domaine=domaine,
        chef_labo_id=chef_labo_id,
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return lab


# ==================== ÉQUIPES ====================

@router.get("/teams")
def get_all_teams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Lister les équipes accessibles par l'utilisateur"""
    teams_query = get_user_teams(current_user, db)
    equipes = teams_query.all()
    return [
        {
            "id": eq.id,
            "name": eq.nom,
            "description": eq.description,
            "labo_id": eq.labo_id,
            "chef_equipe_id": eq.chef_equipe_id,
        }
        for eq in equipes
    ]


@router.get("/teams/{team_id}")
def get_team_details(team_id: int, db: Session = Depends(get_db)):
    """Obtenir les détails d'une équipe avec ses chercheurs et statistiques"""
    equipe = db.query(Equipe).filter(Equipe.id == team_id).first()
    if not equipe:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    
    members = db.query(User).filter(User.equipe_id == team_id).all()
    members_data = []
    for m in members:
        m_citations = db.query(func.sum(Publication.cited_by_count)).filter(Publication.user_id == m.id).scalar() or 0
        members_data.append({
            "id": m.id,
            "nom": m.nom,
            "prenom": m.prenom,
            "email": m.email,
            "role": m.role,
            "total_citations": m_citations
        })
    
    # Statistiques de l'équipe
    publications = db.query(Publication).join(User).filter(User.equipe_id == team_id).all()
    total_publications = len(publications)
    total_citations = sum([(p.cited_by_count or 0) for p in publications])
    
    return {
        "id": equipe.id,
        "name": equipe.nom,
        "chercheurs": members_data,
        "total_publications": total_publications,
        "total_citations": total_citations
    }


@router.post("/teams")
def create_team(
    nom: str,
    labo_id: int,
    description: str = None,
    chef_equipe_id: int = None,
    db: Session = Depends(get_db)
):
    """Créer une équipe"""
    equipe = Equipe(
        nom=nom,
        labo_id=labo_id,
        description=description,
        chef_equipe_id=chef_equipe_id,
    )
    db.add(equipe)
    db.commit()
    db.refresh(equipe)
    return equipe


# ==================== STATISTIQUES AGRÉGÉES ====================

@router.get("/statistics/director/{director_id}")
def get_director_statistics(director_id: int, db: Session = Depends(get_db)):
    """Obtenir les statistiques agrégées pour un directeur"""
    user = db.query(User).filter(User.id == director_id).first()
    if not user:
         raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
         
    institution = db.query(Institution).filter(
        (Institution.directeur_id == director_id) | (Institution.id == user.institution_id)
    ).first()
    
    if not institution:
        # Fallback if no institution linked, show only director's own stats or zeros
        return {
            "total_researchers": 0,
            "total_publications": 0,
            "total_citations": 0,
            "avg_h_index": 0,
            "publication_by_year": [],
        }
    
    # Tout chercheur rattaché à cette institution
    researchers = db.query(User).filter(
        User.institution_id == institution.id,
        User.role.in_([UserRole.CHERCHEUR.value, "chercheur", UserRole.CHEF_EQUIPE.value, "chef_equipe"])
    ).all()
    
    # Publications et citations filtrées par institution
    publications = db.query(Publication).join(User).filter(
        User.institution_id == institution.id
    ).all()
    
    total_publications = len(publications)
    total_citations = sum([(p.cited_by_count or 0) for p in publications])
    
    # Vrai H-index global via Bibliometrix
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "cited_by_count": p.cited_by_count or 0,
            "publication_year": p.publication_year,
            "user_id": p.user_id,
        }
        for p in publications
    ]
    from services.bibliometrix import calculate_group_h_index
    stats = {"h_index": 0}
    if pub_dicts:
        stats = calculate_group_h_index(pub_dicts)
    avg_h_index = stats.get("h_index", 0)
    
    # Evolution par année via Bibliometrix
    pub_by_year_raw = stats.get("publications_by_year", [])
    
    return {
        "total_researchers": len(researchers),
        "total_publications": stats.get("total_publications", total_publications),
        "total_citations": stats.get("total_citations", total_citations),
        "avg_h_index": round(avg_h_index, 2),
        "publication_by_year": pub_by_year_raw,
    }


@router.get("/statistics/laboratory/{lab_id}")
def get_laboratory_statistics(lab_id: int, db: Session = Depends(get_db)):
    """Obtenir les statistiques agrégées pour un laboratoire"""
    lab = db.query(Laboratoire).filter(Laboratoire.id == lab_id).first()
    if not lab:
        raise HTTPException(status_code=404, detail="Laboratoire non trouvé")
    
    # Count ALL members in the lab
    members = db.query(User).filter(
        User.labo_id == lab_id,
        User.role.in_(["chercheur", "chef_equipe", "chef_labo"])
    ).all()
    
    # Count teams
    teams_count = db.query(Equipe).filter(Equipe.labo_id == lab_id).count()
    
    publications = db.query(Publication).join(User).filter(User.labo_id == lab_id).all()
    total_publications = len(publications)
    total_citations = sum([(p.cited_by_count or 0) for p in publications])
    
    # Vrai H-index global via Bibliometrix
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "cited_by_count": p.cited_by_count or 0,
            "publication_year": p.publication_year,
            "user_id": p.user_id,
        }
        for p in publications
    ]
    from services.bibliometrix import calculate_group_h_index
    stats = {"h_index": 0}
    if pub_dicts:
        stats = calculate_group_h_index(pub_dicts)
    avg_h_index = stats.get("h_index", 0)
    
    # Evolution par année via Bibliometrix
    pub_by_year_raw = stats.get("publications_by_year", [])
    
    return {
        "id": lab.id,
        "name": lab.nom,
        "teams_count": teams_count,
        "members_count": len(members),
        "total_publications": stats.get("total_publications", total_publications),
        "total_citations": stats.get("total_citations", total_citations),
        "avg_h_index": round(avg_h_index, 2),
        "publication_by_year": pub_by_year_raw,
    }


@router.get("/statistics/team/{team_id}")
def get_team_statistics(team_id: int, db: Session = Depends(get_db)):
    """Obtenir les statistiques agrégées pour une équipe"""
    equipe = db.query(Equipe).filter(Equipe.id == team_id).first()
    if not equipe:
        raise HTTPException(status_code=404, detail="Équipe non trouvée")
    
    # Count ALL members in the team
    members = db.query(User).filter(
        User.equipe_id == team_id,
        User.role.in_(["chercheur", "chef_equipe"])
    ).all()
    
    publications = db.query(Publication).join(User).filter(User.equipe_id == team_id).all()
    total_publications = len(publications)
    total_citations = sum([(p.cited_by_count or 0) for p in publications])
    
    # Vrai H-index global via Bibliometrix
    pub_dicts = [
        {
            "openalex_id": p.openalex_id,
            "title": p.title,
            "cited_by_count": p.cited_by_count or 0,
            "publication_year": p.publication_year,
            "user_id": p.user_id,
        }
        for p in publications
    ]
    from services.bibliometrix import calculate_group_h_index
    stats = {"h_index": 0}
    if pub_dicts:
        stats = calculate_group_h_index(pub_dicts)
    avg_h_index = stats.get("h_index", 0)
    
    # Evolution par année via Bibliometrix
    pub_by_year_raw = stats.get("publications_by_year", [])
    
    return {
        "id": equipe.id,
        "name": equipe.nom,
        "total_researchers": len(members),
        "members_count": len(members),
        "total_publications": stats.get("total_publications", total_publications),
        "total_citations": stats.get("total_citations", total_citations),
        "avg_h_index": round(avg_h_index, 2),
        "publication_by_year": pub_by_year_raw,
    }


# ==================== STATISTIQUES GLOBALES ====================

@router.get("/statistics/global")
def get_global_statistics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Obtenir les statistiques globales dynamiquement scopées selon le rôle de l'utilisateur."""
    try:
        role = current_user.role
        
        if role in [UserRole.TUTELLE.value, "tutelle"]:
            inst_ids = [inst.id for inst in db.query(Institution).filter(Institution.tutelle_id == current_user.id).all()]
            researchers = db.query(User).filter(User.institution_id.in_(inst_ids)).all()
            publications = db.query(Publication).join(User).filter(User.institution_id.in_(inst_ids)).all()
            labs = db.query(Laboratoire).filter(Laboratoire.institution_id.in_(inst_ids)).all()
            teams = db.query(Equipe).join(Laboratoire).filter(Laboratoire.institution_id.in_(inst_ids)).all()
            
            director_ids_from_inst = [inst.directeur_id for inst in db.query(Institution).filter(Institution.tutelle_id == current_user.id).all() if inst.directeur_id is not None]
            total_directors = db.query(User).filter(
                User.role == "directeur",
                (User.institution_id.in_(inst_ids)) | (User.id.in_(director_ids_from_inst))
            ).count()
            
        elif role == "directeur":
            inst_id = current_user.institution_id
            researchers = db.query(User).filter(User.institution_id == inst_id).all()
            publications = db.query(Publication).join(User).filter(User.institution_id == inst_id).all()
            labs = db.query(Laboratoire).filter(Laboratoire.institution_id == inst_id).all()
            teams = db.query(Equipe).join(Laboratoire).filter(Laboratoire.institution_id == inst_id).all()
            total_directors = 1
            
        elif role == "chef_labo":
            lab_id = current_user.labo_id
            researchers = db.query(User).filter(User.labo_id == lab_id).all()
            publications = db.query(Publication).join(User).filter(User.labo_id == lab_id).all()
            labs = db.query(Laboratoire).filter(Laboratoire.id == lab_id).all()
            teams = db.query(Equipe).filter(Equipe.labo_id == lab_id).all()
            total_directors = 0
            
        elif role == "chef_equipe":
            equip_id = current_user.equipe_id
            researchers = db.query(User).filter(User.equipe_id == equip_id).all()
            publications = db.query(Publication).join(User).filter(User.equipe_id == equip_id).all()
            labs = []
            teams = db.query(Equipe).filter(Equipe.id == equip_id).all()
            total_directors = 0
            
        else: # chercheur
            researchers = [current_user]
            publications = db.query(Publication).filter(Publication.user_id == current_user.id).all()
            labs = []
            teams = []
            total_directors = 0
            
        total_laboratories = len(labs)
        total_teams = len(teams)
        total_researchers = len(researchers)
        total_publications = len(publications)
        total_citations = sum([(p.cited_by_count or 0) for p in publications])
        
        # Vrai H-index global via Bibliometrix
        pub_dicts = [
            {
                "openalex_id": p.openalex_id,
                "title": p.title,
                "cited_by_count": p.cited_by_count or 0,
                "publication_year": p.publication_year,
                "user_id": p.user_id,
            }
            for p in publications
        ]
        from services.bibliometrix import calculate_group_h_index
        stats = {"h_index": 0}
        if pub_dicts:
            stats = calculate_group_h_index(pub_dicts)
        avg_h_index = stats.get("h_index", 0)

        return {
            "total_laboratories": total_laboratories,
            "total_teams": total_teams,
            "total_researchers": total_researchers,
            "total_publications": stats.get("total_publications", total_publications),
            "total_citations": stats.get("total_citations", total_citations),
            "avg_h_index": round(avg_h_index, 2),
            "total_directors": total_directors
        }
    except Exception as e:
        print(f"[ERROR] get_global_statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics/global-advanced-mapping")
def get_global_advanced_mapping(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Advanced bibliometric mapping dynamically scoped to the user's role"""
    try:
        role = current_user.role
        
        entities = []
        user_to_entity_map = {}
        
        if role in [UserRole.TUTELLE.value, "tutelle"]:
            institutions = db.query(Institution).filter(Institution.tutelle_id == current_user.id).all()
            entities = [{"id": i.id, "nom": i.nom, "prenom": "Institution", "role": "institution"} for i in institutions]
            inst_ids = [i.id for i in institutions]
            members = db.query(User).filter(User.institution_id.in_(inst_ids)).all()
            for m in members:
                user_to_entity_map[m.id] = m.institution_id

        elif role == "directeur":
            laboratoires = db.query(Laboratoire).filter(Laboratoire.institution_id == current_user.institution_id).all()
            entities = [{"id": l.id, "nom": l.nom, "prenom": "Labo", "role": "laboratoire"} for l in laboratoires]
            members = db.query(User).filter(User.institution_id == current_user.institution_id).all()
            for m in members:
                user_to_entity_map[m.id] = m.labo_id

        elif role == "chef_labo":
            equipes = db.query(Equipe).filter(Equipe.labo_id == current_user.labo_id).all()
            entities = [{"id": e.id, "nom": e.nom, "prenom": "Équipe", "role": "equipe"} for e in equipes]
            members = db.query(User).filter(User.labo_id == current_user.labo_id).all()
            for m in members:
                user_to_entity_map[m.id] = m.equipe_id

        elif role == "chef_equipe":
            members = db.query(User).filter(User.equipe_id == current_user.equipe_id).all()
            entities = [{"id": m.id, "nom": m.nom, "prenom": m.prenom, "role": m.role} for m in members]
            for m in members:
                user_to_entity_map[m.id] = m.id

        else: # chercheur
            members = [current_user]
            entities = [{"id": current_user.id, "nom": current_user.nom, "prenom": current_user.prenom, "role": current_user.role}]
            user_to_entity_map[current_user.id] = current_user.id
            
        member_ids = [m.id for m in members]
        pubs = db.query(Publication).filter(Publication.user_id.in_(member_ids)).all()
        
        pub_dicts = [
            {
                "openalex_id": p.openalex_id,
                "title": p.title,
                "cited_by_count": p.cited_by_count or 0,
                "publication_year": p.publication_year,
                # Link the publication to the hierarchical entity instead of the individual user
                "user_id": user_to_entity_map.get(p.user_id), 
            }
            for p in pubs
        ]
        
        from services.bibliometrix import generate_advanced_mapping
        if not pubs:
            return {"radar": [], "thematic": []}
            
        return generate_advanced_mapping(entities, pub_dicts)
    except Exception as e:
        print(f"[ERROR] get_global_advanced_mapping: {e}")
        return {"radar": [], "thematic": []}



# ==================== RECHERCHE ====================

@router.get("/search")
def search_hierarchy(
    q: str = Query(..., min_length=1), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rechercher dans la hiérarchie (laboratoires, équipes, chercheurs) avec scoping par rôle
    """
    results = {
        "laboratories": [],
        "teams": [],
        "researchers": [],
    }
    
    # 1. Base queries for Labs
    labs_query = db.query(Laboratoire).filter(Laboratoire.nom.ilike(f"%{q}%"))
    if current_user.role == "directeur":
        labs_query = labs_query.filter(Laboratoire.institution_id == current_user.institution_id)
    elif current_user.role == "chef_labo":
        labs_query = labs_query.filter(Laboratoire.id == current_user.labo_id)
    
    labs = labs_query.all()
    results["laboratories"] = [
        {"id": lab.id, "name": lab.nom, "domaine": lab.domaine, "type": "lab"}
        for lab in labs
    ]
    
    # 2. Base queries for Teams
    teams_query = db.query(Equipe).filter(Equipe.nom.ilike(f"%{q}%"))
    if current_user.role == "directeur":
        teams_query = teams_query.join(Laboratoire).filter(Laboratoire.institution_id == current_user.institution_id)
    elif current_user.role == "chef_labo":
        teams_query = teams_query.filter(Equipe.labo_id == current_user.labo_id)
    
    teams = teams_query.all()
    results["teams"] = [
        {"id": team.id, "name": team.nom, "type": "team"}
        for team in teams
    ]
    
    # 3. Base queries for Researchers
    res_query = db.query(User).filter(
        User.role.in_(["chercheur", "chef_equipe"]),
        (User.nom.ilike(f"%{q}%") | User.prenom.ilike(f"%{q}%"))
    )
    if current_user.role == "directeur":
        res_query = res_query.filter(User.institution_id == current_user.institution_id)
    elif current_user.role == "chef_labo":
        res_query = res_query.filter(User.labo_id == current_user.labo_id)
        
    researchers = res_query.all()
    results["researchers"] = [
        {"id": r.id, "name": f"{r.prenom} {r.nom}", "email": r.email, "type": "researcher"}
        for r in researchers
    ]
    
    return results

@router.get("/laboratories/{lab_id}/teams-comparison")
def get_lab_teams_comparison(lab_id: int, db: Session = Depends(get_db)):
    """Obtenir une comparaison statistique des équipes au sein d'un laboratoire avec Bibliometrix"""
    equipes = db.query(Equipe).filter(Equipe.labo_id == lab_id).all()
    
    from services.bibliometrix import calculate_group_h_index
    
    result = []
    for eq in equipes:
        # Researchers in team
        researchers = db.query(User).filter(User.equipe_id == eq.id).all()
        researcher_ids = [r.id for r in researchers]
        
        # Publications
        pubs = db.query(Publication).filter(Publication.user_id.in_(researcher_ids)).all() if researcher_ids else []
        
        # Format for bibliometrix calculation
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
        
        stats = {"h_index": 0, "g_index": 0, "i10_index": 0, "total_publications": len(pubs), "total_citations": sum([(p.cited_by_count or 0) for p in pubs])}
        if pub_dicts:
            stats = calculate_group_h_index(pub_dicts)
            
        result.append({
            "id": eq.id,
            "name": eq.nom,
            "total_publications": stats.get("total_publications", len(pubs)),
            "total_citations": stats.get("total_citations", 0),
            "avg_h_index": stats.get("h_index", 0),  # On garde la clé "avg_h_index" pour la compatibilité front, mais c'est le vrai H-Index
            "g_index": stats.get("g_index", 0),
            "i10_index": stats.get("i10_index", 0),
            "nb_researchers": len(researchers)
        })
        
    return result

@router.get("/institutions/{institution_id}/laboratories-comparison")
def get_inst_laboratories_comparison(institution_id: int, db: Session = Depends(get_db)):
    """Obtenir une comparaison statistique des laboratoires au sein d'une institution avec Bibliometrix"""
    laboratoires = db.query(Laboratoire).filter(Laboratoire.institution_id == institution_id).all()
    
    from services.bibliometrix import calculate_group_h_index
    
    result = []
    for lab in laboratoires:
        # Researchers in lab
        researchers = db.query(User).filter(User.labo_id == lab.id).all()
        researcher_ids = [r.id for r in researchers]
        
        # Publications
        pubs = db.query(Publication).filter(Publication.user_id.in_(researcher_ids)).all() if researcher_ids else []
        
        # Format for bibliometrix calculation
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
        
        stats = {"h_index": 0, "g_index": 0, "i10_index": 0, "total_publications": len(pubs), "total_citations": sum([(p.cited_by_count or 0) for p in pubs])}
        if pub_dicts:
            stats = calculate_group_h_index(pub_dicts)
            
        result.append({
            "id": lab.id,
            "name": lab.nom,
            "total_publications": stats.get("total_publications", len(pubs)),
            "total_citations": stats.get("total_citations", 0),
            "avg_h_index": stats.get("h_index", 0),
            "g_index": stats.get("g_index", 0),
            "i10_index": stats.get("i10_index", 0),
            "nb_researchers": len(researchers)
        })
        
    return result

