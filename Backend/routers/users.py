from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, Publication
from services.openalex_service import OpenAlexClient, normalize_openalex_work, get_researcher_publications
from routers import auth
from passlib.context import CryptContext
from models import UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Import get_current_user from auth module
get_current_user = auth.get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])

# ===========================
# ROLE PERMISSION HELPERS
# ===========================

# Roles that each role is allowed to create
ALLOWED_CREATION_ROLES = {
    "tutelle": ["directeur", "chef_labo", "chef_equipe", "chercheur"],
    "directeur": ["chef_labo", "chef_equipe", "chercheur"],
    "chef_labo": ["chef_equipe", "chercheur"],
}

def _get_scoped_users(db: Session, current_user: User):
    """Return users scoped to the current user's hierarchy level."""
    if current_user.role == "tutelle":
        from models import Institution
        # Tutelle sees all users in THEIR institutions
        return db.query(User).join(Institution, User.institution_id == Institution.id).filter(
            Institution.tutelle_id == current_user.id
        ).all()
    elif current_user.role == "directeur":
        if not current_user.institution_id:
            return []
        # Directeur sees all users in their institution
        return db.query(User).filter(User.institution_id == current_user.institution_id).all()
    elif current_user.role == "chef_labo":
        if not current_user.labo_id:
            return []
        # Chef labo sees users in their lab
        # IMPORTANT: only return researchers and team chiefs
        return db.query(User).filter(
            User.labo_id == current_user.labo_id,
            User.role.in_(["chef_equipe", "chercheur"])
        ).all()
    return []


@router.get("/")
def list_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Récupérer la liste des utilisateurs (scopée selon le rôle)"""
    try:
        users = _get_scoped_users(db, current_user)
        users_data = []
        from models import Institution, Laboratoire, Equipe
        for user in users:
            inst = db.query(Institution).filter(Institution.id == user.institution_id).first() if user.institution_id else None
            lab = db.query(Laboratoire).filter(Laboratoire.id == user.labo_id).first() if user.labo_id else None
            eq = db.query(Equipe).filter(Equipe.id == user.equipe_id).first() if user.equipe_id else None
            
            users_data.append({
                "id": user.id,
                "nom": user.nom,
                "prenom": user.prenom,
                "email": user.email,
                "role": user.role,
                "institution_id": user.institution_id,
                "institution_name": inst.nom if inst else None,
                "labo_id": user.labo_id,
                "labo_name": lab.nom if lab else None,
                "equipe_id": user.equipe_id,
                "equipe_name": eq.nom if eq else None,
                "is_active": user.is_active
            })
            
        return {
            "data": users_data,
            "total": len(users_data)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/{user_id}/publications")
def get_user_publications(user_id: int, db: Session = Depends(get_db)):
    """Récupérer toutes les publications d'un utilisateur"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        # Récupérer les publications
        try:
            publications = db.query(Publication).filter(Publication.user_id == user_id).all()
        except:
            publications = []
        
        pub_list = []
        for pub in publications:
            try:
                pub_list.append({
                    "id": pub.id,
                    "title": getattr(pub, 'title', 'Unknown'),
                    "year": getattr(pub, 'publication_year', 2024),
                    "type": getattr(pub, 'type', 'Article') or "Article",
                    "citations_count": getattr(pub, 'cited_by_count', 0) or 0,
                    "doi": getattr(pub, 'doi', None),
                })
            except:
                continue
        
        return {
            "user_id": user_id,
            "total": len(pub_list),
            "publications": pub_list
        }
    except HTTPException:
        raise
    except:
        return {"user_id": user_id, "total": 0, "publications": []}


@router.get("/{user_id}/profiles")
def get_user_profiles(user_id: int, db: Session = Depends(get_db)):
    """Récupérer les profils externes d'un utilisateur"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        # Retourner les profils disponibles
        return {
            "user_id": user_id,
            "open_alex_id": getattr(user, 'author_id_openalex', None),
            "orcid": None,
            "pubmed_id": None,
            "scopus_id": None
        }
    except HTTPException:
        raise
    except:
        return {
            "user_id": user_id,
            "open_alex_id": None,
            "orcid": None,
            "pubmed_id": None,
            "scopus_id": None
        }


@router.get("/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """Récupérer les statistiques d'un utilisateur"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        try:
            publications = db.query(Publication).filter(Publication.user_id == user_id).all()
        except:
            publications = []
        
        # Use standard bibliometrix calculation for consistency
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
        stats = {"h_index": 0, "g_index": 0, "i10_index": 0, "publications_by_year": []}
        if pub_dicts:
            stats = calculate_group_h_index(pub_dicts)
        
        return {
            "user_id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": user.role,
            "h_index": stats.get("h_index", 0),
            "g_index": stats.get("g_index", 0),
            "i10_index": stats.get("i10_index", 0),
            "total_publications": stats.get("total_publications", len(pub_dicts)),
            "total_citations": stats.get("total_citations", 0),
            "publication_by_year": stats.get("publications_by_year", []),
            "openalex_id": user.author_id_openalex
        }
    except HTTPException:
        raise
    except:
        return {
            "user_id": user_id,
            "h_index": 0,
            "total_publications": 0,
            "total_citations": 0,
            "publications_by_year": {}
        }


@router.post("/{user_id}/sync-openalex")
async def sync_publications_from_openalex(user_id: int, db: Session = Depends(get_db)):
    """Synchroniser les publications depuis OpenAlex pour un utilisateur"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        print(f"[SYNC] Starting sync for user {user_id}: {user.nom} {user.prenom}")
        print(f"[SYNC] Current OpenAlex ID: {user.author_id_openalex}")
        
        # Si l'utilisateur a déjà un ID OpenAlex, l'utiliser
        author_ids = []
        if user.author_id_openalex:
            # Gérer plusieurs IDs (séparés par virgule)
            raw_ids = [i.strip() for i in user.author_id_openalex.split(",")]
            for raw_id in raw_ids:
                if "openalex.org" in raw_id:
                    author_ids.append(raw_id.split("/")[-1])
                else:
                    author_ids.append(raw_id)
            print(f"[SYNC] Using existing OpenAlex IDs: {author_ids}")
        else:
            # Chercher par nom complet
            full_name = f"{user.prenom} {user.nom}"
            print(f"[SYNC] No OpenAlex ID, searching by name: {full_name}")
            author_data = await OpenAlexClient.search_author_by_name(full_name)
            
            if not author_data:
                print("[SYNC] No author found on OpenAlex")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Auteur non trouvé sur OpenAlex"
                )
                
            author_ids.append(author_data.get("id", "").replace("https://openalex.org/", ""))
        
        if not author_ids:
            raise HTTPException(status_code=400, detail="Aucun identifiant OpenAlex valide trouvé.")
            
        print(f"[SYNC] Resolving works for OpenAlex IDs: {author_ids}")
        
        # Mettre à jour l'ID OpenAlex de l'utilisateur avec la bonne syntaxe unifiée
        user.author_id_openalex = ",".join([f"https://openalex.org/{i}" for i in author_ids])
        
        # Récupérer les publications pour TOUS les IDs fournis
        all_works = []
        for author_id in author_ids:
            print(f"[SYNC] Fetching works for author {author_id}")
            works = await OpenAlexClient.get_author_works(author_id)
            if works:
                all_works.extend(works)
                
        print(f"[SYNC] Found {len(all_works)} total works across all IDs")
        
        if not all_works:
            print("[SYNC] No works found")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Aucune publication trouvée sur OpenAlex pour ces IDs"
            )
        
        # Optimize by getting all existing publications in one query
        work_ids = [work.get("id", "").replace("https://openalex.org/", "") for work in all_works]
        existing_pubs = db.query(Publication).filter(Publication.openalex_id.in_(work_ids)).all()
        existing_map = {p.openalex_id: p for p in existing_pubs}
        
        added_count = 0
        for work in all_works:
            work_id = work.get("id", "").replace("https://openalex.org/", "")
            existing_pub = existing_map.get(work_id)
            
            if existing_pub:
                # Mettre à jour l'utilisateur associé
                existing_pub.user_id = user_id
                existing_pub.cited_by_count = work.get("cited_by_count", 0)
            else:
                # Créer une nouvelle publication
                normalized_work = normalize_openalex_work(work)
                publication = Publication(
                    user_id=user_id,
                    **normalized_work
                )
                db.add(publication)
                added_count += 1
        
        db.commit()
        db.refresh(user)
        
        # Récupérer les stats mises à jour
        publications = db.query(Publication).filter(Publication.user_id == user_id).all()
        total_publications = len(publications)
        total_citations = sum(pub.cited_by_count or 0 for pub in publications)
        
        h_index = 0
        if publications:
            citations = sorted([pub.cited_by_count or 0 for pub in publications], reverse=True)
            for i, citation_count in enumerate(citations, 1):
                if citation_count >= i:
                    h_index = i
        
        print(f"[SYNC] Success: {added_count} publications added/updated. New stats: H={h_index}, Citations={total_citations}")
        
        return {
            "success": True,
            "message": f"Synchronisation réussie: {added_count} publications ajoutées",
            "user_id": user_id,
            "openalex_id": ",".join(author_ids),
            "total_publications": total_publications,
            "total_citations": total_citations,
            "h_index": h_index
        }
    except HTTPException as e:
        print(f"[SYNC] HTTP Exception: {e.detail}")
        raise e
    except Exception as e:
        print(f"[SYNC] Unexpected Critical Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur inattendue: {str(e)}")

@router.post("/sync-openalex-bulk")
async def sync_all_users_from_openalex(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Synchronisation Globale pour la Tutelle ou le Directeur"""
    if current_user.role not in [UserRole.TUTELLE.value, UserRole.DIRECTEUR.value, "tutelle", "directeur"]:
        raise HTTPException(status_code=403, detail="Seuls la Tutelle et les Directeurs peuvent lancer la synchronisation globale.")
    
    # Récupérer les chercheurs concernés
    if current_user.role in [UserRole.TUTELLE.value, "tutelle"]:
        researchers = db.query(User).filter(User.role.in_([UserRole.CHERCHEUR.value, "chercheur"])).all()
    else:
        # Directeur: seulement les chercheurs de son institution
        researchers = db.query(User).filter(
            User.role.in_([UserRole.CHERCHEUR.value, "chercheur"]),
            User.institution_id == current_user.institution_id
        ).all()
        
    results = {"success": 0, "failed": 0, "details": []}
    
    for r in researchers:
        try:
            author_ids = []
            
            if r.author_id_openalex:
                raw_ids = [i.strip() for i in r.author_id_openalex.split(",")]
                for raw_id in raw_ids:
                    if "openalex.org" in raw_id:
                        author_ids.append(raw_id.split("/")[-1])
                    else:
                        author_ids.append(raw_id)
            else:
                author_data = await OpenAlexClient.search_author_by_name(f"{r.prenom} {r.nom}")
                if author_data:
                    found_id = author_data.get("id", "").replace("https://openalex.org/", "")
                    author_ids.append(found_id)
                    r.author_id_openalex = f"https://openalex.org/{found_id}"
            
            if not author_ids:
                results["failed"] += 1
                results["details"].append(f"Auteur non trouvé: {r.prenom} {r.nom}")
                continue

            all_works = []
            for openalex_id in author_ids:
                works = await OpenAlexClient.get_author_works(openalex_id)
                if works:
                    all_works.extend(works)
                    
            if not all_works:
                results["failed"] += 1
                continue
                
            work_ids = [work.get("id", "").replace("https://openalex.org/", "") for work in all_works]
            existing_pubs = db.query(Publication).filter(Publication.openalex_id.in_(work_ids)).all()
            existing_map = {p.openalex_id: p for p in existing_pubs}
                
            added_count = 0
            for work in all_works:
                work_id = work.get("id", "").replace("https://openalex.org/", "")
                existing_pub = existing_map.get(work_id)
                
                if existing_pub:
                    existing_pub.user_id = r.id
                    # Update citation count if it changed
                    existing_pub.cited_by_count = work.get("cited_by_count", 0)
                else:
                    from services.openalex_service import normalize_openalex_work
                    normalized_work = normalize_openalex_work(work)
                    publication = Publication(user_id=r.id, **normalized_work)
                    db.add(publication)
                    added_count += 1
                    
            db.commit()
            db.refresh(r)
            results["success"] += 1
            if added_count > 0:
                results["details"].append(f"Succès pour {r.prenom} {r.nom} ({added_count} publications ajoutées)")
            
        except Exception as e:
            db.rollback()
            results["failed"] += 1
            results["details"].append(f"Erreur pour {r.prenom} {r.nom}: {str(e)}")
            
    return {"message": "Synchronisation globale terminée", "results": results}

@router.get("/{user_id}/auto-publications")
async def get_user_auto_publications(user_id: int, db: Session = Depends(get_db)):
    """Récupérer automatiquement les publications d'un utilisateur (chercheur, chef d'équipe, etc)
    
    Stratégie :
    1. Vérifier d'abord s'il y a des publications locales en BD
    2. Sinon, chercher sur OpenAlex par le prénom + nom
    3. Aucune dépendance sur author_id_openalex
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        
        # Vérifier d'abord s'il y a des publications locales
        local_publications = db.query(Publication).filter(Publication.user_id == user_id).all()
        
        if local_publications:
            # Utiliser les données locales
            print(f"[AUTO-PUB] Found {len(local_publications)} local publications for user {user_id} ({user.prenom} {user.nom})")
            
            publications = []
            for pub in local_publications:
                publications.append({
                    "title": pub.title,
                    "year": pub.publication_year,
                    "type": pub.type or "article",
                    "citations": pub.cited_by_count or 0,
                    "doi": pub.doi,
                    "url": f"https://doi.org/{pub.doi}" if pub.doi else None,
                })
            
            # Calculer les statistiques
            total_citations = sum(p["citations"] for p in publications)
            pubs_by_year = {}
            for pub in publications:
                year = pub["year"]
                if year:
                    pubs_by_year[year] = pubs_by_year.get(year, 0) + 1
            
            # Calculer H-index
            h_index = 0
            citations_list = sorted([p["citations"] for p in publications], reverse=True)
            for i, citation_count in enumerate(citations_list, 1):
                if citation_count >= i:
                    h_index = i
            
            return {
                "success": True,
                "author_id": None,
                "author_name": f"{user.prenom} {user.nom}",
                "h_index": h_index,
                "total_publications": len(publications),
                "total_citations": total_citations,
                "publications": publications,
                "publications_by_year": pubs_by_year,
                "source": "local"
            }
        else:
            # Chercher sur OpenAlex par le NOM (pas par ID)
            # C'est plus flexible et fonctionne pour tous les utilisateurs
            full_name = f"{user.prenom} {user.nom}"
            print(f"[AUTO-PUB] No local publications, searching OpenAlex for '{full_name}'")
            result = await get_researcher_publications(full_name, per_page=100)
            
            if "error" in result:
                # Si pas trouvé sur OpenAlex, retourner empty avec message
                print(f"[AUTO-PUB] Not found on OpenAlex: {result.get('error')}")
                return {
                    "success": True,
                    "author_id": None,
                    "author_name": f"{user.prenom} {user.nom}",
                    "h_index": 0,
                    "total_publications": 0,
                    "total_citations": 0,
                    "publications": [],
                    "publications_by_year": {},
                    "source": "none",
                    "message": "Aucune publication trouvée. Les données peuvent être importées depuis OpenAlex ou créées localement."
                }
            
            print(f"[AUTO-PUB] Found {result.get('total_publications', 0)} publications on OpenAlex for '{full_name}'")
            
            # Stocker l'OpenAlex ID si trouvé
            if result.get("author_id"):
                user.author_id_openalex = result["author_id"]
                db.commit()
                print(f"[AUTO-PUB] Stored OpenAlex ID: {result['author_id']}")
            
            result["source"] = "openalex"
            return result
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Error in auto-publications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# USER MANAGEMENT ENDPOINTS
# ===========================

def _check_management_permission(current_user: User, target_role: str = None, target_user: User = None):
    """Check if current_user can manage (create/edit/delete) a user with the given role."""
    allowed_roles = ALLOWED_CREATION_ROLES.get(current_user.role)
    if allowed_roles is None:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de gérer des utilisateurs")
    
    # Check role restriction for creation/role-change
    if target_role and target_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Un {current_user.role} ne peut pas créer/assigner le rôle '{target_role}'"
        )
    
    # If editing/deleting an existing user, check they are in scope
    if target_user:
        if target_user.role not in allowed_roles and target_user.id != current_user.id:
            raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier cet utilisateur")
        # Scope check
        if current_user.role == "directeur" and target_user.institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Cet utilisateur n'est pas dans votre institution")
        if current_user.role == "chef_labo" and target_user.labo_id != current_user.labo_id:
            raise HTTPException(status_code=403, detail="Cet utilisateur n'est pas dans votre laboratoire")


@router.post("/")
async def create_user(user_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new user - tutelle, directeur, chef_labo can create (scoped)"""
    try:
        target_role = user_data.get("role", "chercheur")
        _check_management_permission(current_user, target_role=target_role)
        
        # Check if user already exists
        existing = db.query(User).filter(User.email == user_data.get("email")).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        
        # Hash password — Default: Cerist_2026! for admin-created accounts
        default_password = user_data.get("password") or "Cerist_2026!"
        hashed_password = pwd_context.hash(default_password)
        
        # Create new user
        new_user = User(
            nom=user_data.get("nom"),
            prenom=user_data.get("prenom"),
            email=user_data.get("email"),
            password_hash=hashed_password,
            role=target_role,
            is_active=True,
            must_change_password=True,  # Force password change on first login
        )
        
        # AUTO-SCOPE: inherit hierarchy from the creator
        if current_user.role == "tutelle":
            # Tutelle can freely assign institution/labo/equipe
            if user_data.get("institution_id"):
                new_user.institution_id = int(user_data["institution_id"])
            if user_data.get("labo_id"):
                new_user.labo_id = int(user_data["labo_id"])
            if user_data.get("equipe_id"):
                new_user.equipe_id = int(user_data["equipe_id"])
                
        elif current_user.role == "directeur":
            # Directeur: force institution to their own
            new_user.institution_id = current_user.institution_id
            if user_data.get("labo_id"):
                # Validate that the lab belongs to their institution
                from models import Laboratoire
                lab = db.query(Laboratoire).filter(
                    Laboratoire.id == int(user_data["labo_id"]),
                    Laboratoire.institution_id == current_user.institution_id
                ).first()
                if not lab:
                    raise HTTPException(status_code=403, detail="Ce laboratoire n'appartient pas à votre institution")
                new_user.labo_id = lab.id
            if user_data.get("equipe_id"):
                new_user.equipe_id = int(user_data["equipe_id"])
                
        elif current_user.role == "chef_labo":
            # Chef labo: force institution + labo to their own
            new_user.institution_id = current_user.institution_id
            new_user.labo_id = current_user.labo_id
            if user_data.get("equipe_id"):
                # Validate team belongs to their lab
                from models import Equipe
                team = db.query(Equipe).filter(
                    Equipe.id == int(user_data["equipe_id"]),
                    Equipe.labo_id == current_user.labo_id
                ).first()
                if not team:
                    raise HTTPException(status_code=403, detail="Cette équipe n'appartient pas à votre laboratoire")
                new_user.equipe_id = team.id
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # DISPATCH NOTIFICATION TO SUPERIOR
        from models import Notification, Institution, Laboratoire, Equipe
        try:
            superior_id = None
            if target_role == "directeur" and new_user.institution_id:
                inst = db.query(Institution).filter(Institution.id == new_user.institution_id).first()
                superior_id = inst.tutelle_id if inst else None
            elif target_role == "chef_labo" and new_user.institution_id:
                inst = db.query(Institution).filter(Institution.id == new_user.institution_id).first()
                # Assuming directeur_id is stored on Institution
                superior_id = inst.directeur_id if inst else None
            elif target_role == "chef_equipe" and new_user.labo_id:
                lab = db.query(Laboratoire).filter(Laboratoire.id == new_user.labo_id).first()
                superior_id = lab.chef_labo_id if lab else None
            elif target_role == "chercheur" and new_user.equipe_id:
                eq = db.query(Equipe).filter(Equipe.id == new_user.equipe_id).first()
                superior_id = eq.chef_equipe_id if eq else None
                
            if superior_id:
                notif = Notification(
                    user_id=superior_id,
                    message=f"Nouveau {target_role} créé dans votre hiérarchie : {new_user.prenom} {new_user.nom}."
                )
                db.add(notif)
                db.commit()
        except Exception as e:
            print("Error creating notification:", e)
        
        return {
            "id": new_user.id,
            "nom": new_user.nom,
            "prenom": new_user.prenom,
            "email": new_user.email,
            "role": new_user.role,
            "institution_id": new_user.institution_id,
            "labo_id": new_user.labo_id,
            "equipe_id": new_user.equipe_id,
            "message": "Utilisateur créé avec succès"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}")
async def update_user(user_id: int, user_data: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing user - scoped by role"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        _check_management_permission(current_user, target_user=user)
        
        # If changing role, check the new role is allowed
        if "role" in user_data and user_data["role"] != user.role:
            _check_management_permission(current_user, target_role=user_data["role"])
        
        # Update fields
        if "nom" in user_data:
            user.nom = user_data["nom"]
        if "prenom" in user_data:
            user.prenom = user_data["prenom"]
        if "email" in user_data:
            user.email = user_data["email"]
        if "role" in user_data:
            user.role = user_data["role"]
        if "labo_id" in user_data:
            user.labo_id = user_data["labo_id"] or None
        if "equipe_id" in user_data:
            user.equipe_id = user_data["equipe_id"] or None
        if "password" in user_data and user_data["password"]:
            user.password_hash = pwd_context.hash(user_data["password"])
        
        db.commit()
        db.refresh(user)
        
        return {
            "id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": user.role,
            "message": "Utilisateur mis à jour avec succès"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a user - scoped by role"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        _check_management_permission(current_user, target_user=user)
        
        # Soft delete: Check if we have is_active, otherwise hard delete
        if hasattr(user, 'is_active'):
            user.is_active = False
            # Force password change if reactivated later
            if hasattr(user, 'must_change_password'):
                user.must_change_password = True
        else:
            db.delete(user)
        db.commit()
        
        return {"message": "Utilisateur supprimé avec succès", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/me/notifications")
def get_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Fetch notifications for the current user"""
    from models import Notification
    try:
        notifs = db.query(Notification).filter(Notification.user_id == current_user.id).order_by(Notification.created_at.desc()).all()
        return [
            {
                "id": n.id,
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None
            } for n in notifs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/me/notifications")
def clear_my_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Clear all notifications for the current user"""
    from models import Notification
    try:
        db.query(Notification).filter(Notification.user_id == current_user.id).delete()
        db.commit()
        return {"success": True, "message": "Notifications cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
