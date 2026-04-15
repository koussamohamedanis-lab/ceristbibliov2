import axios from 'axios'

const api = axios.create({
    baseURL: 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add JWT token to all requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password })
export const register = (userData) => api.post('/auth/register', userData)
export const getUser = (userId) => api.get(`/auth/${userId}`)

// Researchers
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

export default api