import React, { useState, useEffect } from 'react';

function HierarchyMinimal() {
  const [directors, setDirectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Starting fetch...');
        const token = localStorage.getItem('access_token');
        console.log('Token:', token ? 'Present' : 'Missing');
        
        const response = await fetch('http://localhost:8000/hierarchy/directors', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('Response:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('Data:', data);
        setDirectors(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h1>🧪 Test Minimal - Hierarchy</h1>
      
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <p><strong>État:</strong> {loading ? '⏳ Loading...' : '✓ Done'}</p>
        <p><strong>Directeurs:</strong> {directors.length}</p>
        {error && <p style={{ color: 'red' }}><strong>Erreur:</strong> {error}</p>}
      </div>

      {directors.map(d => (
        <div key={d.id} style={{ backgroundColor: 'white', padding: '20px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>{d.name}</h3>
          <p>📍 {d.institution_name}</p>
          <p>✉️ {d.email}</p>
        </div>
      ))}

      <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', marginTop: '20px', border: '1px solid #ffc107' }}>
        <p>💡 Ouvrez la console (F12) pour les erreurs détaillées</p>
      </div>
    </div>
  );
}

export default HierarchyMinimal;
