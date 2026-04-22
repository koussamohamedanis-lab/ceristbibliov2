import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FiMessageSquare, FiUsers, FiSend, FiPaperclip, FiMic, FiPhone,
  FiVideo, FiX, FiChevronRight, FiSearch, FiFile, FiPlay, FiSquare,
  FiPhoneOff, FiUser
} from 'react-icons/fi'
import api, { uploadAvatar } from '../services/api'

const API_BASE = 'http://localhost:8000'
const WS_BASE = `ws://${window.location.host}`

export default function Messaging() {
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  // Audio recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  // WebRTC Call
  const [callState, setCallState] = useState(null) // null, 'calling', 'ringing', 'active'
  const [callType, setCallType] = useState(null) // 'audio' or 'video'
  const [callerInfo, setCallerInfo] = useState(null)
  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  // WebSocket
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)

  const currentUserId = parseInt(localStorage.getItem('userId'))
  const token = localStorage.getItem('access_token')

  // Load conversations
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      const res = await api.get('/messaging/conversations')
      setConversations(res.data)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return
    loadMessages(activeConv.id)
    connectWebSocket(activeConv.id)

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [activeConv?.id])

  const loadMessages = async (convId) => {
    try {
      const res = await api.get(`/messaging/conversations/${convId}/messages?limit=100`)
      setMessages(res.data)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }

  const connectWebSocket = (convId) => {
    if (wsRef.current) wsRef.current.close()

    const ws = new WebSocket(`${WS_BASE}/messaging/ws/${convId}?token=${token}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'message') {
        setMessages(prev => [...prev, {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          sender_name: data.sender_name,
          sender_avatar: data.sender_avatar,
          content: data.content,
          type: data.msg_type || 'text',
          file_url: data.file_url,
          file_name: data.file_name,
          created_at: data.created_at,
        }])
        setTimeout(scrollToBottom, 50)
      } else if (data.type === 'typing') {
        setTypingUsers(prev => {
          if (!prev.find(u => u.user_id === data.user_id)) {
            return [...prev, { user_id: data.user_id, user_name: data.user_name }]
          }
          return prev
        })
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id))
        }, 3000)
      } else if (data.type === 'offer') {
        handleIncomingCall(data)
      } else if (data.type === 'answer') {
        handleCallAnswer(data)
      } else if (data.type === 'ice-candidate') {
        handleIceCandidate(data)
      } else if (data.type === 'call-end') {
        endCall()
      }
    }

    ws.onerror = (err) => console.error('WebSocket error:', err)
    wsRef.current = ws
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Send text message
  const sendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !wsRef.current) return
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: newMessage.trim(),
    }))

    // Optimistic update
    setMessages(prev => [...prev, {
      id: Date.now(),
      conversation_id: activeConv.id,
      sender_id: currentUserId,
      sender_name: localStorage.getItem('userName') || 'Moi',
      content: newMessage.trim(),
      type: 'text',
      created_at: new Date().toISOString(),
    }])
    setNewMessage('')
    setTimeout(scrollToBottom, 50)
  }

  // Typing indicator
  const handleTyping = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }))
    }
  }

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !activeConv) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('conversation_id', activeConv.id)

    try {
      const res = await api.post('/messaging/upload/message-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Add to local messages
      setMessages(prev => [...prev, res.data])
      setTimeout(scrollToBottom, 50)

      // Notify others via WS
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'media_sent',
          ...res.data,
          msg_type: res.data.type,
        }))
      }
    } catch (err) {
      console.error('Upload failed:', err)
    }
    e.target.value = ''
  }

  // Audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        
        // Upload
        const formData = new FormData()
        formData.append('file', audioBlob, `vocal_${Date.now()}.webm`)
        formData.append('conversation_id', activeConv.id)

        try {
          const res = await api.post('/messaging/upload/message-media', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          setMessages(prev => [...prev, res.data])
          setTimeout(scrollToBottom, 50)

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'media_sent', ...res.data, msg_type: 'audio',
            }))
          }
        } catch (err) {
          console.error('Audio upload failed:', err)
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    clearInterval(recordingTimerRef.current)
    setRecordingTime(0)
  }

  // WebRTC Call Logic
  const startCall = async (type) => {
    if (!activeConv || activeConv.type !== 'private') return
    const otherUser = activeConv.members?.find(m => m.id !== currentUserId)
    if (!otherUser) return

    setCallState('calling')
    setCallType(type)

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    peerConnectionRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target_user_id: otherUser.id,
          data: e.candidate,
        }))
      }
    }

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0]
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    wsRef.current.send(JSON.stringify({
      type: 'offer',
      target_user_id: otherUser.id,
      data: offer,
    }))
  }

  const handleIncomingCall = async (data) => {
    setCallState('ringing')
    setCallerInfo(data)
    setCallType(data.data?.type === 'video' ? 'video' : 'audio')
  }

  const acceptCall = async () => {
    if (!callerInfo) return
    setCallState('active')

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === 'video'
    })
    localStreamRef.current = stream
    if (localVideoRef.current) localVideoRef.current.srcObject = stream

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })
    peerConnectionRef.current = pc

    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(JSON.stringify({
          type: 'ice-candidate',
          target_user_id: callerInfo.from_user_id,
          data: e.candidate,
        }))
      }
    }

    pc.ontrack = (e) => {
      remoteStreamRef.current = e.streams[0]
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
    }

    await pc.setRemoteDescription(new RTCSessionDescription(callerInfo.data))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    wsRef.current.send(JSON.stringify({
      type: 'answer',
      target_user_id: callerInfo.from_user_id,
      data: answer,
    }))
  }

  const handleCallAnswer = async (data) => {
    setCallState('active')
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.data))
    }
  }

  const handleIceCandidate = async (data) => {
    if (peerConnectionRef.current && data.data) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.data))
      } catch (err) {
        console.error('Error adding ICE candidate:', err)
      }
    }
  }

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null
    }

    // Notify other user
    if (wsRef.current && activeConv) {
      const otherUser = activeConv.members?.find(m => m.id !== currentUserId)
      if (otherUser) {
        wsRef.current.send(JSON.stringify({
          type: 'call-end',
          target_user_id: otherUser.id,
        }))
      }
    }

    setCallState(null)
    setCallType(null)
    setCallerInfo(null)
  }

  // Open private chat
  const openPrivateChat = async (userId) => {
    try {
      const res = await api.post(`/messaging/conversations/private/${userId}`)
      await loadConversations()
      const convId = res.data.id
      const conv = conversations.find(c => c.id === convId) || { id: convId, type: 'private', members: [] }
      setActiveConv(conv)
    } catch (err) {
      console.error('Failed to open private chat:', err)
    }
  }

  // Format time
  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatRecordingTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (parts[0][0] || '?').toUpperCase()
  }

  const filteredConversations = conversations.filter(c =>
    !searchTerm || c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupConvs = filteredConversations.filter(c => c.type === 'group')
  const privateConvs = filteredConversations.filter(c => c.type === 'private')

  if (loading) {
    return <div className="dashboard-loading">Chargement...</div>
  }

  return (
    <div className="msg-layout">
      {/* LEFT SIDEBAR - Conversations list */}
      <div className="msg-sidebar">
        <div className="msg-sidebar-header">
          <h2 className="msg-sidebar-title">
            <FiMessageSquare size={20} />
            Messages
          </h2>
        </div>

        <div className="msg-search-box">
          <FiSearch size={14} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="msg-conv-list">
          {groupConvs.length > 0 && (
            <>
              <p className="msg-section-label">GROUPES</p>
              {groupConvs.map(c => (
                <div
                  key={c.id}
                  className={`msg-conv-item ${activeConv?.id === c.id ? 'msg-conv-active' : ''}`}
                  onClick={() => setActiveConv(c)}
                >
                  <div className="msg-conv-icon msg-conv-icon-group">
                    <FiUsers size={16} />
                  </div>
                  <div className="msg-conv-info">
                    <span className="msg-conv-name">{c.name}</span>
                    {c.last_message && (
                      <span className="msg-conv-preview">
                        {c.last_message.type === 'audio' ? '🎤 Message vocal' :
                         c.last_message.type === 'file' ? '📎 Fichier' :
                         c.last_message.content?.substring(0, 40)}
                      </span>
                    )}
                  </div>
                  <span className="msg-conv-meta">{c.members?.length || 0}</span>
                </div>
              ))}
            </>
          )}

          {privateConvs.length > 0 && (
            <>
              <p className="msg-section-label">MESSAGES PRIVÉS</p>
              {privateConvs.map(c => (
                <div
                  key={c.id}
                  className={`msg-conv-item ${activeConv?.id === c.id ? 'msg-conv-active' : ''}`}
                  onClick={() => setActiveConv(c)}
                >
                  <div className="msg-conv-icon msg-conv-icon-private">
                    {getInitials(c.name)}
                  </div>
                  <div className="msg-conv-info">
                    <span className="msg-conv-name">{c.name}</span>
                    {c.last_message && (
                      <span className="msg-conv-preview">
                        {c.last_message.type === 'audio' ? '🎤 Message vocal' :
                         c.last_message.type === 'file' ? '📎 Fichier' :
                         c.last_message.content?.substring(0, 40)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {conversations.length === 0 && (
            <div className="msg-empty-sidebar">
              <FiMessageSquare size={32} />
              <p>Aucune conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="msg-main">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="msg-chat-header">
              <div className="msg-chat-header-info">
                <h3 className="msg-chat-title">{activeConv.name || 'Conversation'}</h3>
                <span className="msg-chat-subtitle">
                  {activeConv.type === 'group'
                    ? `${activeConv.members?.length || 0} membres`
                    : 'Conversation privée'}
                </span>
              </div>
              <div className="msg-chat-header-actions">
                {activeConv.type === 'private' && (
                  <>
                    <button className="msg-action-btn" onClick={() => startCall('audio')} title="Appel audio">
                      <FiPhone size={18} />
                    </button>
                    <button className="msg-action-btn" onClick={() => startCall('video')} title="Appel vidéo">
                      <FiVideo size={18} />
                    </button>
                  </>
                )}
                <button
                  className={`msg-action-btn ${showMembers ? 'msg-action-btn-active' : ''}`}
                  onClick={() => setShowMembers(!showMembers)}
                  title="Membres"
                >
                  <FiUsers size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="msg-messages-area">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUserId
                return (
                  <div key={msg.id || idx} className={`msg-bubble-row ${isMe ? 'msg-bubble-right' : 'msg-bubble-left'}`}>
                    {!isMe && (
                      <div className="msg-bubble-avatar" title={msg.sender_name}>
                        {msg.sender_avatar ? (
                          <img src={`${API_BASE}${msg.sender_avatar}`} alt="" />
                        ) : (
                          getInitials(msg.sender_name)
                        )}
                      </div>
                    )}
                    <div className={`msg-bubble ${isMe ? 'msg-bubble-mine' : 'msg-bubble-theirs'}`}>
                      {!isMe && activeConv.type === 'group' && (
                        <span className="msg-bubble-sender">{msg.sender_name}</span>
                      )}
                      {msg.type === 'audio' ? (
                        <div className="msg-audio-player">
                          <FiMic size={14} />
                          <audio controls src={`${API_BASE}${msg.file_url}`} preload="none" />
                        </div>
                      ) : msg.type === 'file' ? (
                        <a href={`${API_BASE}${msg.file_url}`} target="_blank" rel="noopener noreferrer" className="msg-file-link">
                          <FiFile size={16} />
                          <span>{msg.file_name || msg.content || 'Fichier'}</span>
                        </a>
                      ) : (
                        <p className="msg-bubble-text">{msg.content}</p>
                      )}
                      <span className="msg-bubble-time">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                )
              })}

              {typingUsers.length > 0 && (
                <div className="msg-typing-indicator">
                  {typingUsers.map(u => u.user_name).join(', ')} est en train d'écrire...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form className="msg-input-bar" onSubmit={sendMessage}>
              {isRecording ? (
                <div className="msg-recording-bar">
                  <div className="msg-recording-pulse" />
                  <span className="msg-recording-time">{formatRecordingTime(recordingTime)}</span>
                  <span className="msg-recording-label">Enregistrement en cours...</span>
                  <button type="button" className="msg-stop-btn" onClick={stopRecording}>
                    <FiSquare size={16} />
                    Envoyer
                  </button>
                </div>
              ) : (
                <>
                  <label className="msg-attach-btn" title="Joindre un fichier">
                    <FiPaperclip size={18} />
                    <input type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                  <input
                    type="text"
                    className="msg-text-input"
                    placeholder="Tapez votre message..."
                    value={newMessage}
                    onChange={(e) => { setNewMessage(e.target.value); handleTyping() }}
                    id="msg-input"
                  />
                  {newMessage.trim() ? (
                    <button type="submit" className="msg-send-btn" title="Envoyer">
                      <FiSend size={18} />
                    </button>
                  ) : (
                    <button type="button" className="msg-mic-btn" onClick={startRecording} title="Message vocal">
                      <FiMic size={18} />
                    </button>
                  )}
                </>
              )}
            </form>
          </>
        ) : (
          <div className="msg-no-chat">
            <FiMessageSquare size={48} />
            <h3>Sélectionnez une conversation</h3>
            <p>Choisissez un groupe ou un contact pour commencer</p>
          </div>
        )}
      </div>

      {/* RIGHT PANEL - Members */}
      {showMembers && activeConv && (
        <div className="msg-members-panel">
          <div className="msg-members-header">
            <h3>Membres ({activeConv.members?.length || 0})</h3>
            <button className="msg-close-btn" onClick={() => setShowMembers(false)}>
              <FiX size={18} />
            </button>
          </div>
          <div className="msg-members-list">
            {activeConv.members?.map(member => (
              <div
                key={member.id}
                className="msg-member-item"
                onClick={() => {
                  if (member.id !== currentUserId) openPrivateChat(member.id)
                }}
              >
                <div className="msg-member-avatar">
                  {member.profile_picture_url ? (
                    <img src={`${API_BASE}${member.profile_picture_url}`} alt="" />
                  ) : (
                    getInitials(`${member.prenom} ${member.nom}`)
                  )}
                </div>
                <div className="msg-member-info">
                  <span className="msg-member-name">
                    {member.prenom} {member.nom}
                    {member.id === currentUserId && ' (Vous)'}
                  </span>
                  <span className="msg-member-role">{member.role}</span>
                </div>
                {member.id !== currentUserId && (
                  <FiMessageSquare size={14} className="msg-member-chat-icon" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Modal */}
      {callState && (
        <div className="msg-call-overlay">
          <div className="msg-call-modal">
            {callType === 'video' && (
              <div className="msg-call-video-area">
                <video ref={remoteVideoRef} autoPlay playsInline className="msg-call-remote-video" />
                <video ref={localVideoRef} autoPlay playsInline muted className="msg-call-local-video" />
              </div>
            )}
            <div className="msg-call-info">
              {callState === 'calling' && <p className="msg-call-status">Appel en cours...</p>}
              {callState === 'ringing' && (
                <>
                  <p className="msg-call-status">{callerInfo?.from_user_name} vous appelle</p>
                  <div className="msg-call-actions">
                    <button className="msg-call-accept" onClick={acceptCall}>
                      <FiPhone size={20} /> Accepter
                    </button>
                    <button className="msg-call-reject" onClick={endCall}>
                      <FiPhoneOff size={20} /> Refuser
                    </button>
                  </div>
                </>
              )}
              {callState === 'active' && <p className="msg-call-status">Appel en cours</p>}
              {callState !== 'ringing' && (
                <button className="msg-call-end" onClick={endCall}>
                  <FiPhoneOff size={20} /> Raccrocher
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
