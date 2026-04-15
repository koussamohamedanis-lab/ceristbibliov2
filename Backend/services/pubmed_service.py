import httpx
from urllib.parse import quote

async def fetch_pubmed_data(name: str, search_by: str = "author", page: int = 1, per_page: int = 20):
    if not name or not name.strip():
        return {"error": "Le terme de recherche est requis.", "results": []}
    
    name = name.strip()

    # --- CORRECTION 1 : Traduction des filtres pour PubMed ---
    if search_by == "author":
        pubmed_term = f"{name}[Author]"
    elif search_by == "domain":
        pubmed_term = f"{name}[MeSH Terms]"
    elif search_by == "country" or search_by == "lab":
        pubmed_term = f"{name}[Affiliation]"
    else:
        pubmed_term = name

    # --- CORRECTION 2 : Paramètres de pagination ---
    page = max(1, page)
    per_page = min(max(1, per_page), 200)
    retstart = (page - 1) * per_page

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            # ÉTAPE A : ESearch (Trouver les IDs)
            search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            params = {
                "db": "pubmed",
                "term": pubmed_term, # On utilise le terme traduit
                "retstart": retstart,
                "retmax": per_page,
                "retmode": "json"
            }
            
            response = await client.get(search_url, params=params)
            ids = response.json().get("esearchresult", {}).get("idlist", [])

            # --- CORRECTION 3 : Syntaxe du dictionnaire ---
            if not ids:
                return {"count": 0, "results": [], "source": "PubMed"}

            # ÉTAPE B : ESummary (Récupérer les détails)
            summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
            summary_params = {
                "db": "pubmed",
                "id": ",".join(ids),
                "retmode": "json"
            }
            r_summary = await client.get(summary_url, params=summary_params)
            summary_data = r_summary.json().get("result", {})

            # ÉTAPE C : Mapping pour le Front-end
            results = []
            for pmid in ids:
                if pmid == "uids": continue
                article = summary_data.get(pmid, {})

                results.append({
                    "id": pmid,
                    "display_name": article.get("title", "Sans titre"), 
                    "publication_date": article.get("pubdate"),
                    "journal": article.get("fulljournalname"),
                    "authors_list": [a.get("name") for a in article.get("authors", [])],
                    "link": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
                    "source": "PubMed",
                    "works_count": 1,
                    "cited_by_count": 0,
                    "last_known_institutions": []
                })

            return {
                "count": len(results),
                "results": results,
                "source": "PubMed"
            }

        except Exception as e:
            return {"error": f"Erreur PubMed: {str(e)}", "results": []}