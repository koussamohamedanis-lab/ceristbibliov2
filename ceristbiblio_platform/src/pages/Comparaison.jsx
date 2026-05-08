import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../assets/dashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { FaSync } from 'react-icons/fa';

function Comparaison() {
  const [data, setData] = useState([]);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchDataToCompare(role);
  }, []);

  const fetchDataToCompare = async (role) => {
    try {
      setLoading(true);
      let comparedData = [];

      if (role === 'chef_labo') {
        // Need the lab ID. We can get it via the user's laboratories
        const labsRes = await api.get('/hierarchy/laboratories');
        if (labsRes.data && labsRes.data.length > 0) {
           const labId = labsRes.data[0].id;
           const response = await api.get(`/hierarchy/laboratories/${labId}/teams-comparison`);
           comparedData = response.data.map(t => ({
             name: t.name,
             publications: t.total_publications,
             citations: t.total_citations,
             h_index: t.avg_h_index,
             g_index: t.g_index,
             i10_index: t.i10_index
           }));
        }

      } else if (role === 'directeur') {
        const instRes = await api.get('/hierarchy/institutions');
        if (instRes.data && instRes.data.length > 0) {
           const instId = instRes.data[0].id;
           const response = await api.get(`/hierarchy/institutions/${instId}/laboratories-comparison`);
           comparedData = response.data.map(l => ({
             name: l.name,
             publications: l.total_publications,
             citations: l.total_citations,
             h_index: l.avg_h_index,
             g_index: l.g_index,
             i10_index: l.i10_index
           }));

           // Fetch Advanced Stats
           try {
              const advRes = await api.get(`/hierarchy/institutions/${instId}/advanced-mapping`);
              if (advRes.data) {
                setAdvancedStats(advRes.data);
              }
           } catch(e) { console.warn("No advanced stats", e); }
        }

      } else if (role === 'tutelle') {
        // We lack a specific per-institution stats endpoint for tutelle, but we can compute it if needed
        // For accurate data, we map over institutions 
        const response = await api.get('/hierarchy/institutions');
        const institutions = response.data.value || response.data;
        
        const statsPromises = institutions.map(async (inst) => {
             // For tutelle, directors hold the institution stats in the backend architecture
             try {
                if (inst.directeur_id) {
                    const statsRes = await api.get(`/hierarchy/statistics/director/${inst.directeur_id}`);
                    return {
                      name: inst.nom || inst.name,
                      publications: statsRes.data.total_publications || 0,
                      citations: statsRes.data.total_citations || 0,
                      h_index: statsRes.data.avg_h_index || statsRes.data.h_index || 0,
                      g_index: statsRes.data.g_index || 0,
                      i10_index: statsRes.data.i10_index || 0
                    };
                }
                return { name: inst.nom || inst.name, publications: 0, citations: 0, h_index: 0, g_index: 0, i10_index: 0 };
             } catch(e) {
                return { name: inst.nom || inst.name, publications: 0, citations: 0, h_index: 0, g_index: 0, i10_index: 0 };
             }
        });
        comparedData = await Promise.all(statsPromises);
        // ComparedData has been populated...
      }

      setData(comparedData);
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la récupération pour comparaison:", err);
      setError("Impossible de charger les données pour la comparaison.");
      setLoading(false);
    }
  };

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await api.post('/api/users/sync-openalex-bulk');
      setSyncStatus({ success: true, message: response.data.message });
      // Re-fetch data to update charts
      await fetchDataToCompare(userRole);
    } catch (err) {
      console.error(err);
      setSyncStatus({ success: false, message: "Erreur lors de la synchronisation." });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const getTitle = () => {
    if (userRole === 'chef_labo') return "Comparaison des Équipes de Mon Laboratoire";
    if (userRole === 'directeur') return "Comparaison des Laboratoires de Mon Institution";
    if (userRole === 'tutelle') return "Comparaison des Institutions (Niveau Ministère)";
    return "Comparaison Algorithmique";
  };

  if (loading) return <div className="dashboard-loading">Chargement des statistiques...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{getTitle()}</h1>
          <p>Analyse comparative des performances bibliométriques</p>
        </div>
        {(userRole === 'tutelle' || userRole === 'directeur') && (
          <div style={{ textAlign: 'right' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleGlobalSync}
              disabled={isSyncing}
            >
              <FaSync className={isSyncing ? "spin" : ""} /> 
              {isSyncing ? 'Synchronisation en cours...' : 'Forcer la Maj Globale'}
            </button>
            {syncStatus && (
              <p style={{ marginTop: '5px', fontSize: '13px', color: syncStatus.success ? 'var(--main-green)' : '#DC2626' }}>
                {syncStatus.message}
              </p>
            )}
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="empty-state">
           <p>Données insuffisantes pour faire une comparaison.</p>
        </div>
      ) : (
        <>
          <div className="dashboard-section" style={{ height: '480px' }}>
            <h3>Nombre de Publications par Entité</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="publications" fill="var(--main-green)" name="Publications" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-section" style={{ height: '480px' }}>
            <h3>Analyse Bibliométrique Exacte de l'Entité</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend verticalAlign="top" />
                <Bar dataKey="h_index" fill="#9333EA" name="H-Index" />
                <Bar dataKey="g_index" fill="#D97706" name="G-Index" />
                <Bar dataKey="i10_index" fill="#DC2626" name="i10-Index" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* --- ADVANCED BIBLIOMETRIX VISUALIZATIONS --- */}
          {advancedStats && advancedStats.radar && advancedStats.radar.length > 0 && (
            <div className="statistics-section" style={{ marginTop: '2.5rem' }}>
              <h2>Cartographie Thématique Avancée</h2>
              <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
                
                {/* RADAR CHART */}
                <div className="team-management-card" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <h3 style={{ marginBottom: 20, color: 'var(--main-text)' }}>Performance Qualitative Globale</h3>
                  <div style={{ width: '100%', height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={advancedStats.radar}>
                        <PolarGrid stroke="var(--bordres)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--sec-text)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Productivité" dataKey="Productivité" stroke="#16A34A" fill="#16A34A" fillOpacity={0.4} />
                        <Radar name="Impact" dataKey="Impact (Citations)" stroke="#2563EB" fill="#2563EB" fillOpacity={0.4} />
                        <Radar name="Qualité" dataKey="Qualité (H-Index)" stroke="#9333EA" fill="#9333EA" fillOpacity={0.4} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* THEMATIC MAP */}
                <div className="team-management-card" style={{ padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                  <h3 style={{ marginBottom: 20, color: 'var(--main-text)' }}>Carte Thématique (Positionnement Spatial)</h3>
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
                        <Scatter data={advancedStats.thematic} fill="#3b82f6" fillOpacity={0.7}>
                            {advancedStats.thematic.map((entry, index) => {
                                const colors = {
                                    "Motor": "#ef4444",
                                    "Niche": "#8b5cf6",
                                    "Emergent": "#f59e0b",
                                    "Basic": "#10b981"
                                };
                                return <Cell key={`cell-${index}`} fill={colors[entry.category] || "#3b82f6"} />;
                            })}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {userRole === 'directeur' && (
             <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <a href="/rapports" className="btn-primary">Rédiger un Rapport au Ministère</a>
             </div>
          )}
        </>
      )}
    </div>
  );
}

export default Comparaison;
