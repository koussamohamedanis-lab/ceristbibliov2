import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaLightbulb } from 'react-icons/fa';
import api from '../services/api';

/**
 * Chatbot.jsx - Assistant IA Bibliométrique du CERIST
 * Interface style ChatGPT intégrée dans le content-area principal.
 * Utilise exclusivement les variables CSS de style.css.
 */
export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const userName = localStorage.getItem('userName') || 'Utilisateur';

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus sur l'input au chargement
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fermer le toast d'erreur automatiquement
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Rendu simple du markdown (gras)
  const renderMarkdown = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/chat/ask', {
        message: trimmed
      });

      const aiMessage = {
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Service temporairement indisponible. Veuillez réessayer.';
      setError(errorMsg);
      // Ajouter aussi un message d'erreur dans le chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Désolé, je n\'ai pas pu traiter votre demande. Le service est temporairement indisponible. Veuillez réessayer dans quelques instants.',
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Qu'est-ce que le H-index ?",
    "Comment améliorer mes citations ?",
    "Expliquer les données OpenAlex",
    "Comment générer un rapport ?"
  ];

  const handleSuggestion = (text) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <FaRobot style={{ fontSize: '1.4rem', color: 'white' }} />
          </div>
          <div>
            <h1 style={styles.headerTitle}>Assistant IA</h1>
            <p style={styles.headerSubtitle}>Expert Bibliométrique du CERIST</p>
          </div>
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot}></span>
          En ligne
        </div>
      </div>

      {/* Messages Area */}
      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          /* Empty State */
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <FaRobot style={{ fontSize: '3rem', color: 'var(--main-green)', opacity: 0.6 }} />
            </div>
            <h2 style={styles.emptyTitle}>Bienvenue, {userName.split(' ')[0]} !</h2>
            <p style={styles.emptyText}>
              Je suis votre assistant bibliométrique. Posez-moi vos questions sur les indicateurs,
              les publications, ou les analyses de performance.
            </p>
            <div style={styles.suggestionsGrid}>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s)}
                  style={styles.suggestionChip}
                  onMouseEnter={e => {
                    e.target.style.borderColor = 'var(--main-green)';
                    e.target.style.backgroundColor = 'rgba(22, 163, 74, 0.08)';
                    e.target.style.color = 'var(--main-green)';
                  }}
                  onMouseLeave={e => {
                    e.target.style.borderColor = 'var(--bordres)';
                    e.target.style.backgroundColor = 'var(--bg-cartes)';
                    e.target.style.color = 'var(--sec-text)';
                  }}
                >
                  <FaLightbulb style={{ fontSize: '0.8rem', flexShrink: 0 }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages List */
          messages.map((msg, index) => (
            <div
              key={index}
              style={{
                ...styles.messageRow,
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {msg.role === 'assistant' && (
                <div style={styles.avatarAI}>
                  <FaRobot style={{ fontSize: '0.85rem', color: 'white' }} />
                </div>
              )}
              <div
                style={{
                  ...styles.messageBubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.aiBubble),
                  ...(msg.isError ? styles.errorBubble : {})
                }}
              >
                <div style={styles.messageContent}>
                  {msg.content.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: line === '' ? '0.5rem 0' : '0.25rem 0' }}>
                      {renderMarkdown(line)}
                    </p>
                  ))}
                </div>
                <span style={{
                  ...styles.timestamp,
                  textAlign: msg.role === 'user' ? 'right' : 'left'
                }}>
                  {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.role === 'user' && (
                <div style={styles.avatarUser}>
                  <FaUser style={{ fontSize: '0.85rem', color: 'white' }} />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
            <div style={styles.avatarAI}>
              <FaRobot style={{ fontSize: '0.85rem', color: 'white' }} />
            </div>
            <div style={{ ...styles.messageBubble, ...styles.aiBubble }}>
              <div style={styles.typingIndicator}>
                <span style={{ ...styles.typingDot, animationDelay: '0s' }}></span>
                <span style={{ ...styles.typingDot, animationDelay: '0.2s' }}></span>
                <span style={{ ...styles.typingDot, animationDelay: '0.4s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <div style={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez votre question bibliométrique..."
            rows={1}
            style={styles.textInput}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              ...styles.sendButton,
              opacity: (!input.trim() || isLoading) ? 0.5 : 1,
              cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer'
            }}
          >
            <FaPaperPlane style={{ fontSize: '0.9rem' }} />
          </button>
        </div>
        <p style={styles.disclaimer}>
          L'assistant utilise l'IA pour fournir des informations bibliométriques. Vérifiez les données importantes.
        </p>
      </div>

      {/* Toast Error Notification */}
      {error && (
        <div style={styles.toast}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} style={styles.toastClose}>✕</button>
        </div>
      )}

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes chatbotTypingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes chatbotToastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes chatbotFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ====================== STYLES (inline, using CSS variables) ====================== */
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 70px - 4rem)',
    maxHeight: 'calc(100vh - 70px - 4rem)',
    backgroundColor: 'var(--bg-main)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--bordres)',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: 'var(--font-text)',
  },

  /* Header */
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--bg-cartes)',
    borderBottom: '1px solid var(--bordres)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'var(--main-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--main-text)',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--sec-text)',
    margin: 0,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: 'var(--main-green)',
    fontWeight: 500,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--main-green)',
    display: 'inline-block',
  },

  /* Messages Area */
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },

  /* Empty State */
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
    padding: '2rem',
  },
  emptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '20px',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  emptyTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--main-text)',
    margin: '0 0 0.5rem 0',
  },
  emptyText: {
    fontSize: '0.95rem',
    color: 'var(--sec-text)',
    maxWidth: '500px',
    lineHeight: 1.6,
    margin: '0 0 2rem 0',
  },
  suggestionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    maxWidth: '520px',
    width: '100%',
  },
  suggestionChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--bg-cartes)',
    border: '1px solid var(--bordres)',
    borderRadius: 'var(--radius)',
    color: 'var(--sec-text)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-text)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },

  /* Message Rows */
  messageRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    animation: 'chatbotFadeIn 0.3s ease-out',
  },
  avatarAI: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: 'var(--main-green)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    backgroundColor: 'var(--accent-blue)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: '0.85rem 1.1rem',
    borderRadius: '16px',
    lineHeight: 1.6,
    fontSize: '0.9rem',
    boxShadow: 'var(--shadow-sm)',
  },
  userBubble: {
    backgroundColor: 'var(--main-green)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  aiBubble: {
    backgroundColor: 'var(--bg-cartes)',
    color: 'var(--main-text)',
    border: '1px solid var(--bordres)',
    borderBottomLeftRadius: '4px',
  },
  errorBubble: {
    borderColor: 'var(--accent-red)',
    backgroundColor: 'var(--accent-red-light)',
  },
  messageContent: {
    wordBreak: 'break-word',
  },
  timestamp: {
    display: 'block',
    fontSize: '0.7rem',
    opacity: 0.6,
    marginTop: '6px',
  },

  /* Typing Indicator */
  typingIndicator: {
    display: 'flex',
    gap: '4px',
    padding: '4px 0',
    alignItems: 'center',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--main-green)',
    display: 'inline-block',
    animation: 'chatbotTypingBounce 1.2s ease-in-out infinite',
  },

  /* Input Area */
  inputArea: {
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--bg-cartes)',
    borderTop: '1px solid var(--bordres)',
    flexShrink: 0,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-main)',
    border: '1px solid var(--bordres)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  textInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontFamily: 'var(--font-text)',
    color: 'var(--main-text)',
    fontSize: '0.95rem',
    resize: 'none',
    lineHeight: 1.5,
    maxHeight: '120px',
  },
  sendButton: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'var(--main-green)',
    color: 'white',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  disclaimer: {
    fontSize: '0.72rem',
    color: 'var(--sec-text)',
    textAlign: 'center',
    margin: '8px 0 0 0',
    opacity: 0.7,
  },

  /* Toast */
  toast: {
    position: 'absolute',
    bottom: '90px',
    right: '1.5rem',
    backgroundColor: 'var(--accent-red)',
    color: 'white',
    padding: '0.75rem 1.25rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-text)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 8px 25px rgba(220, 38, 38, 0.3)',
    animation: 'chatbotToastSlideIn 0.3s ease-out',
    zIndex: 10,
  },
  toastClose: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1rem',
    opacity: 0.8,
    padding: 0,
  },
};
