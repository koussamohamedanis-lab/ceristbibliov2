import React, { useState } from 'react';
import HierarchicalExplorer from '../components/HierarchicalExplorer';

function TutelleMode() {
  const [testUserRole, setTestUserRole] = useState(
    localStorage.getItem('userRole') || 'tutelle'
  );

  const handleSetRole = () => {
    localStorage.setItem('userRole', testUserRole);
    window.location.reload();
  };

  const getUserRole = () => localStorage.getItem('userRole');

  return (
    <div style={{ padding: '20px' }}>
      <div style={{
        backgroundColor: 'var(--bg-cartes)',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid var(--bordres)',
        color: 'var(--main-text)'
      }}>
        <h3 style={{ margin: '0 0 12px 0' }}>🔧 Configuration de Test</h3>
        <p style={{ margin: '8px 0', fontSize: '14px' }}>
          <strong>Rôle actuel:</strong> <span style={{ color: 'var(--main-green)', fontWeight: 'bold' }}>
            {getUserRole() || 'Non défini'}
          </span>
        </p>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <select
            value={testUserRole}
            onChange={(e) => setTestUserRole(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--bordres)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'var(--bg-main)',
              color: 'var(--main-text)'
            }}
          >
            <option value="tutelle">tutelle</option>
            <option value="directeur">directeur</option>
            <option value="chef_labo">chef_labo</option>
            <option value="chef_equipe">chef_equipe</option>
            <option value="chercheur">chercheur</option>
          </select>
          <button
            onClick={handleSetRole}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--main-green)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            Appliquer & Recharger
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{
        backgroundColor: 'var(--accent-amber-light)',
        padding: '12px 16px',
        borderRadius: '6px',
        marginBottom: '20px',
        border: '1px solid var(--accent-amber)',
        fontSize: '13px',
        color: 'var(--main-text)'
      }}>
        <strong>💡 Debug:</strong> Assurez-vous que:
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li>Le rôle est défini à "tutelle"</li>
          <li>L'API FastAPI tourne sur http://localhost:8000</li>
          <li>Les tables Laboratoire et Equipe existent en DB</li>
        </ul>
      </div>

      {/* Main Component */}
      <HierarchicalExplorer />
    </div>
  );
}

export default TutelleMode;
