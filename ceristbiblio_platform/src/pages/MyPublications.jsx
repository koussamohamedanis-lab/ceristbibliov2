import { useState, useEffect } from 'react';
import api from '../services/api';
import '../assets/dashboard.css';

function MyPublications() {
  const [publications, setPublications] = useState([]);
  const [stats, setStats] = useState({ h_index: 0, total_citations: 0, total_publications: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPub, setSelectedPub] = useState(null);

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      
      // Utiliser le bon endpoint comme le Dashboard
      const response = await api.get(`/api/users/${userId}/auto-publications`);
      
      const pubs = response.data.publications || [];
      setPublications(pubs);
      
      setStats({
        h_index: response.data.h_index || 0,
        total_publications: response.data.total_publications || 0,
        total_citations: response.data.total_citations || 0
      });
      
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors du chargement des publications');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-container"><p>Chargement...</p></div>;
  if (error) return <div className="dashboard-container"><p className="error-message">Erreur: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Mes Publications</h1>
        <p>Gérez vos publications scientifiques</p>
      </div>

      <div className="dashboard-content">
        <div className="publications-card">
          <h2>Liste des Publications</h2>
          {publications && publications.length > 0 ? (
            <div className="publications-table">
              <table>
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Type</th>
                    <th>Année</th>
                    <th>Citations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {publications.map((pub, idx) => (
                    <tr key={`${pub.doi || pub.title}-${idx}`}>
                      <td className="pub-title">{pub.title || 'N/A'}</td>
                      <td><span className="type-badge">{pub.type || 'N/A'}</span></td>
                      <td>{pub.year || 'N/A'}</td>
                      <td className="citation-count">{pub.citations || 0}</td>
                      <td className="actions">
                        <button 
                          className="btn-small"
                          onClick={() => setSelectedPub(pub)}
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">Aucune publication trouvée</p>
          )}
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Publications</h3>
            <p className="stat-number">{stats.total_publications}</p>
          </div>
          <div className="stat-card">
            <h3>Citations Totales</h3>
            <p className="stat-number">{stats.total_citations}</p>
          </div>
          <div className="stat-card">
            <h3>H-Index</h3>
            <p className="stat-number">{stats.h_index}</p>
          </div>
        </div>
      </div>

      {/* Modal pour afficher les détails */}
      {selectedPub && (
        <div className="modal-overlay" onClick={() => setSelectedPub(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Détails de la Publication</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedPub(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-field">
                <strong>Titre:</strong>
                <p>{selectedPub.title || 'N/A'}</p>
              </div>
              <div className="detail-field">
                <strong>Type:</strong>
                <p>{selectedPub.type || 'N/A'}</p>
              </div>
              <div className="detail-field">
                <strong>Année:</strong>
                <p>{selectedPub.year || 'N/A'}</p>
              </div>
              <div className="detail-field">
                <strong>Citations:</strong>
                <p>{selectedPub.citations || 0}</p>
              </div>
              <div className="detail-field">
                <strong>Journal:</strong>
                <p>{selectedPub.journal || 'N/A'}</p>
              </div>
              <div className="detail-field">
                <strong>DOI:</strong>
                <p>
                  {selectedPub.doi ? (
                    <a href={`https://doi.org/${selectedPub.doi}`} target="_blank" rel="noopener noreferrer" className="detail-link">
                      {selectedPub.doi} ↗
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
              <div className="detail-field">
                <strong>OpenAlex ID:</strong>
                <p>
                  {selectedPub.openalex_id ? (
                    <a href={`https://openalex.org/${selectedPub.openalex_id}`} target="_blank" rel="noopener noreferrer" className="detail-link">
                      {selectedPub.openalex_id} ↗
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
              <div className="detail-field">
                <strong>Lien:</strong>
                <p>
                  {selectedPub.url ? (
                    <a href={selectedPub.url} target="_blank" rel="noopener noreferrer" className="detail-link">
                      Voir la publication ↗
                    </a>
                  ) : 'N/A'}
                </p>
              </div>
              <div className="detail-field">
                <strong>Accès Ouvert:</strong>
                <p>{selectedPub.is_open_access ? '✓ Oui' : '✗ Non'}</p>
              </div>
              {selectedPub.abstract && (
                <div className="detail-field">
                  <strong>Résumé:</strong>
                  <p className="abstract-text">{selectedPub.abstract}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn-primary"
                onClick={() => setSelectedPub(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPublications;
