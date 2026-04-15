import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import '../assets/auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(email, password)
      if (response.data.access_token) {
        localStorage.setItem('access_token', response.data.access_token)
        localStorage.setItem('userId', response.data.user_id)
        localStorage.setItem('userRole', response.data.role)
        localStorage.setItem('userName', `${response.data.prenom} ${response.data.nom}`)
        localStorage.setItem('userEmail', response.data.email)
        localStorage.setItem('laboId', response.data.labo_id || 'null')
        localStorage.setItem('institutionId', response.data.institution_id || 'null')
        localStorage.setItem('equipeId', response.data.equipe_id || 'null')
        localStorage.setItem('authorIdOpenalex', response.data.author_id_openalex || '')
        
        if (response.data.must_change_password) {
            window.location.href = '/settings?force_password_change=true'
        } else {
            window.location.href = '/'
        }
      } else {
        setError('Réponse serveur invalide')
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">CERIST Platform</h1>
          <p className="auth-subtitle">Connexion</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-form-group">
            <label className="auth-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="auth-input"
            />
          </div>

          <div className="auth-form-group">
            <label className="auth-label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="auth-input"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-footer-text">
            Pas encore de compte?
            <span
              onClick={() => navigate('/register')}
              className="auth-link"
            >
              S'inscrire
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
