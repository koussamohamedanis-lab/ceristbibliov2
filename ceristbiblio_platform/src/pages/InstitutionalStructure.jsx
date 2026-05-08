import { useState, useEffect } from 'react';
import '../assets/dashboard.css';
import { getTutelleFullHierarchy } from '../services/api';
import { 
  FaBuilding, FaUsers, FaUser, 
  FaFlask, FaChevronDown, FaChevronRight, FaSitemap, 
  FaUniversity, FaGlobeAfrica, FaMapMarkerAlt 
} from 'react-icons/fa';

function InstitutionalStructure() {
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedInstitutions, setExpandedInstitutions] = useState({});
  const [expandedLabs, setExpandedLabs] = useState({});
  const [expandedTeams, setExpandedTeams] = useState({});

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await getTutelleFullHierarchy();
      setHierarchy(response.data);
      const expanded = {};
      (response.data.institutions || []).forEach(inst => {
        expanded[inst.id] = true;
      });
      setExpandedInstitutions(expanded);
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement de la hiérarchie:', err);
      setError('Impossible de charger la structure hiérarchique');
    } finally {
      setLoading(false);
    }
  };

  const toggleInstitution = (id) => setExpandedInstitutions(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleLab = (id) => setExpandedLabs(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleTeam = (id) => setExpandedTeams(prev => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const instExp = {}, labExp = {}, teamExp = {};
    (hierarchy?.institutions || []).forEach(inst => {
      instExp[inst.id] = true;
      (inst.laboratories || []).forEach(lab => {
        labExp[lab.id] = true;
        (lab.teams || []).forEach(team => { teamExp[team.id] = true; });
      });
    });
    setExpandedInstitutions(instExp);
    setExpandedLabs(labExp);
    setExpandedTeams(teamExp);
  };

  const collapseAll = () => {
    setExpandedInstitutions({});
    setExpandedLabs({});
    setExpandedTeams({});
  };

  if (loading) return (
    <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px', height: '48px', border: '4px solid var(--bordres)',
          borderTopColor: 'var(--main-green)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
        }} />
        <p style={{ color: 'var(--sec-text)', fontFamily: 'var(--font-text)' }}>Chargement de la hiérarchie...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="dashboard-container">
      <div style={{ padding: '24px', backgroundColor: 'var(--accent-red-light)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
        <p style={{ color: 'var(--accent-red)', fontWeight: 600, fontFamily: 'var(--font-text)' }}>{error}</p>
      </div>
    </div>
  );

  const isTutelle = hierarchy?.tutelle_role === 'tutelle';

  /* ---- Reusable node renderer ---- */
  const renderResearcher = (r) => (
    <div key={r.id} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '-2px', top: '14px', width: '14px', borderTop: '2px solid var(--color-researcher-connector)' }} />
      <div style={{
        marginLeft: '14px', padding: '8px 12px', background: 'var(--bg-main)',
        border: '1px solid var(--bordres)', borderRadius: '6px', display: 'flex',
        alignItems: 'center', gap: '10px', marginBottom: '3px', transition: 'all 0.15s ease'
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: r.role === 'chef_equipe' ? 'var(--accent-amber-light)' : 'var(--accent-purple-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <FaUser size={11} color={r.role === 'chef_equipe' ? 'var(--accent-amber)' : 'var(--accent-purple)'} />
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--main-text)', fontFamily: 'var(--font-text)' }}>{r.name}</span>
        <span style={{
          fontSize: '0.68rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginLeft: 'auto',
          background: r.role === 'chef_equipe' ? 'var(--accent-amber-light)' : 'var(--accent-purple-light)',
          color: r.role === 'chef_equipe' ? 'var(--accent-amber)' : 'var(--accent-purple)', whiteSpace: 'nowrap'
        }}>
          {r.role === 'chef_equipe' ? "Chef d'éq." : 'Chercheur'}
        </span>
      </div>
    </div>
  );

  const renderTeam = (team) => (
    <div key={team.id} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '-2px', top: '18px', width: '16px', borderTop: '2px solid var(--color-team-connector)' }} />
      <div style={{ marginLeft: '16px' }}>
        <div onClick={() => toggleTeam(team.id)} style={{
          padding: '10px 14px', background: 'var(--bg-cartes)', border: '1.5px solid var(--color-team)',
          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: '10px', marginBottom: '2px', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '7px', background: 'var(--color-team-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <FaUsers size={13} style={{ color: 'var(--color-team)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h5 style={{ margin: 0, color: 'var(--main-text)', fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--font-title)' }}>{team.name}</h5>
            <div style={{ display: 'flex', gap: '10px', marginTop: '2px', flexWrap: 'wrap' }}>
              {team.chef_equipe && <span style={{ color: 'var(--sec-text)', fontSize: '0.72rem' }}>Chef: {team.chef_equipe}</span>}
              <span style={{ color: 'var(--sec-text)', fontSize: '0.72rem' }}>{team.researcher_count} membre{team.researcher_count > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ color: 'var(--sec-text)' }}>{expandedTeams[team.id] ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</div>
        </div>
        {expandedTeams[team.id] && (
          <div style={{ marginLeft: '16px', borderLeft: '2px solid var(--color-researcher-connector)', paddingBottom: '4px', paddingTop: '4px' }}>
            {(team.researchers || []).length === 0
              ? <div style={{ marginLeft: '16px', padding: '6px', color: 'var(--sec-text)', fontSize: '0.78rem', fontStyle: 'italic' }}>Aucun membre</div>
              : (team.researchers || []).map(renderResearcher)}
          </div>
        )}
      </div>
    </div>
  );

  const renderLab = (lab) => (
    <div key={lab.id} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: '-2px', top: '22px', width: '20px', borderTop: '2px solid var(--color-institution-connector)' }} />
      <div style={{ marginLeft: '20px' }}>
        <div onClick={() => toggleLab(lab.id)} style={{
          padding: '12px 16px', background: 'var(--bg-cartes)', border: '2px solid var(--color-lab)',
          borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
          gap: '12px', marginBottom: '2px', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px', background: 'var(--color-lab-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <FaFlask size={15} style={{ color: 'var(--color-lab)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, color: 'var(--main-text)', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>{lab.name}</h4>
            <div style={{ display: 'flex', gap: '12px', marginTop: '3px', flexWrap: 'wrap' }}>
              {lab.domaine && (
                <span style={{ fontSize: '0.75rem', color: 'var(--main-green)', fontWeight: 600, background: 'var(--color-lab-light)', padding: '2px 8px', borderRadius: '4px' }}>{lab.domaine}</span>
              )}
              {lab.chef_labo && <span style={{ color: 'var(--sec-text)', fontSize: '0.75rem' }}>Chef: {lab.chef_labo}</span>}
              <span style={{ color: 'var(--sec-text)', fontSize: '0.75rem' }}>{lab.team_count} éq. · {lab.researcher_count} cherch.</span>
            </div>
          </div>
          <div style={{ color: 'var(--sec-text)' }}>{expandedLabs[lab.id] ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}</div>
        </div>
        {expandedLabs[lab.id] && (
          <div style={{ marginLeft: '18px', borderLeft: '2px solid var(--color-team-connector)', paddingBottom: '6px', paddingTop: '4px' }}>
            {(lab.teams || []).length === 0
              ? <div style={{ marginLeft: '20px', padding: '8px', color: 'var(--sec-text)', fontSize: '0.8rem', fontStyle: 'italic' }}>Aucune équipe</div>
              : (lab.teams || []).map(renderTeam)}
          </div>
        )}
      </div>
    </div>
  );

  const renderInstitution = (inst, instIdx, total) => (
    <div key={inst.id} style={{ position: 'relative' }}>
      {isTutelle && <div style={{ position: 'absolute', left: '-2px', top: '28px', width: '24px', borderTop: '2px solid var(--bordres)' }} />}
      <div style={{ marginLeft: isTutelle ? '24px' : '0' }}>
        <div onClick={() => toggleInstitution(inst.id)} style={{
          padding: '16px 20px', background: 'var(--color-institution)', borderRadius: 'var(--radius)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
          marginBottom: '2px', boxShadow: 'var(--shadow-md)', transition: 'all 0.2s ease'
        }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <FaBuilding size={18} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>{inst.name}</h3>
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
              {inst.ville && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}><FaMapMarkerAlt size={10} style={{marginRight: '4px'}}/> {inst.ville}</span>}
              {inst.directeur && <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}><FaUser size={10} style={{marginRight: '4px'}}/> Dir. {inst.directeur}</span>}
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}><FaFlask size={10} style={{marginRight: '4px'}}/> {inst.lab_count} labo{inst.lab_count > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.7)' }}>{expandedInstitutions[inst.id] ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}</div>
        </div>
        {expandedInstitutions[inst.id] && (
          <div style={{ marginLeft: '20px', borderLeft: '2px solid var(--color-institution-connector)', paddingBottom: '8px', paddingTop: '4px' }}>
            {(inst.laboratories || []).length === 0
              ? <div style={{ marginLeft: '24px', padding: '12px', color: 'var(--sec-text)', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun laboratoire</div>
              : (inst.laboratories || []).map(renderLab)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaSitemap style={{ color: 'var(--main-green)' }} />
              Structure Institutionnelle
            </h1>
            <p className="dashboard-subtitle">
              {isTutelle ? `Vue hiérarchique complète — ${hierarchy?.tutelle_name || 'Tutelle'}` : `Organisation de votre institution`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={expandAll} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>Tout déplier</button>
            <button onClick={collapseAll} className="btn btn-secondary" style={{ fontSize: '13px', padding: '8px 16px' }}>Tout réduire</button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="kpi-section">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-blue-light)' }}>
            <FaUniversity style={{ color: 'var(--accent-blue)', fontSize: '1.5rem' }} />
          </div>
          <div className="kpi-content">
            <p className="kpi-title">Institutions</p>
            <p className="kpi-value">{hierarchy?.total_institutions || 0}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon">
            <FaFlask style={{ color: 'var(--main-green)', fontSize: '1.5rem' }} />
          </div>
          <div className="kpi-content">
            <p className="kpi-title">Laboratoires</p>
            <p className="kpi-value">{hierarchy?.total_laboratories || 0}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-amber-light)' }}>
            <FaUsers style={{ color: 'var(--accent-amber)', fontSize: '1.5rem' }} />
          </div>
          <div className="kpi-content">
            <p className="kpi-title">Équipes</p>
            <p className="kpi-value">{hierarchy?.total_teams || 0}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: 'var(--accent-purple-light)' }}>
            <FaUser style={{ color: 'var(--accent-purple)', fontSize: '1.5rem' }} />
          </div>
          <div className="kpi-content">
            <p className="kpi-title">Chercheurs</p>
            <p className="kpi-value">{hierarchy?.total_researchers || 0}</p>
          </div>
        </div>
      </div>

      {/* Tutelle Root Node */}
      {isTutelle && (
        <div style={{
          padding: '18px 24px', background: 'var(--color-tutelle)', borderRadius: 'var(--radius)',
          marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <FaGlobeAfrica size={22} color="var(--color-tutelle-text)" />
          </div>
          <div>
            <h2 style={{ margin: 0, color: 'var(--color-tutelle-text)', fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-title)' }}>
              {hierarchy?.tutelle_name || 'MESRS'}
            </h2>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontFamily: 'var(--font-text)' }}>
              Tutelle — {hierarchy?.total_institutions || 0} institution{(hierarchy?.total_institutions || 0) > 1 ? 's' : ''} sous commandement
            </p>
          </div>
        </div>
      )}

      {/* Tree */}
      {isTutelle && (hierarchy?.institutions || []).length > 0 && (
        <div style={{ marginLeft: '40px', borderLeft: '2px solid var(--bordres)', paddingTop: '4px' }}>
          {(hierarchy?.institutions || []).map((inst, idx) => renderInstitution(inst, idx, hierarchy.institutions.length))}
        </div>
      )}

      {/* Directeur view */}
      {!isTutelle && (hierarchy?.institutions || []).map((inst, idx) => (
        <div key={inst.id} style={{ marginTop: '16px' }}>
          {renderInstitution(inst, idx, 1)}
        </div>
      ))}
    </div>
  );
}

export default InstitutionalStructure;
