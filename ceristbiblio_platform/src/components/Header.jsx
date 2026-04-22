import { FaBell, FaQuestionCircle, FaMoon, FaSun } from "react-icons/fa";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  });
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    // Poll for notifications
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/api/users/me/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const clearNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch('http://localhost:8000/api/users/me/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setIsNotifOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Utilisateur'
    const role = localStorage.getItem('userRole') || 'Chercheur'
    setUserName(name)
    setUserRole(role)

    // Fetch profile picture
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/auth/profile/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile_picture_url) {
            setProfilePicUrl(`http://localhost:8000${data.profile_picture_url}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchProfile();
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    // Forcer un rechargement complet de la page pour que l'état global "isAuthenticated" de App.jsx se rafraîchisse correctement
    window.location.href = '/login';
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Get initials from user name for fallback avatar
  const getInitials = (name) => {
    if (!name || name === 'Utilisateur') return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  return (
    <nav className="top-navbar">

      <div className="nav-actions">

        <button className="nav-btn" title="Aide">
          <FaQuestionCircle />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="nav-btn" title="Notifications" onClick={() => setIsNotifOpen(!isNotifOpen)}>
            {notifications.length > 0 && <div className="notification-dot" style={{ backgroundColor: '#ef4444', position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: '50%' }}></div>}
            <FaBell />
          </button>
          
          {isNotifOpen && (
            <div className="profile-dropdown" style={{ right: 0, minWidth: '320px', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bordres)', paddingBottom: '10px', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, color: 'var(--main-text)', fontSize: '15px' }}>Notifications ({notifications.length})</h4>
                {notifications.length > 0 && (
                  <button onClick={clearNotifications} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    Tout effacer
                  </button>
                )}
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <p style={{ color: 'var(--sec-text)', fontSize: '14px', textAlign: 'center', padding: '15px 0', margin: 0 }}>Aucune nouvelle notification.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--body-bg)', fontSize: '13px', color: 'var(--main-text)' }}>
                      <div style={{ fontWeight: 500 }}>{n.message}</div>
                      <div style={{ fontSize: '11px', color: 'var(--sec-text)', marginTop: '4px' }}>
                         {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="nav-divider"></div>

        <div
          className="nav-profile"
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* Avatar: image or initials fallback */}
          {profilePicUrl ? (
            <img 
              src={profilePicUrl} 
              alt="Avatar" 
              className="header-avatar-img"
            />
          ) : (
            <div className="header-avatar-initials">
              {getInitials(userName)}
            </div>
          )}
           <div className="profile-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
            </div>

          {isOpen && (
            <div className="profile-dropdown">
              <button className="dropdown-item" onClick={() => navigate('/settings')}>Mon Profil</button>
              <button className="dropdown-item" onClick={() => navigate('/settings')}>Paramètres</button>
              <button className="dropdown-item" onClick={toggleTheme}>
                {isDarkMode ? <FaSun /> : <FaMoon />}
                <span>{isDarkMode ? 'Mode Clair' : 'Mode Sombre'}</span>
              </button>
              <button className="dropdown-item" onClick={handleLogout}>Déconnexion</button>
            </div>
          )}

        </div>

      </div>

    </nav>
  );
}

export default Header;