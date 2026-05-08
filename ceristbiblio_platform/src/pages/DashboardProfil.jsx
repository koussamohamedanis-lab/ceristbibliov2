import { useEffect, useState } from 'react'
import { FiTrendingUp, FiBook, FiAward, FiRefreshCw, FiTarget, FiStar, FiFileText } from 'react-icons/fi'
import KPICard from '../components/KPICard'
import PublicationsChart from '../components/PublicationsChart'
import PublicationsTable from '../components/PublicationsTable'
import ProfileBadges from '../components/ProfileBadges'
import Comparaison from './Comparaison'
import api from '../services/api'

const DashboardProfil = () => {
  const [user, setUser] = useState(null)
  const [publications, setPublications] = useState([])
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState({ h_index: 0, total_citations: 0, total_publications: 0 })
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        let userId = localStorage.getItem('userId')
        let userName = localStorage.getItem('userName')
        let userEmail = localStorage.getItem('userEmail')
        let userRole = localStorage.getItem('userRole')

        // If data is missing or "null", fetch profile
        if (!userName || userName.includes('null') || !userRole) {
          const profileRes = await api.get('/auth/profile/me')
          const profile = profileRes.data
          userId = profile.id
          userRole = profile.role
          userName = `${profile.prenom} ${profile.nom}`
          userEmail = profile.email

          localStorage.setItem('userId', userId)
          localStorage.setItem('userRole', userRole)
          localStorage.setItem('userName', userName)
          localStorage.setItem('userEmail', userEmail)
        }

        setUser({
          id: userId,
          name: userName,
          email: userEmail,
          role: userRole
        })

        // Récupérer les statistiques depuis l'API selon le rôle
        try {
          const userRole = localStorage.getItem('userRole')
          let statsResponse;

          if (userRole === 'chef_labo') {
            // Stats aggrégées du laboratoire
            statsResponse = await api.get('/hierarchy/labos/me/stats')
          } else if (userRole === 'directeur') {
            // Stats aggrégées du directeur
            statsResponse = await api.get(`/hierarchy/statistics/director/${userId}`)
          } else if (userRole === 'tutelle') {
            // Stats globales
            statsResponse = await api.get('/hierarchy/statistics/global')
          } else {
            // Chercheur standard
            statsResponse = await api.get(`/api/users/${userId}/stats`)
          }



          // Mettre à jour les stats
          setStats({
            h_index: statsResponse.data.h_index || statsResponse.data.avg_h_index || 0,
            g_index: statsResponse.data.g_index || 0,
            i10_index: statsResponse.data.i10_index || 0,
            total_publications: statsResponse.data.total_publications || 0,
            total_citations: statsResponse.data.total_citations || 0,
            publications_by_year: statsResponse.data.publications_by_year || statsResponse.data.publication_by_year || {}
          })

          // Créer les données pour le graphique
          const yearlyData = statsResponse.data.publications_by_year || statsResponse.data.publication_by_year || {}

          // Gérer le format du retour (peut être un objet ou un tableau [année, count])
          let chartDataFormatted = []
          if (Array.isArray(yearlyData)) {
            // Check if it's array of objects or array of arrays
            chartDataFormatted = yearlyData.map(item => {
              if (Array.isArray(item)) return { year: item[0], count: item[1] };
              return { year: item.year, count: item.count };
            })
          } else {
            chartDataFormatted = Object.keys(yearlyData)
              .sort()
              .map(year => ({
                year: parseInt(year),
                count: yearlyData[year]
              }))
          }

          setChartData(chartDataFormatted)
        } catch (apiErr) {
          // Stats API may not be available for all roles
        }

        // Récupérer les publications depuis l'API
        try {
          const pubsResponse = await api.get(`/api/users/${userId}/publications`)

          const publications = pubsResponse.data.publications || []
          setPublications(publications)
        } catch (apiErr) {
          // Not all users will have publications, this is okay
          // Not all users will have publications, this is okay
        }

        // Récupérer les profils externes
        try {
          const profilesResponse = await api.get(`/api/users/${userId}/profiles`)
          setProfiles(profilesResponse.data)
        } catch (err) {
          // Profiles not critical
        }

        setLoading(false)
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err)
        setError('Impossible de charger les données')
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  const syncPublications = async () => {
    try {
      setSyncing(true)
      setSyncMessage(null)
      const userId = localStorage.getItem('userId')

      if (user?.role === 'tutelle' || user?.role === 'directeur') {
        const response = await api.post('/api/users/sync-openalex-bulk');
        setSyncMessage(`✓ ${response.data.message || 'Synchronisation globale terminée'}`);
      } else {
        const response = await api.post(`/api/users/${userId}/sync-openalex`);
        setSyncMessage(`✓ Synchronisation réussie`);
      }

      // Re-fetch stats visually
      let statsResponse;
      if (user?.role === 'chef_labo') {
        statsResponse = await api.get('/hierarchy/labos/me/stats')
      } else if (user?.role === 'directeur') {
        statsResponse = await api.get(`/hierarchy/statistics/director/${userId}`)
      } else if (user?.role === 'tutelle') {
        statsResponse = await api.get('/hierarchy/statistics/global')
      } else {
        statsResponse = await api.get(`/api/users/${userId}/stats`)
      }

      const pubsResponse = await api.get(`/api/users/${userId}/publications`)

      setPublications(pubsResponse.data.publications || [])

      setStats({
        h_index: statsResponse.data.h_index || statsResponse.data.avg_h_index || 0,
        g_index: statsResponse.data.g_index || 0,
        i10_index: statsResponse.data.i10_index || 0,
        total_publications: statsResponse.data.total_publications || 0,
        total_citations: statsResponse.data.total_citations || 0,
        publications_by_year: statsResponse.data.publications_by_year || statsResponse.data.publication_by_year || {}
      })

      const yearlyData = statsResponse.data.publications_by_year || statsResponse.data.publication_by_year || {}
      let chartDataFormatted = []
      if (Array.isArray(yearlyData)) {
        chartDataFormatted = yearlyData.map(item => {
          if (Array.isArray(item)) return { year: item[0], count: item[1] };
          return { year: item.year, count: item.count };
        })
      } else {
        chartDataFormatted = Object.keys(yearlyData)
          .sort()
          .map(year => ({
            year: parseInt(year),
            count: yearlyData[year]
          }))
      }

      setChartData(chartDataFormatted)

      // Masquer le message après 5 secondes
      setTimeout(() => setSyncMessage(null), 5000)
    } catch (err) {
      console.error('Erreur lors de la synchronisation:', err)
      setSyncMessage(`✗ ${err.response?.data?.detail || 'Erreur lors de la synchronisation'}`)
      setTimeout(() => setSyncMessage(null), 5000)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <div className="dashboard-loading">Chargement...</div>
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
      </div>
    )
  }

  // Récupération des valeurs de KPI
  const hIndex = stats?.h_index ?? 0
  const gIndex = stats?.g_index ?? 0
  const i10Index = stats?.i10_index ?? 0
  const totalCitations = stats?.total_citations ?? 0
  const totalPublications = stats?.total_publications ?? 0

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <div>
            <h1 className="dashboard-title">
              Tableau de Bord {user?.name && user.name !== 'null' ? `- ${user.name}` : ''}
            </h1>
            <p className="dashboard-subtitle">
              {user?.role === 'chercheur' ? 'Chercheur' :
                user?.role === 'chef_equipe' ? 'Chef d\'Équipe' :
                  user?.role === 'chef_labo' ? 'Chef de Laboratoire' :
                    user?.role === 'directeur' ? 'Directeur' :
                      user?.role === 'tutelle' ? 'Tutelle' : user?.role}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              className="export-btn"
              style={{ backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Exporter le dashboard en PDF"
            >
              <FiFileText size={16} /> Exporter PDF
            </button>
            <button
              onClick={syncPublications}
              disabled={syncing}
              className="sync-button"
              title={(user?.role === 'tutelle' || user?.role === 'directeur') ? "Lancer la mise à jour globale" : "Synchroniser les publications depuis OpenAlex"}
            >
              <FiRefreshCw size={20} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
              {syncing
                ? 'Synchronisation...'
                : ((user?.role === 'tutelle' || user?.role === 'directeur') ? 'Maj Globale' : 'Synchroniser OpenAlex')}
            </button>
          </div>
        </div>
        {syncMessage && (
          <div className={`sync-message ${syncMessage.startsWith('✓') ? 'success' : 'error'}`}>
            {syncMessage}
          </div>
        )}
      </div>

      {/* Section KPI */}
      <div className="kpi-section">
        <KPICard
          title={(user?.role === 'tutelle' || user?.role === 'directeur') ? "H-Index Moyen" : "H-Index"}
          value={hIndex}
          icon={<FiTrendingUp size={32} />}
        />
        <KPICard
          title={(user?.role === 'tutelle' || user?.role === 'directeur') ? "Citations Globales" : "Citations Totales"}
          value={totalCitations}
          icon={<FiAward size={32} />}
        />
        <KPICard
          title={(user?.role === 'tutelle' || user?.role === 'directeur') ? "Publications Globales" : "Publications"}
          value={totalPublications}
          icon={<FiBook size={32} />}
        />
        <KPICard
          title="G-Index"
          value={gIndex}
          icon={<FiTarget size={32} />}
        />
        <KPICard
          title="i10-Index"
          value={i10Index}
          icon={<FiStar size={32} />}
        />
      </div>

      {(user?.role === 'chercheur' || user?.role === 'chef_equipe' || user?.role === 'chef_labo') && (
        <>
          {/* Section Graphique */}
          <div className="dashboard-section">
            <PublicationsChart data={chartData} />
          </div>

          {/* Section Profils Externes */}
          <div className="dashboard-section">
            <ProfileBadges profiles={profiles} />
          </div>

          {/* Section Publications */}
          <div className="dashboard-section">
            <PublicationsTable publications={publications} />
          </div>
        </>
      )}

      {/* Section Comparaison (Hiérarchique) */}
      {(user?.role === 'tutelle' || user?.role === 'directeur' || user?.role === 'chef_labo') && (
        <div style={{ marginTop: (user?.role === 'tutelle' || user?.role === 'directeur') ? '0px' : '40px' }}>
          <Comparaison />
        </div>
      )}
    </div>
  )
}

export default DashboardProfil
