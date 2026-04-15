import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../assets/dashboard.css';
import { FaPlus, FaFileAlt, FaEye } from 'react-icons/fa';

function Rapports() {
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState('');
  
  // Create state
  const [showModal, setShowModal] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [formData, setFormData] = useState({ title: '', content: '', institution_id: '' });

  // View state
  const [selectedRapport, setSelectedRapport] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchRapports();
    if (role === 'directeur') {
      fetchUserInstitutions();
    }
  }, []);

  const fetchRapports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rapports/');
      setRapports(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Erreur lors de la récupération des rapports:", err);
      setError("Impossible de charger les rapports.");
      setLoading(false);
    }
  };

  const fetchUserInstitutions = async () => {
    try {
      // Mock or fetch proper insts for the director
      const response = await api.get('/hierarchy/institutions');
      const instData = response.data.value || response.data || [];
      // Ideally we only want the directeur's own institution
      setInstitutions(instData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/rapports/', formData);
      setShowModal(false);
      setFormData({ title: '', content: '', institution_id: '' });
      fetchRapports();
    } catch (err) {
      alert("Erreur lors de l'envoi du rapport. "+(err.response?.data?.detail || ""));
      console.error(err);
    }
  };

  if (loading) return <div className="dashboard-loading">Chargement des rapports...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{userRole === 'tutelle' ? 'Rapports des Laboratoires' : 'Mes Rapports'}</h1>
          <p>Gestion des rapports de performances scientifiques</p>
        </div>
        {userRole === 'directeur' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Nouveau Rapport
          </button>
        )}
      </div>

      <div className="explorer-cards-grid">
        {rapports.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <FaFileAlt className="empty-state-icon" />
            <p>Aucun rapport n'a été trouvé.</p>
          </div>
        ) : (
          rapports.map(rapport => (
            <div key={rapport.id} className="explorer-card">
              <div className="card-header">
                <h3>{rapport.title}</h3>
              </div>
              <p style={{ color: 'var(--sec-text)', fontSize: '0.85rem' }}>
                Date: {new Date(rapport.created_at).toLocaleDateString()}
              </p>
              <div className="card-actions" style={{ marginTop: '15px' }}>
                <button 
                  className="btn btn-secondary w-full justify-center"
                  onClick={() => setSelectedRapport(rapport)}
                >
                  <FaEye /> Lire le rapport
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Modal */}
      {selectedRapport && (
        <div className="modal-overlay" onClick={() => setSelectedRapport(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedRapport.title}</h2>
              <button className="modal-close" onClick={() => setSelectedRapport(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--main-text)' }}>
                {selectedRapport.content}
              </p>
              <hr style={{ margin: '20px 0', borderColor: 'var(--bordres)' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--sec-text)' }}>
                Rédigé le {new Date(selectedRapport.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Rédiger un Rapport</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Titre du rapport</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '4px',
                      border: '1px solid var(--bordres)', backgroundColor: 'var(--bg-main)', color: 'var(--main-text)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Institution concernée</label>
                  <select 
                    required
                    value={formData.institution_id}
                    onChange={(e) => setFormData({...formData, institution_id: e.target.value})}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '4px',
                      border: '1px solid var(--bordres)', backgroundColor: 'var(--bg-main)', color: 'var(--main-text)'
                    }}
                  >
                    <option value="">-- Sélectionnez --</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.nom || inst.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Contenu analytique</label>
                  <textarea 
                    required
                    rows="8"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '4px',
                      border: '1px solid var(--bordres)', backgroundColor: 'var(--bg-main)', color: 'var(--main-text)'
                    }}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Soumettre au Ministère</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rapports;
