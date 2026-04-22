import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 600000 // Timeout global de 10 minutes pour la synchronisation
})

// ====================== JWT TOKEN HELPER ======================

/**
 * Vérifie si le token JWT est expiré en décodant le payload.
 * Retourne true si le token est expiré ou invalide.
 */
function isTokenExpired(token) {
    if (!token) return true
    try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        // exp est en secondes, Date.now() en millisecondes
        return payload.exp * 1000 < Date.now()
    } catch (e) {
        return true // Token malformé = expiré
    }
}

/**
 * Supprime les données de session et redirige vers /login.
 */
function forceLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('userId')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userName')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('laboId')
    localStorage.removeItem('institutionId')
    localStorage.removeItem('equipeId')
    localStorage.removeItem('authorIdOpenalex')
    window.location.href = '/login'
}

// ====================== REQUEST INTERCEPTOR ======================

// Ajoute le JWT token à chaque requête ET vérifie l'expiration AVANT d'envoyer
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    
    // Vérifier l'expiration du token avant toute requête
    if (token) {
        if (isTokenExpired(token)) {
            // Token expiré → déconnexion automatique
            forceLogout()
            return Promise.reject(new Error('Token expiré - déconnexion automatique'))
        }
        config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
}, (error) => {
    return Promise.reject(error)
})

// ====================== RESPONSE INTERCEPTOR ======================

// Intercepte les erreurs 401 retournées par le backend (token invalide/expiré côté serveur)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Erreur 401 du backend → Token expiré ou invalide
        if (error.response && error.response.status === 401) {
            const detail = error.response.data?.detail || ''
            
            // Ne pas forcer la déconnexion sur les erreurs de login (mauvais mot de passe)
            if (!error.config.url?.includes('/auth/login')) {
                console.warn('[Auth] Token invalide ou expiré - déconnexion automatique')
                forceLogout()
                return Promise.reject(error)
            }
        }

        // Erreur de timeout → Message propre
        if (error.code === 'ECONNABORTED') {
            error.friendlyMessage = 'Service temporairement indisponible (délai dépassé). Veuillez réessayer.'
        }

        // Erreur réseau (serveur down) → Message propre
        if (!error.response && error.message === 'Network Error') {
            error.friendlyMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.'
        }

        // Erreur 500 → Message propre
        if (error.response && error.response.status >= 500) {
            error.friendlyMessage = 'Service temporairement indisponible. Veuillez réessayer.'
        }

        return Promise.reject(error)
    }
)

// ====================== AUTH ENDPOINTS ======================

export const login = (email, password) => api.post('/auth/login', { email, password })
export const register = (userData) => api.post('/auth/register', userData)
export const getUser = (userId) => api.get(`/auth/${userId}`)

// ====================== RESEARCHERS ======================

export const searchResearcher = (name) => api.get(`/api/researcher/${name}`)
export const getAuthorWorks = (authorId) => api.get(`/api/researcher/${authorId}/works`)

// ==================== HIERARCHY ENDPOINTS ====================

// Directors
export const getAllDirectors = () => api.get('/hierarchy/directors')
export const getDirectorDetails = (directorId) => api.get(`/hierarchy/directors/${directorId}`)

// Laboratories
export const getAllLaboratories = () => api.get('/hierarchy/laboratories')
export const getLaboratoryDetails = (labId) => api.get(`/hierarchy/laboratories/${labId}`)
export const createLaboratory = (labData) => api.post('/hierarchy/laboratories', labData)

// Teams
export const getAllTeams = () => api.get('/hierarchy/teams')
export const getTeamDetails = (teamId) => api.get(`/hierarchy/teams/${teamId}`)
export const createTeam = (teamData) => api.post('/hierarchy/teams', teamData)

// Statistics
export const getDirectorStatistics = (directorId) => api.get(`/hierarchy/statistics/director/${directorId}`)
export const getLaboratoryStatistics = (labId) => api.get(`/hierarchy/statistics/laboratory/${labId}`)
export const getTeamStatistics = (teamId) => api.get(`/hierarchy/statistics/team/${teamId}`)
export const getLabAdvancedMapping = (labId) => api.get(`/hierarchy/laboratories/${labId}/advanced-mapping`)
export const getInstitutionAdvancedMapping = (institutionId) => api.get(`/hierarchy/institutions/${institutionId}/advanced-mapping`)


// Search
export const searchHierarchy = (query) => api.get('/hierarchy/search', { params: { q: query } })

// Institutions & Tutelles
export const getAllInstitutions = () => api.get('/hierarchy/institutions')
export const getInstitutionDetails = (institutionId) => api.get(`/hierarchy/institutions/${institutionId}`)
export const getAllTutelles = () => api.get('/hierarchy/tutelles')
export const getTutelleFullHierarchy = () => api.get('/hierarchy/tutelle/full-hierarchy')

// Roles Stats
export const getMyLabStats = () => api.get('/hierarchy/labos/me/stats')

// ==================== REGISTRATION ENDPOINTS ====================

// Public endpoints for registration form cascading selects
export const getPublicTutelles = () => api.get('/registration/public/tutelles')
export const getPublicInstitutions = (tutelleId) => api.get('/registration/public/institutions', { params: tutelleId ? { tutelle_id: tutelleId } : {} })
export const getPublicLaboratoires = (institutionId) => api.get('/registration/public/laboratoires', { params: institutionId ? { institution_id: institutionId } : {} })
export const getPublicEquipes = (laboId) => api.get('/registration/public/equipes', { params: laboId ? { labo_id: laboId } : {} })

// Role-based registration
export const registerChercheur = (data) => api.post('/registration/chercheur', data)
export const registerChefEquipe = (data) => api.post('/registration/chef_equipe', data)
export const registerChefLabo = (data) => api.post('/registration/chef_labo', data)
export const registerDirecteur = (data) => api.post('/registration/directeur', data)

// Profile & Settings
export const changePassword = (data) => api.post('/registration/change-password', data)
export const updateProfile = (data) => api.put('/registration/profile', data)
export const getMyProfile = () => api.get('/auth/profile/me')

// ==================== CHATBOT ENDPOINT ====================

export const chatAsk = (message) => api.post('/chat/ask', { message })

// Profile Picture Upload
export const uploadAvatar = (formData) => api.post('/registration/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
})

export default api