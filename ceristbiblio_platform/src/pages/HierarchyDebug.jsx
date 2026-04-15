import React, { useState, useEffect } from 'react';

function HierarchyDebug() {
  const [apiStatus, setApiStatus] = useState('Vérification...');
  const [userInfo, setUserInfo] = useState(null);
  const [dbTables, setDbTables] = useState(null);

  useEffect(() => {
    checkAPI();
    checkUser();
  }, []);

  const checkAPI = async () => {
    try {
      const response = await fetch('http://localhost:8000/');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(`✅ API OK: ${data.message}`);
      } else {
        setApiStatus('❌ API répond avec erreur');
      }
    } catch (error) {
      setApiStatus(`❌ API inaccessible: ${error.message}`);
    }
  };

  const checkUser = () => {
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('access_token');
    setUserInfo({
      role: role || 'Non défini',
      hasToken: !!token,
      tokenLength: token ? token.length : 0
    });
  };

  const testDirectors = async () => {
    try {
      const response = await fetch('http://localhost:8000/hierarchy/directors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      const data = await response.json();
      setDbTables(`✅ Directeurs trouvés: ${data.length}`);
    } catch (error) {
      setDbTables(`❌ Erreur: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔧 Diagnostic - Explorateur Hiérarchique</h1>

      {/* API Status */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #e5e7eb'
      }}>
        <h3>🌐 État API</h3>
        <p style={{ fontSize: '14px', margin: '8px 0' }}>{apiStatus}</p>
      </div>

      {/* User Info */}
      {userInfo && (
        <div style={{
          backgroundColor: '#eff6ff',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #bfdbfe'
        }}>
          <h3>👤 Utilisateur</h3>
          <ul style={{ fontSize: '14px', margin: '8px 0' }}>
            <li><strong>Rôle:</strong> <span style={{ color: '#dc2626' }}>{userInfo.role}</span></li>
            <li><strong>Token JWT:</strong> {userInfo.hasToken ? '✅ Présent' : '❌ Absent'}</li>
            <li><strong>Taille Token:</strong> {userInfo.tokenLength} caractères</li>
          </ul>
        </div>
      )}

      {/* Database Check */}
      <div style={{
        backgroundColor: '#f0fdf4',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #bbf7d0'
      }}>
        <h3>🗄️ Base de Données</h3>
        <button
          onClick={testDirectors}
          style={{
            padding: '10px 16px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Tester GET /hierarchy/directors
        </button>
        {dbTables && (
          <p style={{ fontSize: '14px', margin: '12px 0', color: '#166534' }}>
            {dbTables}
          </p>
        )}
      </div>

      {/* Instructions */}
      <div style={{
        backgroundColor: '#fef3c7',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #fcd34d'
      }}>
        <h3>📋 Checklist</h3>
        <ul style={{ fontSize: '13px', lineHeight: '1.8' }}>
          <li>✅ API FastAPI tourne sur port 8000</li>
          <li>✅ Vous êtes connecté (token JWT présent)</li>
          <li>✅ Votre rôle est "tutelle"</li>
          <li>✅ Tables Laboratoire & Equipe existent</li>
          <li>✅ Au moins 1 Directeur existe en DB</li>
          <li>✅ CSS files chargés (hierarchical-explorer.css, stats-panel.css)</li>
        </ul>
      </div>

      {/* Quick Links */}
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <a
          href="/hierarchical-explorer"
          style={{
            padding: '10px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          → Aller à /hierarchical-explorer
        </a>
        <a
          href="/tutelle-test"
          style={{
            padding: '10px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          → Aller à /tutelle-test (avec config)
        </a>
      </div>
    </div>
  );
}

export default HierarchyDebug;
