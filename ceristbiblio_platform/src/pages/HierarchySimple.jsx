import React, { useState, useEffect } from 'react';

function HierarchySimple() {
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDirectors();
  }, []);

  const loadDirectors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      console.log('Token:', token ? '✅ Present' : '❌ Missing');
      
      const response = await fetch('http://localhost:8000/hierarchy/directors', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Directors:', data);
      setDirectors(data);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setDirectors([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📊 Explorateur Hiérarchique - Version Simple</h1>

      {/* Status */}
      <div style={{
        backgroundColor: '#f0f9ff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #7dd3fc'
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>État:</strong> {loading ? '⏳ Chargement...' : '✅ Prêt'}
        </p>
        <p style={{ margin: '0' }}>
          <strong>Rôle utilisateur:</strong> <span style={{ color: '#dc2626' }}>
            {localStorage.getItem('userRole') || 'Non défini'}
          </span>
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #fca5a5',
          color: '#991b1b'
        }}>
          <strong>❌ Erreur:</strong> {error}
        </div>
      )}

      {/* Directors List */}
      <div>
        <h2>Directeurs ({directors.length})</h2>
        {directors.length === 0 ? (
          <p style={{ color: '#666' }}>
            Aucun directeur trouvé. Vérifiez la base de données.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {directors.map((director) => (
              <div
                key={director.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>
                  {director.name}
                </h3>
                <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
                  <strong>Institution:</strong> {director.institution_name}
                </p>
                <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
                  <strong>Email:</strong> {director.email}
                </p>
                <button
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  Voir Laboratoires
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Console */}
      <div style={{
        backgroundColor: '#1f2937',
        color: '#ecf0f1',
        padding: '16px',
        borderRadius: '8px',
        marginTop: '24px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        <strong>🐛 Debug Console:</strong>
        <p>Token: {localStorage.getItem('access_token') ? '✅' : '❌'}</p>
        <p>Directors loaded: {directors.length}</p>
        <p>Error: {error || 'None'}</p>
      </div>
    </div>
  );
}

export default HierarchySimple;
