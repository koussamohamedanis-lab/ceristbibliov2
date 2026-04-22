import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPublicTutelles,
  getPublicInstitutions,
  getPublicLaboratoires,
  getPublicEquipes,
  registerChercheur,
  registerChefEquipe,
  registerChefLabo,
  registerDirecteur,
} from '../services/api'
import '../assets/auth.css'

const ROLES = [
  { value: 'chercheur', label: 'Chercheur', icon: '🔬', desc: 'Recherche individuelle' },
  { value: 'chef_equipe', label: "Chef d'Équipe", icon: '👥', desc: 'Gérer votre équipe' },
  { value: 'chef_labo', label: 'Chef de Laboratoire', icon: '🏛️', desc: 'Diriger un laboratoire' },
  { value: 'directeur', label: "Directeur d'Institution", icon: '🎓', desc: 'Diriger une institution' },
]

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: role, 2: org, 3: info
  const [selectedRole, setSelectedRole] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Org data for cascading selects
  const [tutelles, setTutelles] = useState([])
  const [institutions, setInstitutions] = useState([])
  const [laboratoires, setLaboratoires] = useState([])
  const [equipes, setEquipes] = useState([])

  // Form data
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: '',
    author_id_openalex: '',
    phone_number: '',
    date_of_birth: '',
    // Org selections
    tutelle_id: '',
    institution_id: '',
    labo_id: '',
    equipe_id: '',
    // Names for new entities
    equipe_name: '',
    labo_name: '',
    institution_name: '',
    ville: '',
  })

  // Load tutelles on mount
  useEffect(() => {
    getPublicTutelles()
      .then(res => setTutelles(res.data))
      .catch(() => {})
  }, [])

  // Load institutions when tutelle changes (for directeur)
  useEffect(() => {
    if (formData.tutelle_id) {
      getPublicInstitutions(formData.tutelle_id)
        .then(res => setInstitutions(res.data))
        .catch(() => {})
    } else {
      // Load all institutions
      getPublicInstitutions()
        .then(res => setInstitutions(res.data))
        .catch(() => {})
    }
  }, [formData.tutelle_id])

  // Load laboratoires when institution changes
  useEffect(() => {
    if (formData.institution_id) {
      getPublicLaboratoires(formData.institution_id)
        .then(res => setLaboratoires(res.data))
        .catch(() => {})
    } else {
      setLaboratoires([])
    }
    setFormData(prev => ({ ...prev, labo_id: '', equipe_id: '' }))
  }, [formData.institution_id])

  // Load equipes when labo changes
  useEffect(() => {
    if (formData.labo_id) {
      getPublicEquipes(formData.labo_id)
        .then(res => setEquipes(res.data))
        .catch(() => {})
    } else {
      setEquipes([])
    }
    setFormData(prev => ({ ...prev, equipe_id: '' }))
  }, [formData.labo_id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const selectRole = (role) => {
    setSelectedRole(role)
    setError('')
    setStep(2)
  }

  const canProceedToStep3 = () => {
    switch (selectedRole) {
      case 'chercheur':
        return !!formData.equipe_id
      case 'chef_equipe':
        return !!formData.labo_id && !!formData.equipe_name.trim()
      case 'chef_labo':
        return !!formData.institution_id && !!formData.labo_name.trim()
      case 'directeur':
        return !!formData.tutelle_id && !!formData.institution_name.trim()
      default:
        return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (!formData.date_of_birth) {
      setError('La date de naissance est obligatoire')
      return
    }

    setLoading(true)
    try {
      let response
      switch (selectedRole) {
        case 'chercheur':
          response = await registerChercheur({
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            password: formData.password,
            equipe_id: parseInt(formData.equipe_id),
            author_id_openalex: formData.author_id_openalex || null,
            phone_number: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
          })
          break
        case 'chef_equipe':
          response = await registerChefEquipe({
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            password: formData.password,
            labo_id: parseInt(formData.labo_id),
            equipe_name: formData.equipe_name,
            author_id_openalex: formData.author_id_openalex || null,
            phone_number: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
          })
          break
        case 'chef_labo':
          response = await registerChefLabo({
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            password: formData.password,
            institution_id: parseInt(formData.institution_id),
            labo_name: formData.labo_name,
            phone_number: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
          })
          break
        case 'directeur':
          response = await registerDirecteur({
            nom: formData.nom,
            prenom: formData.prenom,
            email: formData.email,
            password: formData.password,
            tutelle_id: parseInt(formData.tutelle_id),
            institution_name: formData.institution_name,
            ville: formData.ville || 'Algérie',
            phone_number: formData.phone_number || null,
            date_of_birth: formData.date_of_birth || null,
          })
          break
        default:
          setError('Rôle invalide')
          return
      }

      const data = response.data
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('userId', data.user_id)
        localStorage.setItem('userRole', data.role)
        localStorage.setItem('userName', `${data.prenom} ${data.nom}`)
        localStorage.setItem('userEmail', data.email)
        localStorage.setItem('laboId', data.labo_id || 'null')
        localStorage.setItem('institutionId', data.institution_id || 'null')
        window.location.href = '/'
      } else {
        navigate('/login')
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  // ==================== STEP 1: ROLE SELECTION ====================
  const renderStep1 = () => (
    <div className="register-step">
      <h2 className="register-step-title">Choisissez votre rôle</h2>
      <p className="register-step-desc">Sélectionnez le rôle qui correspond à votre fonction</p>
      <div className="role-cards-grid">
        {ROLES.map(role => (
          <div
            key={role.value}
            className={`role-card ${selectedRole === role.value ? 'role-card-selected' : ''}`}
            onClick={() => selectRole(role.value)}
            id={`role-card-${role.value}`}
          >
            <span className="role-card-icon">{role.icon}</span>
            <h3 className="role-card-title">{role.label}</h3>
            <p className="role-card-desc">{role.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  // ==================== STEP 2: ORG SELECTION ====================
  const renderStep2 = () => {
    const roleLabel = ROLES.find(r => r.value === selectedRole)?.label || ''

    return (
      <div className="register-step">
        <h2 className="register-step-title">Structure organisationnelle</h2>
        <p className="register-step-desc">
          En tant que <strong>{roleLabel}</strong>, veuillez sélectionner votre rattachement
        </p>

        <div className="org-form">
          {/* CHERCHEUR: select institution -> labo -> equipe */}
          {selectedRole === 'chercheur' && (
            <>
              <div className="auth-form-group">
                <label className="auth-label">Institution</label>
                <select
                  name="institution_id"
                  value={formData.institution_id}
                  onChange={handleChange}
                  className="auth-input auth-select"
                  id="select-institution"
                >
                  <option value="">-- Sélectionner une institution --</option>
                  {institutions.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              {formData.institution_id && (
                <div className="auth-form-group cascade-in">
                  <label className="auth-label">Laboratoire</label>
                  <select
                    name="labo_id"
                    value={formData.labo_id}
                    onChange={handleChange}
                    className="auth-input auth-select"
                    id="select-labo"
                  >
                    <option value="">-- Sélectionner un laboratoire --</option>
                    {laboratoires.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.labo_id && (
                <div className="auth-form-group cascade-in">
                  <label className="auth-label">Équipe</label>
                  <select
                    name="equipe_id"
                    value={formData.equipe_id}
                    onChange={handleChange}
                    className="auth-input auth-select"
                    id="select-equipe"
                  >
                    <option value="">-- Sélectionner une équipe --</option>
                    {equipes.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* CHEF D'EQUIPE: select institution -> labo + name equipe */}
          {selectedRole === 'chef_equipe' && (
            <>
              <div className="auth-form-group">
                <label className="auth-label">Institution</label>
                <select
                  name="institution_id"
                  value={formData.institution_id}
                  onChange={handleChange}
                  className="auth-input auth-select"
                  id="select-institution"
                >
                  <option value="">-- Sélectionner une institution --</option>
                  {institutions.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              {formData.institution_id && (
                <div className="auth-form-group cascade-in">
                  <label className="auth-label">Laboratoire de rattachement</label>
                  <select
                    name="labo_id"
                    value={formData.labo_id}
                    onChange={handleChange}
                    className="auth-input auth-select"
                    id="select-labo"
                  >
                    <option value="">-- Sélectionner un laboratoire --</option>
                    {laboratoires.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.labo_id && (
                <div className="auth-form-group cascade-in">
                  <label className="auth-label">Nom de votre nouvelle équipe</label>
                  <input
                    type="text"
                    name="equipe_name"
                    value={formData.equipe_name}
                    onChange={handleChange}
                    placeholder="Ex: Bioinformatique-Avancée"
                    className="auth-input"
                    id="input-equipe-name"
                  />
                </div>
              )}
            </>
          )}

          {/* CHEF DE LABO: select institution + name labo */}
          {selectedRole === 'chef_labo' && (
            <>
              <div className="auth-form-group">
                <label className="auth-label">Institution de rattachement</label>
                <select
                  name="institution_id"
                  value={formData.institution_id}
                  onChange={handleChange}
                  className="auth-input auth-select"
                  id="select-institution"
                >
                  <option value="">-- Sélectionner une institution --</option>
                  {institutions.map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>

              {formData.institution_id && (
                <div className="auth-form-group cascade-in">
                  <label className="auth-label">Nom de votre nouveau laboratoire</label>
                  <input
                    type="text"
                    name="labo_name"
                    value={formData.labo_name}
                    onChange={handleChange}
                    placeholder="Ex: Laboratoire IA et Machine Learning"
                    className="auth-input"
                    id="input-labo-name"
                  />
                </div>
              )}
            </>
          )}

          {/* DIRECTEUR: select tutelle + name institution */}
          {selectedRole === 'directeur' && (
            <>
              <div className="auth-form-group">
                <label className="auth-label">Tutelle de rattachement</label>
                <select
                  name="tutelle_id"
                  value={formData.tutelle_id}
                  onChange={handleChange}
                  className="auth-input auth-select"
                  id="select-tutelle"
                >
                  <option value="">-- Sélectionner une tutelle --</option>
                  {tutelles.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {formData.tutelle_id && (
                <>
                  <div className="auth-form-group cascade-in">
                    <label className="auth-label">Nom de votre institution</label>
                    <input
                      type="text"
                      name="institution_name"
                      value={formData.institution_name}
                      onChange={handleChange}
                      placeholder="Ex: Centre de Recherche en Intelligence Artificielle"
                      className="auth-input"
                      id="input-institution-name"
                    />
                  </div>
                  <div className="auth-form-group cascade-in">
                    <label className="auth-label">Ville</label>
                    <input
                      type="text"
                      name="ville"
                      value={formData.ville}
                      onChange={handleChange}
                      placeholder="Ex: Alger"
                      className="auth-input"
                      id="input-ville"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="register-nav">
          <button
            type="button"
            className="auth-btn auth-btn-outline"
            onClick={() => { setStep(1); setSelectedRole(''); setError('') }}
          >
            ← Retour
          </button>
          <button
            type="button"
            className="auth-btn"
            disabled={!canProceedToStep3()}
            onClick={() => { setStep(3); setError('') }}
          >
            Continuer →
          </button>
        </div>
      </div>
    )
  }

  // ==================== STEP 3: PERSONAL INFO ====================
  const renderStep3 = () => (
    <form onSubmit={handleSubmit} className="register-step">
      <h2 className="register-step-title">Informations personnelles</h2>
      <p className="register-step-desc">Complétez votre profil pour finaliser l'inscription</p>

      <div className="auth-row">
        <div className="auth-form-group">
          <label className="auth-label">Nom</label>
          <input
            type="text"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
            placeholder="Votre nom"
            required
            className="auth-input"
            id="input-nom"
          />
        </div>
        <div className="auth-form-group">
          <label className="auth-label">Prénom</label>
          <input
            type="text"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
            placeholder="Votre prénom"
            required
            className="auth-input"
            id="input-prenom"
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label className="auth-label">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="votre@email.com"
          required
          className="auth-input"
          id="input-email"
        />
      </div>

      {(selectedRole === 'chercheur' || selectedRole === 'chef_equipe') && (
        <div className="auth-form-group">
          <label className="auth-label">
            OpenAlex Author ID <span className="auth-label-optional">(optionnel)</span>
          </label>
          <input
            type="text"
            name="author_id_openalex"
            value={formData.author_id_openalex}
            onChange={handleChange}
            placeholder="Ex: A5089722882"
            className="auth-input"
            id="input-openalex"
          />
          <span className="auth-hint">Permet de synchroniser automatiquement vos publications</span>
        </div>
      )}

      <div className="auth-row">
        <div className="auth-form-group">
          <label className="auth-label">Date de naissance <span style={{ color: 'var(--accent-red)' }}>*</span></label>
          <input
            type="date"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
            required
            className="auth-input"
            id="input-date-of-birth"
            max={new Date().toISOString().split('T')[0]}
          />
          <span className="auth-hint">Obligatoire et non modifiable après inscription</span>
        </div>
        <div className="auth-form-group">
          <label className="auth-label">
            Téléphone <span className="auth-label-optional">(optionnel)</span>
          </label>
          <input
            type="tel"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="Ex: +213 555 123 456"
            className="auth-input"
            id="input-phone"
          />
        </div>
      </div>

      <div className="auth-form-group">
        <label className="auth-label">Mot de passe</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          required
          minLength={6}
          className="auth-input"
          id="input-password"
        />
      </div>

      <div className="auth-form-group">
        <label className="auth-label">Confirmer le mot de passe</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          required
          className="auth-input"
          id="input-confirm-password"
        />
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="register-nav">
        <button
          type="button"
          className="auth-btn auth-btn-outline"
          onClick={() => { setStep(2); setError('') }}
        >
          ← Retour
        </button>
        <button type="submit" disabled={loading} className="auth-btn" id="btn-register-submit">
          {loading ? 'Inscription en cours...' : "S'inscrire"}
        </button>
      </div>
    </form>
  )

  // ==================== PROGRESS INDICATOR ====================
  const renderProgress = () => (
    <div className="register-progress">
      {[1, 2, 3].map(s => (
        <div key={s} className={`progress-step ${step >= s ? 'progress-step-active' : ''} ${step === s ? 'progress-step-current' : ''}`}>
          <div className="progress-dot">{step > s ? '✓' : s}</div>
          <span className="progress-label">
            {s === 1 ? 'Rôle' : s === 2 ? 'Organisation' : 'Profil'}
          </span>
        </div>
      ))}
      <div className="progress-line">
        <div className="progress-line-fill" style={{ width: `${((step - 1) / 2) * 100}%` }} />
      </div>
    </div>
  )

  // ==================== SELECTED ROLE BADGE ====================
  const renderRoleBadge = () => {
    if (!selectedRole || step === 1) return null
    const role = ROLES.find(r => r.value === selectedRole)
    return (
      <div className="selected-role-badge">
        <span>{role.icon}</span>
        <span>{role.label}</span>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className={`auth-card ${step === 1 ? 'auth-card-wide' : ''}`}>
        <div className="auth-header">
          <h1 className="auth-title">CERIST Platform</h1>
          <p className="auth-subtitle">Inscription</p>
          {renderRoleBadge()}
        </div>

        {renderProgress()}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="auth-footer">
          <p className="auth-footer-text">
            Déjà inscrit?
            <span onClick={() => navigate('/login')} className="auth-link">
              Se connecter
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
