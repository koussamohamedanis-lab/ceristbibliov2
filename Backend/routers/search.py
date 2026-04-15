from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
from services.search_service import fetch_openalex_data, fetch_openalex_advanced, fetch_author_works
from services.pubmed_service import fetch_pubmed_data

router = APIRouter()

def add_result_type(results: list, source: str):
    """Add item_type and result_type metadata to help frontend identify data type"""
    for result in results:
        if source == "pubmed":
            result["item_type"] = "article"
            result["result_type"] = "publication"
        else:
            result["item_type"] = "author"
            result["result_type"] = "researcher"
    return results

class SearchCriterion(BaseModel):
    searchBy: str
    value: str
    operator: str = "-"

class AdvancedSearchRequest(BaseModel):
    criteria: List[SearchCriterion]
    primaryQuery: str
    source: str = "openalex"
    page: Optional[int] = 1
    perPage: Optional[int] = 20

@router.get("/researcher/{name}")
async def get_researcher(
    name: str, 
    search_by: str = "author", 
    source: str = "openalex",
    page: int = 1, 
    per_page: int = 20
):
    """
    Route hybride : redirige vers le bon service selon la source choisie.
    Retourne des articles (PubMed) ou des profils d'auteurs (OpenAlex).
    """
    if source == "pubmed":
        # On appelle le service médical PubMed
        results = await fetch_pubmed_data(name, search_by, page, per_page)
    else:
        # On garde le service généraliste OpenAlex
        results = await fetch_openalex_data(name, search_by, page, per_page)
    
    # Add metadata to results
    result_list = results.get("results", [])
    result_list = add_result_type(result_list, source)
    
    # Standardize response format for consistent frontend handling
    return {
        "source": results.get("source", source),
        "count": results.get("count", 0),
        "results": result_list,
        "page": page,
        "per_page": per_page
    }

@router.get("/researcher/{author_id}/works")
async def get_author_works(author_id: str):
    """Fetch all works for a specific author"""
    results = await fetch_author_works(author_id)
    return results

@router.post("/researcher/search/advanced")
async def advanced_search(request: AdvancedSearchRequest):
    """Advanced search with multiple criteria and operators - supports both OpenAlex and PubMed"""
    if not request.criteria:
        raise HTTPException(status_code=400, detail="No search criteria provided")
    
    # Filter out empty criteria
    valid_criteria = [c for c in request.criteria if c.value.strip()]
    
    if not valid_criteria:
        raise HTTPException(status_code=400, detail="No valid search criteria")
    
    page = request.page or 1
    per_page = request.perPage or 20
    source = request.source or "openalex"
    
    if source == "pubmed":
        # Use primary query for PubMed with search_by from first criterion
        search_by = valid_criteria[0].searchBy if valid_criteria else "author"
        results = await fetch_pubmed_data(request.primaryQuery, search_by, page, per_page)
    else:
        # Use OpenAlex advanced search
        results = await fetch_openalex_advanced(valid_criteria, page, per_page)
    
    # Add metadata to results
    result_list = results.get("results", [])
    result_list = add_result_type(result_list, source)
    
    return {
        "source": source,
        "count": results.get("count", 0),
        "results": result_list,
        "page": page,
        "per_page": per_page
    }
