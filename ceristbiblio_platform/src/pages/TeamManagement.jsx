import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis, BarChart, Bar, Legend, Cell } from 'recharts';
import api from '../services/api';
import { FaSearch, FaUserPlus, FaTrash, FaChartBar, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

function TeamManagement() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamStats, setTeamStats] = useState({ publications_by_year: [], total_publications: 0, h_index: 0, total_citations: 0 });
  const [advancedStats, setAdvancedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Modal states
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStats, setMemberStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      
      // Fetch members
      const membersRes = await api.get(`/api/teams/${userId}`);
      if (membersRes.data) {
        setTeamMembers(membersRes.data);
      }

      // Fetch expanded Team Bibliometrics (using R rpy2 bridge in backend)
      const statsRes = await api.get(`/api/teams/${userId}/bibliometrics`);
      if (statsRes.data) {
        setTeamStats(statsRes.data);
      }
      
      try {
        const advRes = await api.get(`/api/teams/${userId}/advanced-mapping`);
        if (advRes.data) {
          setAdvancedStats(advRes.data);
        }
      } catch(e) {
        console.warn("Advanced stats fallback triggered");
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  // --- SEARCH RESEARCHERS ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    try {
      const userId = localStorage.getItem('userId');
      const res = await api.get(`/api/teams/${userId}/search-researchers?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (err) {
      setError("Erreur lors de la recherche de chercheurs.");
    } finally {
      setIsSearching(false);
    }
  };

  // --- ADD MEMBER ---
  const handleAddMember = async (researcherId, researcherName) => {
    try {
      const userId = localStorage.getItem('userId');
      const res = await api.post(`/api/teams/${userId}/add-member/${researcherId}`);
      if (res.data.success) {
        setSuccess(`${researcherName} a été ajouté(e) avec succès.`);
        setSearchQuery('');
        setSearchResults([]);
        // Refresh full data to update stats and list
        fetchData();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'ajout.");
      setTimeout(() => setError(null), 5000);
    }
  };

  // --- REMOVE MEMBER (SOFT) ---
  const handleRemoveMember = async (id, name) => {
    if (window.confirm(`Êtes-vous sûr de vouloir retirer ${name} de l'équipe ? (Ceci va seulement révoquer l'affectation, le compte ne sera pas supprimé)`)) {
        try {
            const userId = localStorage.getItem('userId');
            const res = await api.post(`/api/teams/${userId}/remove-member/${id}`);
            if (res.data.success) {
                setTeamMembers(prev => prev.filter(m => m.id !== id));
                setSuccess(`${name} a été retiré(e) avec succès.`);
                fetchData(); // Stats change when someone leaves
                setTimeout(() => setSuccess(''), 5000);
            }
        } catch (err) {
            setError(err.response?.data?.detail || "Erreur lors de la suppression");
            setTimeout(() => setError(null), 5000);
        }
    }
  };

  // --- MEMBER STATS MODAL ---
  const handleViewDetails = async (member) => {
    setSelectedMember(member);
    setShowModal(true);
    setStatsLoading(true);
    setMemberStats(null);

    try {
      const response = await api.get(`/api/users/${member.id}/stats`);
      if (response.data) {
        setMemberStats(response.data);
      }
    } catch (err) {
      console.error("Erreur stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) return <div className="dashboard-container"><div className="dashboard-loading">Chargement de l'équipe...</div></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Gestion de l'Équipe : {teamStats.team_name || "Mon Équipe"}</h1>
        <p>Analyse bibliométrique fusionnée et gestion des effectifs</p>
      </div>

      {error && (
        <div className="settings-message settings-message-error" style={{ marginBottom: 20 }}>
          <FaExclamationCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="settings-message settings-message-success" style={{ marginBottom: 20 }}>
          <FaCheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* --- ADD NEW MEMBERS SECTION --- */}
      <div className="team-management-card" style={{ marginBottom: 24 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FaUserPlus /> Ajouter un chercheur à l'équipe</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, prénom ou email dans votre institution..." 
            className="settings-input"
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={isSearching} className="auth-btn" style={{ width: 'auto', padding: '0 24px' }}>
            <FaSearch /> {isSearching ? '...' : 'Chercher'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ marginTop: 20, border: '1px solid var(--bordres)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--bordres)' }}>Chercheur</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--bordres)' }}>Email</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--bordres)' }}>Équipe Actuelle</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--bordres)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.map(res => (
                  <tr key={res.id} style={{ borderBottom: '1px solid var(--bordres)' }}>
                    <td style={{ padding: '12px 16px' }}>{res.prenom} {res.nom}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--sec-text)' }}>{res.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {res.current_team ? (
                        <span className="settings-role-badge" style={{ background: 'var(--accent-amber-light)', color: 'var(--accent-amber)' }}>Transfert: {res.current_team}</span>
                      ) : (
                        <span className="settings-role-badge" style={{ background: 'var(--bg-main)', color: 'var(--sec-text)' }}>Disponible</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        className="btn-small" 
                        style={{ backgroundColor: 'var(--main-green)', color: 'white', border: 'none' }}
                        onClick={() => handleAddMember(res.id, `${res.prenom} ${res.nom}`)}
                      >
                        Ajouter à mon équipe
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-content">
        <div className="team-grid">
           {/* Graph section */}
           <div className="team-management-card chart-card">
              <h2>Évolution des Publications par Année (Équipe)</h2>
              <div style={{ width: '100%', height: 300 }}>
                {teamStats.publications_by_year && teamStats.publications_by_year.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={teamStats.publications_by_year}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#16A34A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bordres)" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: 'var(--sec-text)', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--sec-text)', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-md)'}}
                      />
                      <Area type="monotone" dataKey="count" stroke="#16A34A" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">Pas de données de publication disponibles</p>
                )}
              </div>
            </div>

            <div className="dashboard-stats-column">
                <div className="stat-card">
                    <h3>Impact du Groupe (Bibliometrix)</h3>
                    <p className="stat-number" style={{ color: 'var(--main-green)' }}>H-Index: {teamStats.h_index}</p>
                    <p style={{ fontSize: 13, color: 'var(--sec-text)', marginTop: 8 }}>
                      Calculé sans doublons sur {teamStats.total_publications} publications
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Effectif & Production</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--sec-text)', textTransform: 'uppercase' }}>Membres</span>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{teamMembers.length}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 12, color: 'var(--sec-text)', textTransform: 'uppercase' }}>Citations</span>
                        <div style={{ fontSize: 24, fontWeight: 'bold' }}>{teamStats.total_citations}</div>
                      </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- ADVANCED BIBLIOMETRIX VISUALIZATIONS --- */}
        {advancedStats && advancedStats.radar && advancedStats.radar.length > 0 && (
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
            
            {/* RADAR CHART - MEMBER COMPARISON */}
            <div className="team-management-card">
              <h2 style={{ marginBottom: 16 }}>Performance Comparative (Radar)</h2>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={advancedStats.radar}>
                    <PolarGrid stroke="var(--bordres)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--sec-text)', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Productivité" dataKey="Productivité" stroke="#8884d8" fill="#8884d8" fillOpacity={0.4} />
                    <Radar name="Impact" dataKey="Impact (Citations)" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                    <Radar name="Qualité" dataKey="Qualité (H-Index)" stroke="#ffc658" fill="#ffc658" fillOpacity={0.4} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-sm)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* THEMATIC MAP */}
            <div className="team-management-card">
              <h2 style={{ marginBottom: 16 }}>Carte Thématique (Keywords)</h2>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
                    <XAxis type="number" dataKey="x" name="Centralité" tick={false} axisLine={{ stroke: 'var(--bordres)' }} />
                    <YAxis type="number" dataKey="y" name="Densité" tick={false} axisLine={{ stroke: 'var(--bordres)' }} />
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
                                "Motor": "#ef4444",      // Top right
                                "Niche": "#8b5cf6",      // Top left
                                "Emergent": "#f59e0b",   // Bottom left
                                "Basic": "#10b981"       // Bottom right
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

        <div className="team-management-card" style={{ marginTop: 24 }}>
          <h2>Membres de l'Équipe</h2>
          {teamMembers.length > 0 ? (
            <div className="team-table">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.nom}</td>
                      <td>{member.prenom}</td>
                      <td>{member.email}</td>
                      <td><span className="settings-role-badge">{member.role}</span></td>
                      <td className="actions" style={{ display: 'flex', gap: 8 }}>
                        <button 
                            className="btn-small" 
                            style={{ backgroundColor: 'var(--accent-blue)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleViewDetails(member)}
                        >
                            <FaChartBar /> Stats
                        </button>
                        <button 
                            className="btn-small"
                            style={{ backgroundColor: 'var(--accent-red)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 6 }}
                            onClick={() => handleRemoveMember(member.id, `${member.prenom} ${member.nom}`)}
                        >
                            <FaTrash /> Retirer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">Aucun membre dans l'équipe</p>
          )}
        </div>
      </div>

      {/* Stats Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails : {selectedMember?.prenom} {selectedMember?.nom}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {statsLoading ? (
                <p>Chargement des statistiques individuelles...</p>
              ) : memberStats ? (
                <div className="member-stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">Publications</span>
                    <span className="stat-val">{memberStats.total_publications}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Citations</span>
                    <span className="stat-val">{memberStats.total_citations}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">H-Index</span>
                    <span className="stat-val">{memberStats.h_index}</span>
                  </div>
                </div>
              ) : (
                <p>Aucune statistique disponible pour ce chercheur.</p>
              )}
              <div className="member-info-section" style={{ marginTop: 24, padding: 16, backgroundColor: 'var(--bg-main)', borderRadius: 8 }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Informations de contact</h3>
                <p style={{ margin: '0 0 8px 0' }}><strong>Email:</strong> {selectedMember?.email}</p>
                <p style={{ margin: 0 }}><strong>Rôle:</strong> {selectedMember?.role}</p>
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="auth-btn" onClick={() => setShowModal(false)} style={{ width: 'auto', padding: '8px 24px' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamManagement;
