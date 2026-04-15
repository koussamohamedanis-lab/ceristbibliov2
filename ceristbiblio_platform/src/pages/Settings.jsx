import { useState, useEffect } from 'react'
import { FiLock, FiUser, FiSave, FiCheck, FiAlertCircle, FiLink } from 'react-icons/fi'
import { changePassword, updateProfile, getMyProfile } from '../services/api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile form
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    author_id_openalex: '',
  })

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadProfile()
    
    // Check if user was forced here to change password
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('force_password_change') === 'true') {
        setActiveTab('password')
        setMessage({ 
            type: 'error', 
            text: 'Pour des raisons de sécurité, vous devez modifier votre mot de passe par défaut avant de continuer.' 
        })
    }
  }, [])

  const loadProfile = async () => {
    try {
      const res = await getMyProfile()
      setProfile(res.data)
      setProfileForm({
        nom: res.data.nom || '',
        prenom: res.data.prenom || '',
        author_id_openalex: res.data.author_id_openalex || '',
      })
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const res = await updateProfile({
        nom: profileForm.nom || undefined,
        prenom: profileForm.prenom || undefined,
        author_id_openalex: profileForm.author_id_openalex || undefined,
      })
      setMessage({ type: 'success', text: res.data.message || 'Profil mis à jour' })
      // Update localStorage
      if (profileForm.nom || profileForm.prenom) {
        localStorage.setItem('userName', `${profileForm.prenom} ${profileForm.nom}`)
      }
      loadProfile()
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  const handlePasswordSave = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' })
      return
    }

    if (passwordForm.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' })
      return
    }

    setSaving(true)
    try {
      const res = await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setMessage({ type: 'success', text: res.data.message || 'Mot de passe modifié' })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Erreur' })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    }
  }

  const getRoleLabel = (role) => {
    const labels = {
      chercheur: 'Chercheur',
      chef_equipe: "Chef d'Équipe",
      chef_labo: 'Chef de Laboratoire',
      directeur: 'Directeur',
      tutelle: 'Tutelle',
    }
    return labels[role] || role
  }

  if (loading) {
    return <div className="dashboard-loading">Chargement...</div>
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">Paramètres</h1>
        <p className="settings-subtitle">Gérez votre profil et vos préférences</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.type === 'success' ? <FiCheck size={18} /> : <FiAlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="settings-profile-card">
        <div className="settings-avatar">
          {profile?.prenom?.[0]}{profile?.nom?.[0]}
        </div>
        <div className="settings-profile-info">
          <h2 className="settings-profile-name">{profile?.prenom} {profile?.nom}</h2>
          <p className="settings-profile-email">{profile?.email}</p>
          <div className="settings-badges">
            <span className="settings-role-badge">{getRoleLabel(profile?.role)}</span>
            {profile?.institution_name && (
              <span className="settings-org-badge">{profile.institution_name}</span>
            )}
            {profile?.labo_name && (
              <span className="settings-org-badge">{profile.labo_name}</span>
            )}
            {profile?.equipe_name && (
              <span className="settings-org-badge">{profile.equipe_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'profile' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('profile')}
          id="tab-profile"
        >
          <FiUser size={16} />
          <span>Profil</span>
        </button>
        <button
          className={`settings-tab ${activeTab === 'password' ? 'settings-tab-active' : ''}`}
          onClick={() => setActiveTab('password')}
          id="tab-password"
        >
          <FiLock size={16} />
          <span>Mot de passe</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleProfileSave} className="settings-form-card">
          <h3 className="settings-form-title">
            <FiUser size={18} />
            Informations du profil
          </h3>

          <div className="settings-form-row">
            <div className="settings-form-group">
              <label className="settings-label">Prénom</label>
              <input
                type="text"
                value={profileForm.prenom}
                onChange={(e) => setProfileForm(p => ({ ...p, prenom: e.target.value }))}
                className="settings-input"
                id="settings-prenom"
              />
            </div>
            <div className="settings-form-group">
              <label className="settings-label">Nom</label>
              <input
                type="text"
                value={profileForm.nom}
                onChange={(e) => setProfileForm(p => ({ ...p, nom: e.target.value }))}
                className="settings-input"
                id="settings-nom"
              />
            </div>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">
              <FiLink size={14} style={{ marginRight: 6 }} />
              OpenAlex Author ID
            </label>
            <input
              type="text"
              value={profileForm.author_id_openalex}
              onChange={(e) => setProfileForm(p => ({ ...p, author_id_openalex: e.target.value }))}
              placeholder="Ex: https://openalex.org/A5089722882"
              className="settings-input"
              id="settings-openalex"
            />
            <span className="settings-hint">
              Votre identifiant OpenAlex permet la synchronisation automatique de vos publications. 
              Trouvez-le sur <a href="https://openalex.org" target="_blank" rel="noopener noreferrer">openalex.org</a>
            </span>
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Email</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="settings-input settings-input-disabled"
            />
            <span className="settings-hint">L'email ne peut pas être modifié</span>
          </div>

          <button type="submit" disabled={saving} className="settings-save-btn" id="btn-save-profile">
            <FiSave size={16} />
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSave} className="settings-form-card">
          <h3 className="settings-form-title">
            <FiLock size={18} />
            Modifier le mot de passe
          </h3>

          <div className="settings-form-group">
            <label className="settings-label">Mot de passe actuel</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
              placeholder="••••••••"
              required
              className="settings-input"
              id="settings-current-password"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Nouveau mot de passe</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
              placeholder="••••••••"
              required
              minLength={6}
              className="settings-input"
              id="settings-new-password"
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
              placeholder="••••••••"
              required
              className="settings-input"
              id="settings-confirm-password"
            />
          </div>

          <button type="submit" disabled={saving} className="settings-save-btn" id="btn-save-password">
            <FiLock size={16} />
            {saving ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      )}
    </div>
  )
}
