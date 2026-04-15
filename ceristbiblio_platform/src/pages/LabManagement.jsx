import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis } from 'recharts';


function LabManagement() {
  const [labStats, setLabStats] = useState(null);
  const [teamsComparison, setTeamsComparison] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);

  const COLORS = ['#16A34A', '#2563EB', '#D97706', '#9333EA', '#DC2626'];


  useEffect(() => {
    fetchData();
  }, []);

  const handleViewTeam = async (team) => {
    setSelectedTeam(team);
    setTeamMembers([]);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/hierarchy/teams/${team.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.chercheurs || []);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des membres:", err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      // 1. Fetch lab basic stats
      const statsRes = await fetch(`http://localhost:8000/hierarchy/labos/me/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (statsRes.ok) {
          const data = await statsRes.json();
          setLabStats(data);
          
          const labId = data.id;
          
          // 2. Fetch teams comparison
          const comparisonRes = await fetch(`http://localhost:8000/hierarchy/laboratories/${labId}/teams-comparison`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (comparisonRes.ok) {
              const compData = await comparisonRes.json();
              setTeamsComparison(compData);
          }

          // 3. Fetch Advanced Mapping
          try {
            const advRes = await fetch(`http://localhost:8000/hierarchy/laboratories/${labId}/advanced-mapping`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (advRes.ok) {
              const advData = await advRes.json();
              setAdvancedStats(advData);
            }
          } catch (e) {
            console.warn("Advanced stats not available");
          }
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
        <h1>Mon Laboratoire : {labStats?.name}</h1>
        <p>Pilotage et comparaison des équipes de recherche</p>
      </div>

      <div className="dashboard-content">
        {/* Lab Stats Summary */}
        <div className="dashboard-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2rem' }}>
          <div className="stat-card">
            <h3>Équipes</h3>
            <p className="stat-number">{labStats?.teams_count || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Chercheurs</h3>
            <p className="stat-number">{labStats?.members_count || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Publications</h3>
            <p className="stat-number">{labStats?.total_publications || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Citations</h3>
            <p className="stat-number">{labStats?.total_citations || 0}</p>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="team-management-card chart-card" style={{ marginBottom: '2rem' }}>
          <h2>Comparaison de Performance des Équipes</h2>
          <div style={{ width: '100%', height: 400, marginTop: '1.5rem' }}>
            {teamsComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamsComparison}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'var(--bg-main)'}}
                    contentStyle={{borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-md)'}}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="total_publications" name="Publications" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_citations" name="Citations" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avg_h_index" name="H-Index (Équipe)" fill="#9333EA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="g_index" name="G-Index" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">Aucune équipe à comparer</p>
            )}
          </div>
        </div>
        
        {/* --- ADVANCED BIBLIOMETRIX VISUALIZATIONS --- */}
        {advancedStats && advancedStats.radar && advancedStats.radar.length > 0 && (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: '2rem' }}>
            
            {/* RADAR CHART - MEMBER COMPARISON */}
            <div className="team-management-card">
              <h2 style={{ marginBottom: 16 }}>Performance Comparative des Chercheurs (Radar)</h2>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={advancedStats.radar}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Productivité" dataKey="Productivité" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
                    <Radar name="Impact" dataKey="Impact (Citations)" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                    <Radar name="Qualité" dataKey="Qualité (H-Index)" stroke="#ffc658" fill="#ffc658" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-sm)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* THEMATIC MAP */}
            <div className="team-management-card">
              <h2 style={{ marginBottom: 16 }}>Carte Thématique du Laboratoire</h2>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" dataKey="x" name="Centralité" tick={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis type="number" dataKey="y" name="Densité" tick={false} axisLine={{ stroke: '#cbd5e1' }} />
                    <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Fréquence" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ payload }) => {
                        if (payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: 'var(--bg-cartes)', padding: '8px 12px', border: '1px solid var(--bordres)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
                              <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--main-text)' }}>{data.name}</p>
                              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--sec-text)' }}>Catégorie: {data.category}</p>
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
        )}


        {/* Teams Table */}
        <div className="team-management-card">
          <h2>Détails par Équipe</h2>
          <div className="team-table">
            <table>
              <thead>
                <tr>
                  <th>Nom de l'Équipe</th>
                  <th>Chercheurs</th>
                  <th>Publications</th>
                  <th>Citations</th>
                  <th>H-Index (Équipe)</th>
                  <th>G-Index</th>
                  <th>i10-Index</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamsComparison.map((team, idx) => (
                  <tr key={team.id}>
                    <td><strong>{team.name}</strong></td>
                    <td>{team.nb_researchers}</td>
                    <td><span className="count-badge green">{team.total_publications}</span></td>
                    <td><span className="count-badge blue">{team.total_citations}</span></td>
                    <td><strong>{team.avg_h_index}</strong></td>
                    <td>{team.g_index}</td>
                    <td>{team.i10_index}</td>
                    <td>
                      <button 
                        className="btn-small" 
                        onClick={() => handleViewTeam(team)}
                      >
                        Voir Équipe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Team Details Modal */}
      {selectedTeam && (
        <div className="modal-overlay">
          <div className="modal-content large" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>Équipe : {selectedTeam.name}</h2>
              <button className="close-btn" onClick={() => setSelectedTeam(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="team-summary-min" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="min-card">
                  <strong>Chercheurs:</strong> {selectedTeam.nb_researchers}
                </div>
                <div className="min-card">
                  <strong>Total Pubs:</strong> {selectedTeam.total_publications}
                </div>
                <div className="min-card">
                  <strong>Citations:</strong> {selectedTeam.total_citations}
                </div>
              </div>
              
              <h3>Membres de l'équipe</h3>
              <div className="team-table">
                <table>
                   <thead>
                     <tr>
                       <th>Chercheur</th>
                       <th>Email</th>
                       <th>Rôle</th>
                       <th>Citations</th>
                     </tr>
                   </thead>
                   <tbody>
                     {teamMembers.length > 0 ? teamMembers.map(m => (
                       <tr key={m.id}>
                         <td>{m.prenom} {m.nom}</td>
                         <td>{m.email}</td>
                         <td>{m.role}</td>
                         <td>{m.total_citations || 0}</td>
                       </tr>
                     )) : (
                       <tr><td colSpan="4">Chargement des membres...</td></tr>
                     )}
                   </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LabManagement;
