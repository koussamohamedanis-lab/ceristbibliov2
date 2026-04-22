import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { FaBook, FaUsers, FaFlask, FaTrophy, FaUserTie, FaNetworkWired, FaQuoteRight, FaBullseye, FaStar } from 'react-icons/fa';
import api from '../services/api';

function GlobalStatistics() {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const userRole = localStorage.getItem('userRole') || '';

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const role = localStorage.getItem('role');
      
      // Fetch global statistics from backend
      const response = await api.get('/hierarchy/statistics/global');
      const data = response.data;
      
      setStatistics({
        total_directors: data.total_directors || 0,
        total_laboratories: data.total_laboratories || 0,
        total_teams: data.total_teams || 0,
        total_researchers: data.total_researchers || 0,
        total_publications: data.total_publications || 0,
        total_citations: data.total_citations || 0,
        avg_h_index: data.avg_h_index || 0,
        g_index: data.g_index || 0,
        i10_index: data.i10_index || 0
      });

      // Fetch advanced bibliometric mapping globally (auto-scoped by backend for tutelle, directeur, etc)
      try {
        const advRes = await api.get(`/hierarchy/statistics/global-advanced-mapping`);
        if (advRes.data) {
          setAdvancedStats(advRes.data);
        }
      } catch (e) {
        console.warn("Advanced Mapping unavailable", e);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  if (loading) return <div className="dashboard-container"><p>Chargement...</p></div>;
  if (error) return <div className="dashboard-container"><p className="error-message">Erreur: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Statistiques Globales</h1>
        <p>Aperçu global des activités et performances de l'institution</p>
      </div>

      <div className="dashboard-content">
        <div className="kpi-section">
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-blue-light)' }}>
              <FaBook style={{ color: 'var(--accent-blue)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">Publications</p>
              <p className="kpi-value">{statistics?.total_publications || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-purple-light)' }}>
              <FaUsers style={{ color: 'var(--accent-purple)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">Chercheurs</p>
              <p className="kpi-value">{statistics?.total_researchers || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--color-lab-light)' }}>
              <FaFlask style={{ color: 'var(--color-lab)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">Laboratoires</p>
              <p className="kpi-value">{statistics?.total_laboratories || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--color-team-light)' }}>
              <FaNetworkWired style={{ color: 'var(--color-team)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">Équipes</p>
              <p className="kpi-value">{statistics?.total_teams || 0}</p>
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-amber-light)' }}>
              <FaTrophy style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">H-Index Global</p>
              <p className="kpi-value">{statistics?.avg_h_index || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
              <FaBullseye style={{ color: 'var(--accent-amber)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">G-Index Global</p>
              <p className="kpi-value">{statistics?.g_index || 0}</p>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)' }}>
              <FaStar style={{ color: 'var(--accent-red)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">i10-Index Global</p>
              <p className="kpi-value">{statistics?.i10_index || 0}</p>
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-teal-light)' }}>
              <FaQuoteRight style={{ color: 'var(--accent-teal)' }} />
            </div>
            <div className="kpi-content">
              <p className="kpi-title">Citations Totales</p>
              <p className="kpi-value">{statistics?.total_citations || 0}</p>
            </div>
          </div>

          {userRole === 'tutelle' && (
            <div className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: 'var(--color-institution-light)' }}>
                <FaUserTie style={{ color: 'var(--color-institution)' }} />
              </div>
              <div className="kpi-content">
                <p className="kpi-title">Directeurs</p>
                <p className="kpi-value">{statistics?.total_directors || 0}</p>
              </div>
            </div>
          )}
        </div>



        {/* --- ADVANCED BIBLIOMETRIX VISUALIZATIONS --- */}
        {advancedStats && advancedStats.radar && advancedStats.radar.length > 0 && (
          <div className="statistics-section" style={{ marginTop: '2.5rem' }}>
            <h2>Analyse Bibliométrique Avancée</h2>
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
              
              {/* RADAR CHART */}
              <div className="team-management-card" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <h3 style={{ marginBottom: 20, color: 'var(--main-text)' }}>Performance par Laboratoire/Profil</h3>
                <div style={{ width: '100%', height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={advancedStats.radar}>
                      <PolarGrid stroke="var(--bordres)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--sec-text)', fontSize: 11, fontWeight: '500' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Productivité" dataKey="Productivité" stroke="var(--main-green)" fill="var(--main-green)" fillOpacity={0.4} />
                      <Radar name="Impact" dataKey="Impact (Citations)" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.4} />
                      <Radar name="Qualité" dataKey="Qualité (H-Index)" stroke="var(--accent-purple)" fill="var(--accent-purple)" fillOpacity={0.4} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* THEMATIC MAP */}
              <div className="team-management-card" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <h3 style={{ marginBottom: 20, color: 'var(--main-text)' }}>Carte Thématique Institutionnelle</h3>
                <div style={{ width: '100%', height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
                      <XAxis type="number" dataKey="x" name="Centralité" tick={false} axisLine={{ stroke: 'var(--bordres)' }} />
                      <YAxis type="number" dataKey="y" name="Densité" tick={false} axisLine={{ stroke: 'var(--bordres)' }} />
                      <ZAxis type="number" dataKey="z" range={[150, 1200]} name="Volume" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        content={({ payload }) => {
                          if (payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div style={{ background: 'var(--bg-cartes)', padding: '12px', border: '1px solid var(--bordres)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)' }}>
                                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', color: 'var(--main-text)' }}>{d.name}</p>
                                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--sec-text)' }}>Position: <strong>{d.category}</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }} 
                      />
                      <Scatter data={advancedStats.thematic} fillOpacity={0.7}>
                          {advancedStats.thematic.map((entry, index) => {
                              const colors = {
                                  "Motor": "var(--accent-red)",
                                  "Niche": "var(--accent-purple)",
                                  "Emergent": "var(--accent-amber)",
                                  "Basic": "var(--main-green)"
                              };
                              return <Cell key={`cell-${index}`} fill={colors[entry.category] || "var(--accent-blue)"} />;
                          })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default GlobalStatistics;
