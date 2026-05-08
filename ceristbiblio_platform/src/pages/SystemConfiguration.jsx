import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import { FiCheck, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../services/api';

function SystemConfiguration() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/configuration`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement de la configuration');
      
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field, value) => {
    setConfig({
      ...config,
      [field]: value
    });
  };

  const handleSaveConfiguration = async () => {
    try {
      setSaveStatus('saving');
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE_URL}/api/admin/configuration`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      console.error(err);
    }
  };

  if (loading) return <div className="dashboard-container"><p>Chargement...</p></div>;
  if (error) return <div className="dashboard-container"><p className="error-message">Erreur: {error}</p></div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Configuration Système</h1>
        <p>Gérez les paramètres globaux du système</p>
      </div>

      <div className="dashboard-content">
        <div className="config-card">
          <h2>Paramètres Généraux</h2>
          
          {saveStatus === 'success' && <p className="success-message"><FiCheck /> Configuration sauvegardée avec succès</p>}
          {saveStatus === 'error' && <p className="error-message"><FiX /> Erreur lors de la sauvegarde</p>}

          {config && (
            <form className="config-form">
              <div className="form-group">
                <label htmlFor="app_name">Nom de l'Application</label>
                <input
                  type="text"
                  id="app_name"
                  value={config.app_name || ''}
                  onChange={(e) => handleConfigChange('app_name', e.target.value)}
                  placeholder="Nom de l'application"
                />
              </div>

              <div className="form-group">
                <label htmlFor="max_file_size">Taille max des fichiers (MB)</label>
                <input
                  type="number"
                  id="max_file_size"
                  value={config.max_file_size || 50}
                  onChange={(e) => handleConfigChange('max_file_size', e.target.value)}
                  placeholder="Taille en MB"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maintenance_mode">Mode Maintenance</label>
                <select
                  id="maintenance_mode"
                  value={config.maintenance_mode ? 'true' : 'false'}
                  onChange={(e) => handleConfigChange('maintenance_mode', e.target.value === 'true')}
                >
                  <option value="false">Désactivé</option>
                  <option value="true">Activé</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="api_timeout">Délai d'expiration API (secondes)</label>
                <input
                  type="number"
                  id="api_timeout"
                  value={config.api_timeout || 30}
                  onChange={(e) => handleConfigChange('api_timeout', e.target.value)}
                  placeholder="Timeout en secondes"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-primary"
                  onClick={handleSaveConfiguration}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={fetchConfiguration}
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="config-card">
          <h2>Informations Système</h2>
          <div className="system-info">
            <p><strong>Version:</strong> {config?.version || 'N/A'}</p>
            <p><strong>Base de données:</strong> {config?.db_type || 'N/A'}</p>
            <p><strong>Dernière mise à jour:</strong> {config?.last_update || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemConfiguration;
