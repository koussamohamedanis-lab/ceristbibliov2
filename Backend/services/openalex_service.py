import httpx
from typing import List, Dict
import logging
from urllib.parse import quote

logger = logging.getLogger(__name__)

class OpenAlexClient:
    """Client pour interagir avec l'API OpenAlex"""
    
    BASE_URL = "https://api.openalex.org"
    
    @staticmethod
    async def search_author_by_name(name: str) -> Dict:
        """Chercher un auteur par nom dans OpenAlex"""
        try:
            filter_str = f"display_name.search:{quote(name)}"
            url = f"{OpenAlexClient.BASE_URL}/authors?filter={filter_str}&per-page=1"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data.get("results") and len(data["results"]) > 0:
                        return data["results"][0]
            return None
        except Exception as e:
            logger.error(f"Erreur lors de la recherche d'auteur OpenAlex: {e}")
            return None
    
    @staticmethod
    async def get_author_works(author_id: str, per_page: int = 100) -> List[Dict]:
        """Récupérer les publications d'un auteur"""
        try:
            # Extraire l'ID si c'est une URL complète
            if "openalex.org" in author_id:
                author_id = author_id.split("/")[-1]
            
            # Format correct: author.id: suivi du filtre avec sort et per-page corrects
            url = f"{OpenAlexClient.BASE_URL}/works?filter=author.id:{author_id}&sort=publication_date:desc&per-page={per_page}"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return data.get("results", [])
                else:
                    logger.error(f"OpenAlex returned status {response.status_code}")
            return []
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des publications OpenAlex: {e}")
            return []
    
    @staticmethod
    async def get_author_info(author_id: str) -> Dict:
        """Récupérer les infos d'un auteur (H-index, etc)"""
        try:
            if "openalex.org" in author_id:
                author_id = author_id.split("/")[-1]
            
            url = f"{OpenAlexClient.BASE_URL}/authors/{author_id}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.json()
            return {}
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des infos auteur: {e}")
            return {}

def normalize_openalex_work(work: Dict) -> Dict:
    """Convertir une publication OpenAlex au format de la DB"""
    oid = work.get("id") or ""
    doi = work.get("doi") or ""
    return {
        "openalex_id": oid.replace("https://openalex.org/", ""),
        "title": work.get("title") or "Sans titre",
        "doi": doi.replace("https://doi.org/", "") if doi else None,
        "publication_year": work.get("publication_year"),
        "cited_by_count": work.get("cited_by_count", 0),
        "type": work.get("type", "article"),
    }

async def get_researcher_publications(researcher_name: str, per_page: int = 100) -> Dict:
    """Récupérer automatiquement les publications d'un chercheur par son nom"""
    try:
        # Chercher l'auteur par nom
        author = await OpenAlexClient.search_author_by_name(researcher_name)
        if not author:
            return {"error": "Auteur non trouvé", "publications": []}
        
        # Récupérer son OpenAlex ID
        author_id = author.get("id", "").split("/")[-1]
        
        # Récupérer ses publications
        works = await OpenAlexClient.get_author_works(author_id, per_page)
        
        # Récupérer ses  infos (H-index)
        author_info = await OpenAlexClient.get_author_info(author_id)
        h_index = author_info.get("summary_stats", {}).get("h_index", 0)
        
        # Formatter les publications
        publications = []
        for work in works:
            doi = work.get("doi")
            # Nettoyer le DOI: enlever le préfixe https://doi.org/ s'il existe
            clean_doi = doi.replace("https://doi.org/", "") if doi else None
            
            publications.append({
                "title": work.get("title"),
                "year": work.get("publication_year"),
                "type": work.get("type", "article"),
                "citations": work.get("cited_by_count", 0),
                "doi": clean_doi,
                "url": f"https://doi.org/{clean_doi}" if clean_doi else None,
            })
        
        # Calculer statistiques
        total_citations = sum(p["citations"] for p in publications)
        pubs_by_year = {}
        for pub in publications:
            year = pub["year"]
            if year:
                pubs_by_year[year] = pubs_by_year.get(year, 0) + 1
        
        return {
            "success": True,
            "author_id": author_id,
            "author_name": author.get("display_name"),
            "h_index": h_index,
            "total_publications": len(publications),
            "total_citations": total_citations,
            "publications": publications,
            "publications_by_year": pubs_by_year
        }
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des publications du chercheur: {e}")
        return {"error": str(e), "publications": []}
