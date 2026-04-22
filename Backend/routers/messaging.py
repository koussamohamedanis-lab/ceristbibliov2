"""
Messaging Router - Real-time communication with WebSockets, file/audio upload, and WebRTC signaling.

Handles:
- Hierarchical group conversation auto-generation
- Private 1-to-1 conversations
- WebSocket room-based broadcasting
- File and audio message uploads
- WebRTC offer/answer/ice-candidate signaling for calls
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import Optional, List, Dict
from pydantic import BaseModel
import json, os, uuid, logging, datetime

from database import get_db, SessionLocal
from models import (
    User, UserRole, Conversation, ConversationMember, Message,
    Institution, Laboratoire, Equipe
)
from routers.auth import get_current_user, SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/messaging", tags=["Messaging"])
logger = logging.getLogger(__name__)

# Uploads directory for message media
MEDIA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "messages")
os.makedirs(MEDIA_DIR, exist_ok=True)


# ====================== WEBSOCKET CONNECTION MANAGER ======================

class ConnectionManager:
    """Manages WebSocket connections per conversation room."""
    
    def __init__(self):
        # { conversation_id: { user_id: WebSocket } }
        self.rooms: Dict[int, Dict[int, WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        await websocket.accept()
        if conversation_id not in self.rooms:
            self.rooms[conversation_id] = {}
        self.rooms[conversation_id][user_id] = websocket
    
    def disconnect(self, conversation_id: int, user_id: int):
        if conversation_id in self.rooms:
            self.rooms[conversation_id].pop(user_id, None)
            if not self.rooms[conversation_id]:
                del self.rooms[conversation_id]
    
    async def broadcast_to_room(self, conversation_id: int, message: dict, exclude_user_id: int = None):
        """Send a message to all connected users in a conversation room."""
        if conversation_id not in self.rooms:
            return
        disconnected = []
        for uid, ws in self.rooms[conversation_id].items():
            if uid == exclude_user_id:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                disconnected.append(uid)
        for uid in disconnected:
            self.rooms[conversation_id].pop(uid, None)
    
    async def send_to_user(self, conversation_id: int, user_id: int, message: dict):
        """Send a message to a specific user in a conversation room."""
        if conversation_id in self.rooms and user_id in self.rooms[conversation_id]:
            try:
                await self.rooms[conversation_id][user_id].send_json(message)
            except Exception:
                self.rooms[conversation_id].pop(user_id, None)


manager = ConnectionManager()


# ====================== HELPER: AUTO-GENERATE GROUP CONVERSATIONS ======================

def ensure_hierarchical_groups(user: User, db: Session):
    """Create or ensure the hierarchical group conversations for a user based on their role.
    This version is resilient to incomplete user org data by cross-referencing Equipe/Labo tables.
    """
    
    groups_created = []
    
    try:
        if user.role == UserRole.CHERCHEUR.value:
            # Find equipe: from user.equipe_id
            if user.equipe_id:
                groups_created += _ensure_equipe_group(user.equipe_id, db)
            else:
                # Chercheur without equipe - create a general institution chat if they have institution_id
                if user.institution_id:
                    groups_created += _ensure_institution_general_group(user.institution_id, db)
        
        elif user.role == UserRole.CHEF_EQUIPE.value:
            # 1. Find which equipe this chef leads (from Equipe.chef_equipe_id or user.equipe_id)
            equipe_id = user.equipe_id
            equipe = None
            if equipe_id:
                equipe = db.query(Equipe).filter(Equipe.id == equipe_id).first()
            if not equipe:
                equipe = db.query(Equipe).filter(Equipe.chef_equipe_id == user.id).first()
                if equipe:
                    equipe_id = equipe.id
            
            if equipe_id:
                groups_created += _ensure_equipe_group(equipe_id, db)
            
            # 2. Find labo: from user.labo_id, or from equipe.labo_id, or from Equipe table
            labo_id = user.labo_id
            if not labo_id and equipe:
                labo_id = equipe.labo_id
            if labo_id:
                groups_created += _ensure_labo_chefs_group(labo_id, db)
        
        elif user.role == UserRole.CHEF_LABO.value:
            # 1. Salon Chefs d'Equipe of their labo
            labo_id = user.labo_id
            if not labo_id:
                labo = db.query(Laboratoire).filter(Laboratoire.chef_labo_id == user.id).first()
                if labo:
                    labo_id = labo.id
            
            if labo_id:
                groups_created += _ensure_labo_chefs_group(labo_id, db)
            
            # 2. Salon Chefs de Labo of their institution
            inst_id = user.institution_id
            if not inst_id and labo_id:
                labo = db.query(Laboratoire).filter(Laboratoire.id == labo_id).first()
                if labo:
                    inst_id = labo.institution_id
            if inst_id:
                groups_created += _ensure_institution_chefs_group(inst_id, db)
        
        elif user.role == UserRole.DIRECTEUR.value:
            if user.institution_id:
                groups_created += _ensure_institution_chefs_group(user.institution_id, db)
            groups_created += _ensure_tutelle_group(user, db)
        
        elif user.role == UserRole.TUTELLE.value:
            groups_created += _ensure_tutelle_group(user, db)
        
        logger.info(f"ensure_hierarchical_groups for user {user.id} ({user.role}): {len(groups_created)} groups")
    except Exception as e:
        logger.error(f"Error ensuring hierarchical groups for user {user.id}: {e}")
        db.rollback()
    
    return groups_created


def _ensure_equipe_group(equipe_id: int, db: Session):
    """Equipe room: all chercheurs + chef d'equipe of this equipe."""
    group_key = f"equipe_{equipe_id}"
    conv = db.query(Conversation).filter(Conversation.group_key == group_key).first()
    
    equipe = db.query(Equipe).filter(Equipe.id == equipe_id).first()
    if not equipe:
        return []
    
    # Get members: users with equipe_id set to this equipe
    members = db.query(User).filter(
        User.equipe_id == equipe_id,
        User.is_active == True,
    ).all()
    
    # Also include the chef_equipe from the Equipe table even if their equipe_id isn't set
    if equipe.chef_equipe_id:
        chef = db.query(User).filter(User.id == equipe.chef_equipe_id, User.is_active == True).first()
        if chef and chef.id not in [m.id for m in members]:
            members.append(chef)
    
    if not members:
        return []
    
    if not conv:
        conv = Conversation(type="group", name=f"Équipe: {equipe.nom}", group_key=group_key)
        db.add(conv)
        db.flush()
    
    _sync_members(conv, members, db)
    db.commit()
    return [conv]


def _ensure_labo_chefs_group(labo_id: int, db: Session):
    """Labo chefs room: all chefs d'equipe of this labo + chef de labo."""
    group_key = f"labo_chefs_{labo_id}"
    conv = db.query(Conversation).filter(Conversation.group_key == group_key).first()
    
    labo = db.query(Laboratoire).filter(Laboratoire.id == labo_id).first()
    if not labo:
        return []
    
    # Find all equipes in this labo
    equipes = db.query(Equipe).filter(Equipe.labo_id == labo_id).all()
    
    # Chefs d'equipe: from user.labo_id OR from equipes in this labo
    chefs_equipe_by_labo = db.query(User).filter(
        User.labo_id == labo_id,
        User.is_active == True,
        User.role == UserRole.CHEF_EQUIPE.value
    ).all()
    
    # Also get chefs from the Equipe table
    chef_ids_from_equipes = [e.chef_equipe_id for e in equipes if e.chef_equipe_id]
    chefs_from_equipe_table = db.query(User).filter(
        User.id.in_(chef_ids_from_equipes),
        User.is_active == True,
    ).all() if chef_ids_from_equipes else []
    
    # Also get chefs whose equipe_id points to an equipe in this labo
    equipe_ids = [e.id for e in equipes]
    chefs_by_equipe = db.query(User).filter(
        User.equipe_id.in_(equipe_ids),
        User.is_active == True,
        User.role == UserRole.CHEF_EQUIPE.value
    ).all() if equipe_ids else []
    
    # Merge all unique
    seen = set()
    members = []
    for u in chefs_equipe_by_labo + chefs_from_equipe_table + chefs_by_equipe:
        if u.id not in seen:
            members.append(u)
            seen.add(u.id)
    
    # Chef de labo: from user.labo_id OR from labo.chef_labo_id
    chef_labo_users = db.query(User).filter(
        User.labo_id == labo_id,
        User.is_active == True,
        User.role == UserRole.CHEF_LABO.value
    ).all()
    
    if labo.chef_labo_id:
        chef_labo_direct = db.query(User).filter(User.id == labo.chef_labo_id, User.is_active == True).first()
        if chef_labo_direct and chef_labo_direct.id not in seen:
            chef_labo_users.append(chef_labo_direct)
    
    for u in chef_labo_users:
        if u.id not in seen:
            members.append(u)
            seen.add(u.id)
    
    if not members:
        return []
    
    if not conv:
        conv = Conversation(type="group", name=f"Labo: {labo.nom}", group_key=group_key)
        db.add(conv)
        db.flush()
    
    _sync_members(conv, members, db)
    db.commit()
    return [conv]


def _ensure_institution_chefs_group(institution_id: int, db: Session):
    """Institution chefs room: all chefs de labo of institution + directeur."""
    group_key = f"institution_chefs_{institution_id}"
    conv = db.query(Conversation).filter(Conversation.group_key == group_key).first()
    
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        return []
    
    # Chefs de labo: from user.institution_id OR from labos in this institution
    chefs_labo = db.query(User).filter(
        User.institution_id == institution_id,
        User.is_active == True,
        User.role == UserRole.CHEF_LABO.value
    ).all()
    
    # Also get chefs from the Laboratoire table
    labos = db.query(Laboratoire).filter(Laboratoire.institution_id == institution_id).all()
    chef_labo_ids = [l.chef_labo_id for l in labos if l.chef_labo_id]
    chefs_from_labo_table = db.query(User).filter(
        User.id.in_(chef_labo_ids),
        User.is_active == True,
    ).all() if chef_labo_ids else []
    
    # Directeur
    directeurs = db.query(User).filter(
        User.institution_id == institution_id,
        User.is_active == True,
        User.role == UserRole.DIRECTEUR.value
    ).all()
    
    # Also directeur from institution.directeur_id
    if institution.directeur_id:
        dir_direct = db.query(User).filter(User.id == institution.directeur_id, User.is_active == True).first()
        if dir_direct and dir_direct.id not in [d.id for d in directeurs]:
            directeurs.append(dir_direct)
    
    # Merge unique
    seen = set()
    members = []
    for u in chefs_labo + chefs_from_labo_table + directeurs:
        if u.id not in seen:
            members.append(u)
            seen.add(u.id)
    
    if not members:
        return []
    
    if not conv:
        conv = Conversation(type="group", name=f"Institution: {institution.nom}", group_key=group_key)
        db.add(conv)
        db.flush()
    
    _sync_members(conv, members, db)
    db.commit()
    return [conv]


def _ensure_tutelle_group(user: User, db: Session):
    """Tutelle room: all directeurs under a tutelle + tutelle user."""
    if user.role == UserRole.TUTELLE.value:
        tutelle_user = user
    elif user.role == UserRole.DIRECTEUR.value:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        if not inst or not inst.tutelle_id:
            return []
        tutelle_user = db.query(User).filter(User.id == inst.tutelle_id).first()
        if not tutelle_user:
            return []
    else:
        return []
    
    group_key = f"tutelle_{tutelle_user.id}"
    conv = db.query(Conversation).filter(Conversation.group_key == group_key).first()
    
    institutions = db.query(Institution).filter(Institution.tutelle_id == tutelle_user.id).all()
    inst_ids = [i.id for i in institutions]
    
    directeurs = db.query(User).filter(
        User.institution_id.in_(inst_ids),
        User.is_active == True,
        User.role == UserRole.DIRECTEUR.value
    ).all() if inst_ids else []
    
    # Also get directeurs from institution.directeur_id
    dir_ids_from_table = [i.directeur_id for i in institutions if i.directeur_id]
    dirs_from_table = db.query(User).filter(
        User.id.in_(dir_ids_from_table),
        User.is_active == True,
    ).all() if dir_ids_from_table else []
    
    seen = set()
    members = []
    for u in directeurs + dirs_from_table + [tutelle_user]:
        if u.id not in seen:
            members.append(u)
            seen.add(u.id)
    
    if len(members) <= 1:
        # Only the tutelle user, no directeurs found - still create for consistency
        pass
    
    tutelle_name = f"{tutelle_user.prenom or ''} {tutelle_user.nom}".strip()
    
    if not conv:
        conv = Conversation(
            type="group",
            name=f"Tutelle: {tutelle_name}",
            group_key=group_key
        )
        db.add(conv)
        db.flush()
    
    _sync_members(conv, members, db)
    db.commit()
    return [conv]


def _ensure_institution_general_group(institution_id: int, db: Session):
    """Fallback group for chercheurs without equipe: general institution chat."""
    group_key = f"institution_general_{institution_id}"
    conv = db.query(Conversation).filter(Conversation.group_key == group_key).first()
    
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        return []
    
    # All chercheurs in this institution without equipe
    chercheurs = db.query(User).filter(
        User.institution_id == institution_id,
        User.is_active == True,
        User.role == UserRole.CHERCHEUR.value,
    ).all()
    
    if not chercheurs:
        return []
    
    if not conv:
        conv = Conversation(type="group", name=f"Chercheurs: {institution.nom}", group_key=group_key)
        db.add(conv)
        db.flush()
    
    _sync_members(conv, chercheurs, db)
    db.commit()
    return [conv]


def _sync_members(conv: Conversation, users: list, db: Session):
    """Sync conversation membership - add missing members."""
    existing_ids = {m.user_id for m in db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conv.id
    ).all()}
    
    for u in users:
        if u.id not in existing_ids:
            db.add(ConversationMember(conversation_id=conv.id, user_id=u.id))


# ====================== REST ENDPOINTS ======================

@router.get("/conversations")
def get_my_conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all conversations for the current user, auto-generating hierarchical groups."""
    # Ensure groups exist
    ensure_hierarchical_groups(current_user, db)
    
    # Fetch all conversations where user is a member
    memberships = db.query(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    conv_ids = [m.conversation_id for m in memberships]
    
    conversations = db.query(Conversation).filter(
        Conversation.id.in_(conv_ids)
    ).all() if conv_ids else []
    
    result = []
    for conv in conversations:
        # Get members info
        members_q = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conv.id
        ).all()
        member_ids = [m.user_id for m in members_q]
        members_info = db.query(User).filter(User.id.in_(member_ids)).all() if member_ids else []
        
        # Get last message
        last_msg = db.query(Message).filter(
            Message.conversation_id == conv.id
        ).order_by(Message.created_at.desc()).first()
        
        # Unread count (messages after last read - simplified: count messages not from me)
        unread = db.query(Message).filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id
        ).count() if last_msg else 0
        
        # For private chats, use the other user's name
        display_name = conv.name
        if conv.type == "private":
            other = [u for u in members_info if u.id != current_user.id]
            if other:
                display_name = f"{other[0].prenom} {other[0].nom}"
        
        result.append({
            "id": conv.id,
            "type": conv.type,
            "name": display_name,
            "group_key": conv.group_key,
            "members": [{
                "id": u.id,
                "nom": u.nom,
                "prenom": u.prenom,
                "role": u.role,
                "profile_picture_url": u.profile_picture_url,
            } for u in members_info],
            "last_message": {
                "content": last_msg.content,
                "type": last_msg.type,
                "sender_id": last_msg.sender_id,
                "created_at": str(last_msg.created_at),
            } if last_msg else None,
            "created_at": str(conv.created_at),
        })
    
    # Sort: groups first, then privates, then by last message time
    result.sort(key=lambda c: (
        0 if c["type"] == "group" else 1,
        c["last_message"]["created_at"] if c["last_message"] else "0"
    ), reverse=False)
    
    return result


@router.get("/conversations/{conversation_id}/messages")
def get_messages(
    conversation_id: int, 
    limit: int = 50, 
    offset: int = 0,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get messages for a conversation (with pagination)."""
    # Verify membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de cette conversation")
    
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).offset(offset).limit(limit).all()
    
    return [{
        "id": m.id,
        "conversation_id": m.conversation_id,
        "sender_id": m.sender_id,
        "sender_name": f"{m.sender.prenom} {m.sender.nom}" if m.sender else "Unknown",
        "sender_avatar": m.sender.profile_picture_url if m.sender else None,
        "content": m.content,
        "type": m.type,
        "file_url": m.file_url,
        "file_name": m.file_name,
        "created_at": str(m.created_at),
    } for m in reversed(messages)]


@router.post("/conversations/private/{other_user_id}")
def create_or_get_private_conversation(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or get a private 1-to-1 conversation with another user."""
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Impossible de créer un salon privé avec vous-même")
    
    # Check if a private conversation already exists between these two users
    existing = db.query(Conversation).filter(
        Conversation.type == "private"
    ).join(ConversationMember).filter(
        ConversationMember.user_id == current_user.id
    ).all()
    
    for conv in existing:
        member_ids = [m.user_id for m in conv.members]
        if set(member_ids) == {current_user.id, other_user_id}:
            return {"id": conv.id, "type": "private", "already_exists": True}
    
    # Verify the other user exists
    other_user = db.query(User).filter(User.id == other_user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    # Create new private conversation
    conv = Conversation(type="private", name=None)
    db.add(conv)
    db.flush()
    
    db.add(ConversationMember(conversation_id=conv.id, user_id=current_user.id))
    db.add(ConversationMember(conversation_id=conv.id, user_id=other_user_id))
    db.commit()
    
    return {"id": conv.id, "type": "private", "already_exists": False}


# ====================== FILE / AUDIO UPLOAD ======================

@router.post("/upload/message-media")
async def upload_message_media(
    file: UploadFile = File(...),
    conversation_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a file or audio recording for a message. Returns the URL and saves the message."""
    # Verify membership
    membership = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == current_user.id
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas membre de cette conversation")
    
    # Read and validate size (10MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Le fichier ne doit pas dépasser 10 Mo")
    
    # Determine message type
    content_type = file.content_type or ""
    if "audio" in content_type:
        msg_type = "audio"
    else:
        msg_type = "file"
    
    # Save file
    ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "bin"
    filename = f"{conversation_id}_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(MEDIA_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(contents)
    
    file_url = f"/uploads/messages/{filename}"
    
    # Create message record
    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=file.filename if msg_type == "file" else "Message vocal",
        type=msg_type,
        file_url=file_url,
        file_name=file.filename,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "sender_name": f"{current_user.prenom} {current_user.nom}",
        "sender_avatar": current_user.profile_picture_url,
        "content": msg.content,
        "type": msg.type,
        "file_url": msg.file_url,
        "file_name": msg.file_name,
        "created_at": str(msg.created_at),
    }


# ====================== WEBSOCKET ENDPOINT ======================

@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: int):
    """WebSocket endpoint for real-time messaging and WebRTC signaling within a conversation."""
    # Authenticate via query param
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception as e:
        logger.error(f"WebSocket auth failed: {e}")
        await websocket.close(code=4001)
        return
    
    # Verify membership
    db = SessionLocal()
    try:
        membership = db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first()
        if not membership:
            await websocket.close(code=4003)
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        user_name = f"{user.prenom} {user.nom}" if user else "Unknown"
        user_avatar = user.profile_picture_url if user else None
    finally:
        db.close()
    
    # Connect
    await manager.connect(websocket, conversation_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "message")
            
            if event_type == "message":
                # Save text message to DB
                db = SessionLocal()
                try:
                    msg = Message(
                        conversation_id=conversation_id,
                        sender_id=user_id,
                        content=data.get("content", ""),
                        type="text",
                    )
                    db.add(msg)
                    db.commit()
                    db.refresh(msg)
                    msg_id = msg.id
                    created_at = str(msg.created_at)
                finally:
                    db.close()
                
                # Broadcast to room
                await manager.broadcast_to_room(conversation_id, {
                    "type": "message",
                    "id": msg_id,
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "sender_avatar": user_avatar,
                    "content": data.get("content", ""),
                    "msg_type": "text",
                    "file_url": None,
                    "file_name": None,
                    "created_at": created_at,
                })
            
            elif event_type == "media_sent":
                # Notification that a media message was uploaded via REST
                await manager.broadcast_to_room(conversation_id, {
                    "type": "message",
                    "id": data.get("id"),
                    "conversation_id": conversation_id,
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "sender_avatar": user_avatar,
                    "content": data.get("content"),
                    "msg_type": data.get("msg_type", "file"),
                    "file_url": data.get("file_url"),
                    "file_name": data.get("file_name"),
                    "created_at": data.get("created_at"),
                }, exclude_user_id=user_id)
            
            elif event_type == "typing":
                await manager.broadcast_to_room(conversation_id, {
                    "type": "typing",
                    "user_id": user_id,
                    "user_name": user_name,
                }, exclude_user_id=user_id)
            
            # WebRTC Signaling events
            elif event_type in ("offer", "answer", "ice-candidate", "call-end"):
                target_user_id = data.get("target_user_id")
                if target_user_id:
                    await manager.send_to_user(conversation_id, target_user_id, {
                        "type": event_type,
                        "from_user_id": user_id,
                        "from_user_name": user_name,
                        "data": data.get("data"),
                    })
    
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, user_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(conversation_id, user_id)
