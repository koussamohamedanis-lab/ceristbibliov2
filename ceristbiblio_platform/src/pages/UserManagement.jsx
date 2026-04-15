import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import api from '../services/api';
import { FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';

// Roles that each role is allowed to create
const ALLOWED_CREATION_ROLES = {
  tutelle: ['directeur', 'chef_labo', 'chef_equipe', 'chercheur'],
  directeur: ['chef_labo', 'chef_equipe', 'chercheur'],
  chef_labo: ['chef_equipe', 'chercheur'],
};

const ROLE_LABELS = {
  chercheur: 'Chercheur',
  chef_equipe: "Chef d'Équipe",
  chef_labo: 'Chef de Laboratoire',
  directeur: 'Directeur',
  tutelle: 'Tutelle',
};

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    role: 'chercheur',
    institution_id: '',
    labo_id: '',
    equipe_id: '',
  });

  const currentUserRole = localStorage.getItem('userRole') || 'chercheur';
  const allowedRoles = ALLOWED_CREATION_ROLES[currentUserRole] || [];

  // Check if current user can manage another user
  const canManageUser = (targetUser) => {
    if (!allowedRoles.length) return false;
    // Cannot manage users with roles not in allowed list (e.g., tutelle cannot edit tutelle)
    if (!allowedRoles.includes(targetUser.role)) return false;
    return true;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch scoped data  
      const [usersRes, labsRes, teamsRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/hierarchy/laboratories'),
        api.get('/hierarchy/teams'),
      ]);
      
      const usersData = usersRes.data.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
      setLaboratories(labsRes.data || []);
      setTeams(teamsRes.data || []);

      // Fetch institutions only for tutelle
      if (currentUserRole === 'tutelle') {
        try {
          const instRes = await api.get('/hierarchy/institutions');
          setInstitutions(instRes.data || []);
        } catch {
          setInstitutions([]);
        }
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError('Impossible de charger les données');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      if (!canManageUser(user)) {
        setError('Vous n\'avez pas la permission de modifier cet utilisateur');
        return;
      }
      setEditingUser(user);
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        role: user.role || 'chercheur',
        password: '',
        institution_id: user.institution_id || '',
        labo_id: user.labo_id || '',
        equipe_id: user.equipe_id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        password: '',
        role: allowedRoles[allowedRoles.length - 1] || 'chercheur', // Default to lowest role
        institution_id: '',
        labo_id: '',
        equipe_id: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      nom: '', prenom: '', email: '', password: '',
      role: 'chercheur', institution_id: '', labo_id: '', equipe_id: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/api/users/${editingUser.id}`, formData);
      } else {
        await api.post('/api/users', formData);
      }
      await fetchData();
      handleCloseModal();
      setError(null);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Erreur lors de la sauvegarde';
      setError(detail);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur?')) {
      try {
        await api.delete(`/api/users/${userId}`);
        await fetchData();
      } catch (err) {
        const detail = err.response?.data?.detail || 'Erreur lors de la suppression';
        setError(detail);
      }
    }
  };

  // Get teams filtered by selected labo (for the form)
  const getFilteredTeams = () => {
    if (!formData.labo_id) return teams;
    return teams.filter(t => String(t.labo_id) === String(formData.labo_id));
  };

  if (loading) return <div className="dashboard-container"><p>Chargement...</p></div>;

  // Compute role description for the header
  const scopeLabel = currentUserRole === 'tutelle' 
    ? 'tous les utilisateurs de la plateforme'
    : currentUserRole === 'directeur'
    ? 'les utilisateurs de votre institution'
    : 'les utilisateurs de votre laboratoire';

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Gestion des Utilisateurs</h1>
        <p>Gérer {scopeLabel}</p>
      </div>

      {error && (
        <div className="error-message" style={{ 
          padding: '12px 16px', marginBottom: '16px', borderRadius: 'var(--radius)',
          backgroundColor: 'var(--accent-red-light)', color: 'var(--accent-red)', border: '1px solid var(--accent-red-light)'
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={() => handleOpenModal()}
        style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <FaPlus /> Ajouter un utilisateur
      </button>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'var(--bg-cartes)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-sm)',
          color: 'var(--main-text)'
        }}>
          <thead style={{
            backgroundColor: 'var(--bg-main)',
            borderBottom: '2px solid var(--bordres)'
          }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>Nom</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Prénom</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>Rôle</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: 'var(--sec-text)' }}>
                  Aucun utilisateur trouvé
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--bordres)' }}>
                  <td style={{ padding: '15px' }}>{user.nom || '-'}</td>
                  <td style={{ padding: '15px' }}>{user.prenom || '-'}</td>
                  <td style={{ padding: '15px' }}>{user.email}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      backgroundColor: getRoleColor(user.role),
                      color: '#fff',
                      fontSize: '12px'
                    }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    {canManageUser(user) ? (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button className="btn btn-sm" onClick={() => handleOpenModal(user)}>
                          <FaEdit /> Éditer
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.id)}>
                          <FaTrash /> Supprimer
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--sec-text)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ==================== CREATE/EDIT MODAL ==================== */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-cartes)', color: 'var(--main-text)',
            padding: '30px', borderRadius: 'var(--radius)',
            width: '90%', maxWidth: '500px',
            boxShadow: 'var(--shadow-md)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>{editingUser ? "Éditer l'utilisateur" : 'Ajouter un utilisateur'}</h2>
              <button onClick={handleCloseModal} style={{
                background: 'none', border: 'none', fontSize: '24px',
                cursor: 'pointer', color: 'var(--sec-text)'
              }}>
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Nom */}
              <div style={{ marginBottom: '15px' }}>
                <label>Nom *</label>
                <input type="text" name="nom" value={formData.nom} onChange={handleInputChange} required
                  style={inputStyle} />
              </div>

              {/* Prénom */}
              <div style={{ marginBottom: '15px' }}>
                <label>Prénom *</label>
                <input type="text" name="prenom" value={formData.prenom} onChange={handleInputChange} required
                  style={inputStyle} />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '15px' }}>
                <label>Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required
                  style={inputStyle} />
              </div>

              {/* Rôle - Filtered by what current user can create */}
              <div style={{ marginBottom: '15px' }}>
                <label>Rôle *</label>
                <select name="role" value={formData.role} onChange={handleInputChange} style={inputStyle}>
                  {allowedRoles.map(role => (
                    <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                  ))}
                </select>
              </div>

              {/* Institution - Only for tutelle when creating directeur */}
              {currentUserRole === 'tutelle' && (
                <div style={{ marginBottom: '15px' }}>
                  <label>Institution</label>
                  <select name="institution_id" value={formData.institution_id} onChange={handleInputChange} style={inputStyle}>
                    <option value="">-- Sélectionner une institution --</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name || inst.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Laboratoire - Show for tutelle & directeur (not chef_labo, auto-scoped) */}
              {['tutelle', 'directeur'].includes(currentUserRole) && ['chef_labo', 'chef_equipe', 'chercheur'].includes(formData.role) && (
                <div style={{ marginBottom: '15px' }}>
                  <label>Laboratoire</label>
                  <select name="labo_id" value={formData.labo_id} onChange={handleInputChange} style={inputStyle}>
                    <option value="">-- Sélectionner un laboratoire --</option>
                    {laboratories.map(lab => (
                      <option key={lab.id} value={lab.id}>{lab.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Équipe - For all management roles */}
              {['chef_equipe', 'chercheur'].includes(formData.role) && (
                <div style={{ marginBottom: '15px' }}>
                  <label>Équipe</label>
                  <select name="equipe_id" value={formData.equipe_id} onChange={handleInputChange} style={inputStyle}>
                    <option value="">-- Sélectionner une équipe --</option>
                    {getFilteredTeams().map(team => (
                      <option key={team.id} value={team.id}>{team.nom}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password - Only for new users */}
              {!editingUser && (
                <div style={{ marginBottom: '15px' }}>
                  <label>Mot de passe *</label>
                  <input type="password" name="password" value={formData.password} onChange={handleInputChange} required
                    style={inputStyle} />
                </div>
              )}

              {/* Auto-scope message */}
              {currentUserRole === 'directeur' && (
                <p style={{ fontSize: '12px', color: 'var(--sec-text)', marginBottom: '10px' }}>
                  💡 L'utilisateur sera automatiquement affecté à votre institution.
                </p>
              )}
              {currentUserRole === 'chef_labo' && (
                <p style={{ fontSize: '12px', color: 'var(--sec-text)', marginBottom: '10px' }}>
                  💡 L'utilisateur sera automatiquement affecté à votre laboratoire.
                </p>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={handleCloseModal} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid var(--bordres)',
  backgroundColor: 'var(--bg-main)',
  color: 'var(--main-text)',
  borderRadius: '4px',
  marginTop: '5px',
};

function getRoleColor(role) {
  const colors = {
    'tutelle': 'var(--role-tutelle)',
    'directeur': 'var(--role-directeur)',
    'chef_labo': 'var(--role-chef-labo)',
    'chef_equipe': 'var(--role-chef-equipe)',
    'chercheur': 'var(--role-chercheur)'
  };
  return colors[role] || 'var(--sec-text)';
}

export default UserManagement;
