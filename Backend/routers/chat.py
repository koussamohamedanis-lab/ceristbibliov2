"""
Router FastAPI pour le Chatbot IA - Assistant Bibliométrique du CERIST
=====================================================================
Ce module fournit un endpoint POST /chat/ask protégé par JWT.
Utilise l'API Groq (gratuit) avec le modèle LLaMA 3.3 70B pour générer
des réponses intelligentes sur la bibliométrie.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import logging
import os

from routers.auth import verify_token, get_current_user
from models import User

router = APIRouter(prefix="/chat", tags=["Chatbot IA"])

# ====================== SCHEMAS ======================

class ChatRequest(BaseModel):
    """Schéma de la requête utilisateur vers le chatbot."""
    message: str
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    """Schéma de la réponse du chatbot."""
    response: str
    conversation_id: Optional[str] = None


# ====================== SYSTEM PROMPT ======================

SYSTEM_PROMPT = """Tu es un Expert Bibliométrique du CERIST (Centre de Recherche sur l'Information
Scientifique et Technique), basé à Alger, Algérie. Tu assistes les chercheurs, chefs de laboratoire,
directeurs d'institutions et tutelles dans l'analyse bibliométrique de leurs publications scientifiques.

Tes domaines d'expertise incluent :
- L'analyse des indicateurs bibliométriques (H-index, G-index, i10-index, nombre de citations)
- L'interprétation des données OpenAlex et les profils de chercheurs
- Les tendances de publication scientifique et l'évaluation de la performance de recherche
- Les comparaisons entre laboratoires, équipes et institutions
- Les bonnes pratiques pour améliorer la visibilité scientifique
- La génération et l'interprétation de rapports bibliométriques
- Les thematic maps et l'analyse qualitative de la production scientifique

Tu réponds toujours en français, de manière professionnelle, concise et utile.
Si on te pose une question hors de ton domaine d'expertise, tu le signales poliment
et tu rediriges vers le sujet bibliométrique.
"""


# ====================== GROQ LLM ======================

_groq_client = None

def _get_groq_client():
    """Initialise le client Groq (lazy loading)."""
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "YOUR_GROQ_API_KEY_HERE":
            logging.warning("[Chatbot] ⚠️ GROQ_API_KEY non configurée dans .env")
            return None
        try:
            from groq import Groq
            _groq_client = Groq(api_key=api_key)
            logging.info("[Chatbot] ✅ Client Groq initialisé avec succès")
        except Exception as e:
            logging.error(f"[Chatbot] ❌ Erreur initialisation Groq: {e}")
            return None
    return _groq_client


async def generate_llm_response(user_message: str, user_name: str = "Utilisateur") -> str:
    """
    Génère une réponse via l'API Groq (LLaMA 3.3 70B).
    Fallback sur des réponses mockées si Groq n'est pas disponible.
    """
    
    client = _get_groq_client()
    
    if client is None:
        logging.warning("[Chatbot] Groq non disponible, utilisation du fallback mocké")
        return _mock_response(user_message, user_name)
    
    try:
        # Appel à l'API Groq
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"[Utilisateur: {user_name}]\n{user_message}"}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1024,
            top_p=0.9,
        )
        
        response = chat_completion.choices[0].message.content
        logging.info(f"[Chatbot] ✅ Réponse Groq générée ({len(response)} chars)")
        return response
        
    except Exception as e:
        logging.error(f"[Chatbot] ❌ Erreur API Groq: {e}")
        # Fallback en cas d'erreur
        return _mock_response(user_message, user_name)


def _mock_response(user_message: str, user_name: str) -> str:
    """Réponses mockées de secours si Groq n'est pas disponible."""
    message_lower = user_message.lower()
    
    if any(kw in message_lower for kw in ["h-index", "hindex", "h index", "indice h"]):
        return (
            f"Bonjour {user_name} ! Le **H-index** (indice de Hirsch) est un indicateur bibliométrique "
            "qui mesure à la fois la productivité et l'impact des publications d'un chercheur. "
            "Un chercheur a un H-index de **h** si **h** de ses publications ont été citées au moins **h** fois.\n\n"
            "📊 **Interprétation générale :**\n"
            "- H-index < 10 : Chercheur en début de carrière\n"
            "- H-index 10-20 : Chercheur établi\n"
            "- H-index > 20 : Chercheur senior avec un impact significatif\n\n"
            "Vous pouvez consulter le H-index de vos chercheurs dans la section **Statistiques** de la plateforme."
        )
    
    elif any(kw in message_lower for kw in ["bonjour", "salut", "hello", "bonsoir"]):
        return (
            f"Bonjour {user_name} ! 👋\n\n"
            "Je suis l'**Assistant Bibliométrique du CERIST**. Je peux vous aider avec :\n\n"
            "📊 L'analyse de vos indicateurs bibliométriques\n"
            "📈 L'interprétation de vos statistiques de publication\n"
            "🔍 La compréhension des données OpenAlex\n"
            "📄 La génération de rapports\n"
            "⚖️ La comparaison de performances entre entités\n\n"
            "N'hésitez pas à me poser vos questions !"
        )
    
    else:
        return (
            f"Merci pour votre question, {user_name}. En tant qu'expert bibliométrique du CERIST, "
            "je peux vous assister sur les sujets suivants :\n\n"
            "• **Indicateurs bibliométriques** : H-index, G-index, i10-index, citations\n"
            "• **OpenAlex** : Profils chercheurs, publications, métriques\n"
            "• **Rapports** : Génération et interprétation de rapports PDF\n"
            "• **Comparaisons** : Benchmarking entre entités de recherche\n"
            "• **Thematic Maps** : Analyse qualitative des publications\n\n"
            "⚠️ *Le service IA est en mode hors-ligne. Veuillez configurer la clé GROQ_API_KEY pour activer les réponses intelligentes.*"
        )


# ====================== ENDPOINTS ======================

@router.post("/ask", response_model=ChatResponse)
async def chat_ask(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint principal du chatbot.
    Reçoit une question de l'utilisateur authentifié et retourne une réponse IA.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le message ne peut pas être vide."
        )
    
    try:
        user_name = f"{current_user.prenom} {current_user.nom}"
        
        logging.info(f"[Chatbot] Question de {user_name} (ID:{current_user.id}): {request.message[:100]}")
        
        response_text = await generate_llm_response(
            user_message=request.message.strip(),
            user_name=current_user.prenom
        )
        
        logging.info(f"[Chatbot] Réponse générée pour {user_name} ({len(response_text)} chars)")
        
        return ChatResponse(
            response=response_text,
            conversation_id=request.conversation_id
        )
        
    except Exception as e:
        logging.error(f"[Chatbot] Erreur lors de la génération de la réponse: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Service IA temporairement indisponible. Veuillez réessayer."
        )
