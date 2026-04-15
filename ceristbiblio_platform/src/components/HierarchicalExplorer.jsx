import React, { useState, useEffect } from 'react';
import api, {
  getAllInstitutions,
  getInstitutionDetails,
  getAllDirectors,
  getDirectorDetails,
  getLaboratoryDetails,
  getTeamDetails,
  getDirectorStatistics,
  getLaboratoryStatistics,
  getTeamStatistics,
  searchHierarchy,
} from '../services/api';
import StatsPanel from './StatsPanel';
import ResearcherProfileCard from './ResearcherProfileCard';
import '../assets/hierarchical-explorer.css';
import { FaArrowLeft, FaCheckCircle, FaFolderOpen, FaSearch } from 'react-icons/fa';

function HierarchicalExplorer() {
  // Navigation state
  const [navigationLevel, setNavigationLevel] = useState('institutions'); // 'institutions', 'labs', 'teams', 'researchers'
  const [userRole, setUserRole] = useState('');
  const [userMetadata, setUserMetadata] = useState({});
  const [currentInstitutionId, setCurrentInstitutionId] = useState(null);
  const [currentLabId, setCurrentLabId] = useState(null);
  const [currentTeamId, setCurrentTeamId] = useState(null);

  // Data state
  const [institutions, setInstitutions] = useState([]);
  const [laboratories, setLaboratories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [researchers, setResearchers] = useState([]);

  // Selection state
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedEntityType, setSelectedEntityType] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // Initialize role and start level
  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const instId = localStorage.getItem('institutionId');
    const labId = localStorage.getItem('laboId');
    setUserRole(role);
    setUserMetadata({ institutionId: instId, laboId: labId });

    if (role === 'chef_labo' && labId && labId !== 'null') {
      setNavigationLevel('teams');
      fetchTeams(labId);
    } else if (role === 'directeur' && instId && instId !== 'null') {
      setNavigationLevel('labs');
      fetchLaboratories(instId);
    } else {
      setNavigationLevel('institutions');
      fetchInstitutions();
    }
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const response = await getAllInstitutions();
      const institutionsData = response.data.value || response.data || [];
      setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
    } catch (error) {
      console.error('Erreur lors du chargement des institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLaboratories = async (institutionId) => {
    setLoading(true);
    try {
      const response = await getInstitutionDetails(institutionId);
      const labData = response.data.value || response.data.laboratoires || [];
      setLaboratories(Array.isArray(labData) ? labData : []);
      setCurrentInstitutionId(institutionId);
      setNavigationLevel('labs');
    } catch (error) {
      console.error('Erreur lors du chargement des laboratoires:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchTeams = async (labId) => {
    setLoading(true);
    try {
      const response = await getLaboratoryDetails(labId);
      const teamData = response.data.value || response.data.equipes || [];
      setTeams(Array.isArray(teamData) ? teamData : []);
      setCurrentLabId(labId);
      setNavigationLevel('teams');
    } catch (error) {
      console.error('Erreur lors du chargement des équipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResearchers = async (teamId) => {
    setLoading(true);
    try {
      const response = await getTeamDetails(teamId);
      const researcherData = response.data.value || response.data.chercheurs || [];
      setResearchers(Array.isArray(researcherData) ? researcherData : []);
      setCurrentTeamId(teamId);
      setNavigationLevel('researchers');
    } catch (error) {
      console.error('Erreur lors du chargement des chercheurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstitution = async (institutionId) => {
    setLoading(true);
    try {
      // Pour l'instant on garde getDirectorStatistics (en assumant que institution/directeur partagent le même ID ou que vous l'adaptiez côté backend)
      // On ignore la sélection stricte pour ce mock
      setSelectedEntity(institutionId);
      setSelectedEntityType('institution');
      // setStatistics(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSelectLaboratory = async (labId) => {
    setLoading(true);
    try {
      const response = await getLaboratoryStatistics(labId);
      setSelectedEntity(labId);
      setSelectedEntityType('laboratory');
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (teamId) => {
    setLoading(true);
    try {
      const response = await getTeamStatistics(teamId);
      setSelectedEntity(teamId);
      setSelectedEntityType('team');
      setStatistics(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectResearcher = async (researcherId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/users/${researcherId}/stats`);
      setSelectedEntity(researcherId);
      setSelectedEntityType('researcher');
      setStatistics(response.data);
    } catch (error) {
           console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await searchHierarchy(searchQuery);
      const resultsData = response.data.value || response.data.results || response.data || [];
      setSearchResults(Array.isArray(resultsData) ? resultsData : []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigationLevel === 'labs' && userRole === 'tutelle') {
      setNavigationLevel('institutions');
      setLaboratories([]);
      setCurrentInstitutionId(null);
      setSelectedEntity(null);
      setStatistics(null);
    } else if (navigationLevel === 'teams') {
      if (userRole === 'directeur' || userRole === 'tutelle') {
        setNavigationLevel('labs');
        setTeams([]);
        setCurrentLabId(null);
        setSelectedEntity(null);
        setStatistics(null);
      }
    } else if (navigationLevel === 'researchers') {
      setNavigationLevel('teams');
      setResearchers([]);
      setCurrentTeamId(null);
      setSelectedEntity(null);
      setStatistics(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  // Client-side filtering
  const getFilteredData = (data, type) => {
    if (!data) return [];
    let filtered = [...data];
    
    // Filter by domain (if applicable)
    if (filterDomain && type === 'labs') {
      filtered = filtered.filter(item => 
        (item.domaine || '').toLowerCase().includes(filterDomain.toLowerCase())
      );
    }
    
    // Filter by year is usually for pubs, but we can filter current list if it had year
    // Since researchers/labs don't have a specific "year" in this view context,
    // we'll keep it simple or expand if data allowed.

    return filtered;
  };

  return (
    <div className="hierarchical-explorer">
      {/* Search Bar */}
      <div className="explorer-search-section">
        <form onSubmit={handleSearch} className="explorer-search-form">
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher un laboratoire, une équipe ou un chercheur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="explorer-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="search-clear-btn"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="explorer-search-btn">
            Rechercher
          </button>
        </form>

        {/* Filters */}
        <div className="explorer-filters">
          <select
            value={filterDomain}
            onChange={(e) => setFilterDomain(e.target.value)}
            className="filter-select"
          >
            <option value="">Tous les domaines</option>
            <option value="informatique">Informatique</option>
            <option value="biologie">Biologie</option>
            <option value="chimie">Chimie</option>
            <option value="physique">Physique</option>
            <option value="autres">Autres</option>
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="filter-select"
          >
            <option value="">Toutes les années</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="explorer-main-content">
        {/* Left Panel - Cards Navigation */}
        <div className="explorer-cards-panel">
          {/* Breadcrumb Navigation */}
          <div className="explorer-breadcrumb">
            {userRole === 'tutelle' && (
              <>
                <span
                  onClick={() => setNavigationLevel('institutions')}
                  className={`breadcrumb-item ${navigationLevel === 'institutions' ? 'active' : ''}`}
                >
                  Institutions
                </span>
                {navigationLevel !== 'institutions' && <span className="breadcrumb-separator">/</span>}
              </>
            )}

            {(userRole === 'tutelle' || userRole === 'directeur') && (
              <>
                <span
                  onClick={() => {
                      if (userRole === 'tutelle') handleGoBack();
                      else setNavigationLevel('labs');
                  }}
                  className={`breadcrumb-item ${navigationLevel === 'labs' ? 'active' : ''}`}
                >
                  Laboratoires
                </span>
                {navigationLevel !== 'labs' && navigationLevel !== 'institutions' && (
                  <span className="breadcrumb-separator">/</span>
                )}
              </>
            )}

            {(userRole === 'tutelle' || userRole === 'directeur' || userRole === 'chef_labo') && (
              <>
                <span
                  onClick={() => {
                      if (navigationLevel === 'researchers') handleGoBack();
                      else if (userRole === 'chef_labo') setNavigationLevel('teams');
                  }}
                  className={`breadcrumb-item ${navigationLevel === 'teams' ? 'active' : ''}`}
                >
                  Équipes
                </span>
                {navigationLevel === 'researchers' && (
                  <>
                    <span className="breadcrumb-separator">/</span>
                    <span className="breadcrumb-item active">Chercheurs</span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Go Back Button */}
          {((navigationLevel === 'researchers') || 
            (navigationLevel === 'teams' && (userRole === 'directeur' || userRole === 'tutelle')) ||
            (navigationLevel === 'labs' && userRole === 'tutelle')) && (
            <button onClick={handleGoBack} className="explorer-back-btn">
              <FaArrowLeft /> Retour
            </button>
          )}


          {/* Loading State */}
          {loading && <div className="explorer-loading">Chargement...</div>}

          {/* Search Results */}
          {searchResults && (
            <div className="explorer-search-results">
              <h3>Résultats de recherche</h3>

              {searchResults.laboratories.length > 0 && (
                <div className="search-result-group">
                  <h4>Laboratoires ({searchResults.laboratories.length})</h4>
                  {searchResults.laboratories.map((lab) => (
                    <div
                      key={lab.id}
                      className="explorer-card"
                      onClick={() => fetchLaboratories(lab.id)}
                    >
                      <div className="card-header">
                        <FaFolderOpen className="card-icon" />
                        <h3>{lab.name}</h3>
                      </div>
                      <p className="card-domain">Domaine: {lab.domaine}</p>
                      <button className="card-btn-primary">
                        Voir les équipes
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.teams.length > 0 && (
                <div className="search-result-group">
                  <h4>Équipes ({searchResults.teams.length})</h4>
                  {searchResults.teams.map((team) => (
                    <div
                      key={team.id}
                      className="explorer-card"
                      onClick={() => fetchResearchers(team.id)}
                    >
                      <div className="card-header">
                        <FaFolderOpen className="card-icon" />
                        <h3>{team.name}</h3>
                      </div>
                      <button className="card-btn-primary">
                        Voir les chercheurs
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchResults.researchers.length > 0 && (
                <div className="search-result-group">
                  <h4>Chercheurs ({searchResults.researchers.length})</h4>
                  {searchResults.researchers.map((researcher) => (
                    <div key={researcher.id} className="explorer-card">
                      <div className="card-header">
                        <h3>{researcher.name}</h3>
                      </div>
                      <p className="card-email">{researcher.email}</p>
                      <button className="card-btn-secondary" onClick={() => handleSelectResearcher(researcher.id)}>Profil</button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={clearSearch} className="explorer-clear-search-btn">
                Effacer la recherche
              </button>
            </div>
          )}

          {/* Institutions Level */}
          {navigationLevel === 'institutions' && !searchResults && (
            <div className="explorer-cards-grid">
              {institutions.length === 0 ? (
                <p className="no-data">Aucune institution disponible</p>
              ) : (
                institutions.map((inst) => (
                  <div
                    key={inst.id}
                    className={`explorer-card ${selectedEntity === inst.id ? 'selected' : ''}`}
                  >
                    <div className="card-header">
                      <h3>{inst.name}</h3>
                    </div>
                    <p className="card-institution">
                      Ville: {inst.ville}
                    </p>
                    <p className="card-email">Directeur: {inst.directeur_name || 'Non assigné'}</p>
                    <div className="card-actions">
                      <button
                        className="card-btn-primary"
                        onClick={() => fetchLaboratories(inst.id)}
                      >
                        <FaFolderOpen /> Voir les Labos
                      </button>
                      <button
                        className="card-btn-secondary"
                        onClick={() => handleSelectInstitution(inst.id)}
                      >
                        <FaCheckCircle /> Sélectionner
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}


          {/* Laboratories Level */}
          {navigationLevel === 'labs' && !searchResults && (
            <div className="explorer-cards-grid">
              {getFilteredData(laboratories, 'labs').length === 0 ? (
                <p className="no-data">Aucun laboratoire disponible pour ces critères</p>
              ) : (
                getFilteredData(laboratories, 'labs').map((lab) => (
                  <div
                    key={lab.id}
                    className={`explorer-card ${selectedEntity === lab.id ? 'selected' : ''}`}
                  >
                    <div className="card-header">
                      <h3>{lab.name}</h3>
                    </div>
                    <p className="card-description">{lab.description}</p>
                    <p className="card-domain">Domaine: {lab.domaine || "Général"}</p>
                    <div className="card-actions">
                      <button
                        className="card-btn-primary"
                        onClick={() => fetchTeams(lab.id)}
                      >
                        <FaFolderOpen /> Voir les Équipes
                      </button>
                      <button
                        className="card-btn-secondary"
                        onClick={() => handleSelectLaboratory(lab.id)}
                      >
                        <FaCheckCircle /> Sélectionner
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Teams Level */}
          {navigationLevel === 'teams' && !searchResults && (
            <div className="explorer-cards-grid">
              {teams.length === 0 ? (
                <p className="no-data">Aucune équipe disponible</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className={`explorer-card ${selectedEntity === team.id ? 'selected' : ''}`}
                  >
                    <div className="card-header">
                      <h3>{team.nom}</h3>
                    </div>
                    <p className="card-description">{team.description}</p>
                    <div className="card-actions">
                      <button
                        className="card-btn-primary"
                        onClick={() => fetchResearchers(team.id)}
                      >
                        <FaFolderOpen /> Voir les Chercheurs
                      </button>
                      <button
                        className="card-btn-secondary"
                        onClick={() => handleSelectTeam(team.id)}
                      >
                        <FaCheckCircle /> Sélectionner
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Researchers Level */}
          {navigationLevel === 'researchers' && !searchResults && (
            <div className="explorer-cards-grid">
              {researchers.length === 0 ? (
                <p className="no-data">Aucun chercheur disponible</p>
              ) : (
                researchers.map((researcher) => (
                    <div key={researcher.id} className="explorer-card">
                      <div className="card-header">
                        <h3>{researcher.name}</h3>
                      </div>
                      <p className="card-email">{researcher.email}</p>
                      <div className="card-actions">
                        <button className="card-btn-secondary" onClick={() => handleSelectResearcher(researcher.id)}>Voir Profil</button>
                      </div>
                    </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Statistics */}
        {statistics && (
          <div className="explorer-stats-panel">
            {selectedEntityType === 'researcher' ? (
              <ResearcherProfileCard data={statistics} />
            ) : (
              <StatsPanel
                statistics={statistics}
                entityType={selectedEntityType}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HierarchicalExplorer;
