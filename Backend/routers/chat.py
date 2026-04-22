"""
Router FastAPI pour le Chatbot IA - Assistant Bibliométrique du CERIST
=====================================================================
Ce module fournit un endpoint POST /chat/ask protégé par JWT.
La fonction generate_llm_response() est mockée pour simuler une réponse IA.
Pour brancher un vrai LLM (OpenAI, etc.), il suffit de remplacer le corps
de cette fonction sans modifier le reste du code.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import logging
import asyncio
import random

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


# ====================== MOCK LLM FUNCTION ======================

async def generate_llm_response(user_message: str, user_name: str = "Utilisateur") -> str:
    """
    Fonction mockée qui simule la réponse d'un LLM.
    
    Pour brancher un vrai LLM (ex: OpenAI GPT-4), remplacez le corps de cette
    fonction par un appel API réel :
    
    Exemple avec OpenAI :
    ```python
    import openai
    openai.api_key = os.getenv("OPENAI_API_KEY")
    
    response = await openai.ChatCompletion.acreate(
        model="gpt-4",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ],
        max_tokens=1024,
        temperature=0.7
    )
    return response.choices[0].message.content
    ```
    """
    
    # Simuler un délai de réflexion réaliste (1-2 secondes)
    await asyncio.sleep(random.uniform(1.0, 2.5))
    
    message_lower = user_message.lower()
    
    # Réponses contextuelles mockées selon le sujet détecté
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
    
    elif any(kw in message_lower for kw in ["citation", "cité", "citer"]):
        return (
            f"Les **citations** sont un indicateur fondamental en bibliométrie, {user_name}. "
            "Elles reflètent l'impact et la reconnaissance de vos travaux par la communauté scientifique.\n\n"
            "📈 **Conseils pour augmenter vos citations :**\n"
            "1. Publiez dans des revues à fort facteur d'impact\n"
            "2. Collaborez avec des chercheurs internationaux\n"
            "3. Partagez vos publications sur des plateformes comme ResearchGate\n"
            "4. Assurez-vous que vos profils OpenAlex sont à jour\n\n"
            "La plateforme CERIST vous permet de suivre l'évolution de vos citations en temps réel."
        )
    
    elif any(kw in message_lower for kw in ["openalex", "open alex"]):
        return (
            "**OpenAlex** est une base de données bibliographique ouverte qui indexe les publications "
            "scientifiques mondiales. La plateforme CERIST utilise OpenAlex comme source de données "
            "principale pour :\n\n"
            "🔍 **Fonctionnalités :**\n"
            "- Récupérer automatiquement les publications des chercheurs\n"
            "- Calculer les métriques bibliométriques (H-index, citations, etc.)\n"
            "- Suivre l'évolution de la production scientifique\n\n"
            "Si votre profil OpenAlex n'est pas correctement lié, contactez votre chef de laboratoire "
            "pour mettre à jour votre identifiant OpenAlex."
        )
    
    elif any(kw in message_lower for kw in ["rapport", "report", "pdf"]):
        return (
            f"Les **rapports bibliométriques** sont essentiels pour évaluer la performance "
            "de recherche, {user_name}.\n\n"
            "📄 **Types de rapports disponibles sur la plateforme :**\n"
            "- Rapport individuel par chercheur\n"
            "- Rapport par équipe de recherche\n"
            "- Rapport par laboratoire\n"
            "- Rapport institutionnel global\n\n"
            "Vous pouvez générer et exporter ces rapports en PDF depuis la section "
            "**Rapports au Ministère** dans le menu de navigation."
        )
    
    elif any(kw in message_lower for kw in ["comparaison", "comparer", "benchmark"]):
        return (
            "La **comparaison bibliométrique** vous permet d'évaluer la performance relative "
            "de vos entités de recherche.\n\n"
            "📊 **Axes de comparaison disponibles :**\n"
            "- Comparaison entre chercheurs d'une même équipe\n"
            "- Comparaison entre équipes d'un laboratoire\n"
            "- Comparaison entre laboratoires d'une institution\n"
            "- Comparaison inter-institutionnelle (niveau tutelle)\n\n"
            "Accédez à l'outil de comparaison via le menu **Comparaison** dans la barre latérale."
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
    
    elif any(kw in message_lower for kw in ["merci", "thank"]):
        return (
            f"Avec plaisir, {user_name} ! N'hésitez pas si vous avez d'autres questions "
            "sur vos analyses bibliométriques. Je suis là pour vous aider. 😊"
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
            "Pourriez-vous préciser votre question ? Je serai ravi de vous fournir "
            "une réponse détaillée et pertinente."
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
