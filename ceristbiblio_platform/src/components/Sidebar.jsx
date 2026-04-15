import Logo from "../assets/logo.png";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  FaHome, FaDatabase, FaCompass, FaChartBar, 
  FaChevronDown, FaUsers, FaBuilding, FaChartLine, FaCog, FaNetworkWired, FaBalanceScale, FaFileAlt,
  FaSignOutAlt
} from "react-icons/fa";

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userRole, setUserRole] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    setUserRole(role);
  }, []);
  
  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const hasAccess = (allowedRoles) => {
    return allowedRoles.includes(userRole);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  // Roles that get the "management" sidebar layout
  const isManagementRole = ['tutelle', 'directeur', 'chef_labo'].includes(userRole);

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      
      {/* Header */}
      <div className="sidebar_header" onClick={toggleSidebar}>
        <div className="logo_wrapper">
          <img src={Logo} alt="Logo" className="logo-img" />
          {!isCollapsed && (
            <div className="header-text">
              <h2 className="brand-name">CeristBiblio-Platform</h2>
              <span>PFE Licence L3</span>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar_content">
        
        {/* MANAGEMENT ROLES: tutelle, directeur, chef_labo */}
        {isManagementRole ? (
          <>
            {/* HOME - Dashboard */}
            <NavLink to="/" className="nav-item">
              <FaHome className="icon-svg" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>

            {!isCollapsed && <p className="section-title">GESTION</p>}

            {/* EXPLORATEUR HIÉRARCHIQUE - tutelle, directeur, chef_labo */}
            <NavLink to="/hierarchical-explorer" className="nav-item">
              <FaNetworkWired className="icon-svg" />
              {!isCollapsed && <span>Explorateur Hiérarchique</span>}
            </NavLink>

            {/* GESTION DES UTILISATEURS - tutelle, directeur, chef_labo */}
            <NavLink to="/user-management" className="nav-item">
              <FaUsers className="icon-svg" />
              {!isCollapsed && <span>Gestion Utilisateurs</span>}
            </NavLink>

            {/* MON LABORATOIRE - Chef de Labo only */}
            {hasAccess(['chef_labo']) && (
              <NavLink to="/lab-management" className="nav-item">
                <FaDatabase className="icon-svg" />
                {!isCollapsed && <span>Mon Laboratoire</span>}
              </NavLink>
            )}

            {/* STRUCTURE INSTITUTIONNELLE - Tutelle + Directeur */}
            {hasAccess(['tutelle', 'directeur']) && (
              <NavLink to="/institutional-structure" className="nav-item">
                <FaBuilding className="icon-svg" />
                {!isCollapsed && <span>{userRole === 'tutelle' ? 'Structure Hiérarchique' : 'Structure Institutionnelle'}</span>}
              </NavLink>
            )}

            {/* RAPPORTS - Tutelle + Directeur */}
            {hasAccess(['tutelle', 'directeur']) && (
              <NavLink to="/rapports" className="nav-item">
                <FaFileAlt className="icon-svg" />
                {!isCollapsed && <span>{userRole === 'tutelle' ? 'Consulter Les Rapports' : 'Rapports au Ministère'}</span>}
              </NavLink>
            )}

            {/* STATISTIQUES - Tutelle + Directeur */}
            {hasAccess(['tutelle', 'directeur']) && (
              <NavLink to="/global-statistics" className="nav-item">
                <FaChartLine className="icon-svg" />
                {!isCollapsed && <span>Statistiques</span>}
              </NavLink>
            )}

            {/* COMPARAISON - Chef Labo, Directeur, Tutelle */}
            {hasAccess(['chef_labo', 'directeur', 'tutelle']) && (
              <NavLink to="/comparaison" className="nav-item">
                <FaBalanceScale className="icon-svg" />
                {!isCollapsed && <span>Comparaison</span>}
              </NavLink>
            )}
          </>
        ) : (
          // NORMAL MODE - chercheur, chef_equipe
          <>
            {/* HOME */}
            <NavLink to="/" className="nav-item">
              <FaHome className="icon-svg" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>

            {/* MES PUBLICATIONS - Chercheur seulement */}
            {hasAccess(['chercheur']) && (
              <NavLink to="/my-publications" className="nav-item">
                <FaChartBar className="icon-svg" />
                {!isCollapsed && <span>Mes Publications</span>}
              </NavLink>
            )}

            {/* MON ÉQUIPE - Chef d'Équipe */}
            {hasAccess(['chef_equipe']) && (
              <>
                {!isCollapsed && <p className="section-title">GESTION</p>}
                <NavLink to="/team-management" className="nav-item">
                  <FaUsers className="icon-svg" />
                  {!isCollapsed && <span>Mon Équipe</span>}
                </NavLink>
              </>
            )}
          </>
        )}


      </div>
    </aside>
  );
}

export default Sidebar;
