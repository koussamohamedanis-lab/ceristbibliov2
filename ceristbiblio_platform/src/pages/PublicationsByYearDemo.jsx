import { useState, useEffect } from 'react'
import PublicationsChart from '../components/PublicationsChart'
import '../assets/dashboard.css'

/**
 * DEMO PAGE: Publications by Year Chart with Bibliometrix
 * 
 * This page demonstrates how to:
 * 1. Fetch publication data from the backend API
 * 2. Use bibliometrix to calculate H-index + publications_by_year
 * 3. Display the data using PublicationsChart component with bar/line toggles
 * 
 * Usage of publications_by_year from bibliometrix response:
 *   const result = await calculateGroupHIndex(publications)
 *   const pubsByYear = result.publications_by_year
 *   // Returns: [{year: 2017, count: 2}, {year: 2019, count: 4}, {year: 2024, count: 3}]
 */

const PublicationsByYearDemo = () => {
  const [publicationsByYear, setPublicationsByYear] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPublicationsByYear()
  }, [])

  const fetchPublicationsByYear = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('token')
      
      // Fetch user profile to get their ID
      const profileRes = await fetch('http://localhost:8000/auth/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      const profile = await profileRes.json()
      
      // Fetch user publications
      const pubRes = await fetch(
        `http://localhost:8000/api/users/${profile.id}/publications`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      
      if (!pubRes.ok) throw new Error('Failed to fetch publications')
      const pubs = await pubRes.json()
      
      // Call backend endpoint that uses bibliometrix (if available)
      // Format: /api/team/{team_id}/statistics or /hierarchy/statistics/global
      const statsRes = await fetch('http://localhost:8000/hierarchy/statistics/global', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (statsRes.ok) {
        const stats = await statsRes.json()
        if (stats.publications_by_year) {
          setPublicationsByYear(stats.publications_by_year)
          setMetrics({
            h_index: stats.h_index,
            g_index: stats.g_index,
            i10_index: stats.i10_index,
            total_publications: stats.total_publications,
            method: stats.method
          })
        }
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching publications:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Publications par Année (Bibliometrix)</h1>
        <p>Visualisez l'évolution de vos publications à travers les années</p>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px' }}>⏳ Chargement...</div>}
      {error && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>❌ Erreur: {error}</div>}

      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div style={{ background: 'var(--bg-cartes)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>H-Index</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--main-green)' }}>{metrics.h_index}</div>
          </div>
          <div style={{ background: 'var(--bg-cartes)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>G-Index</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--main-green)' }}>{metrics.g_index}</div>
          </div>
          <div style={{ background: 'var(--bg-cartes)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>i10-Index</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--main-green)' }}>{metrics.i10_index}</div>
          </div>
          <div style={{ background: 'var(--bg-cartes)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Total</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--main-green)' }}>{metrics.total_publications}</div>
          </div>
          <div style={{ background: 'var(--bg-cartes)', padding: '15px', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Mode</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: metrics.method.includes('r') ? '#4CAF50' : '#FF9800' }}>
              {metrics.method.includes('r') ? '🎯 R' : '🐍 Python'}
            </div>
          </div>
        </div>
      )}

      {!loading && publicationsByYear.length > 0 && (
        <>
          <div style={{ background: 'var(--bg-cartes)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <PublicationsChart 
              data={publicationsByYear} 
              chartType="bar"
              title="Évolution des Publications par Année"
            />
          </div>

          <div style={{ background: 'var(--bg-cartes)', padding: '20px', borderRadius: '8px' }}>
            <h3>💾 Données Brutes (JSON)</h3>
            <pre style={{ 
              background: 'var(--bg-body)', 
              padding: '15px', 
              borderRadius: '4px', 
              overflowX: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(publicationsByYear, null, 2)}
            </pre>
          </div>
        </>
      )}

      {!loading && publicationsByYear.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sec-text)' }}>
          ℹ️ Aucune donnée de publication disponible
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: 'var(--bg-cartes)', borderRadius: '8px', fontSize: '12px', color: 'var(--sec-text)' }}>
        <strong>📝 Info:</strong> Cet graphique utilise les données de bibliometrix (R ou Python fallback). 
        Les publications_by_year sont calculées à partir de l'API OpenAlex et traitées par le service bibliometrix du backend.
      </div>
    </div>
  )
}

export default PublicationsByYearDemo
