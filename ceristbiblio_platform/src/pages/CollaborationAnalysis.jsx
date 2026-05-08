import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import '../assets/dashboard.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FaProjectDiagram, FaUsers, FaBook, FaHandshake, FaStar, FaFileAlt, FaChartBar, FaTrophy, FaMedal } from 'react-icons/fa';

// ============================================================
// Simple force-directed network graph drawn with Canvas
// ============================================================
function NetworkGraph({ nodes, links }) {
  const canvasRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Assign positions using a simple force simulation
  const positionsRef = useRef([]);

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    const W = container.clientWidth || 700;
    const H = 500;
    setDimensions({ width: W, height: H });
    canvas.width = W;
    canvas.height = H;

    // Color palette per group
    const groupColors = {};
    const palette = [
      '#16A34A', '#3B82F6', '#9333EA', '#F59E0B',
      '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6',
      '#10B981', '#F97316'
    ];
    let gi = 0;
    nodes.forEach(n => {
      if (!groupColors[n.group]) {
        groupColors[n.group] = palette[gi % palette.length];
        gi++;
      }
    });

    // Initialize positions
    const positions = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const radius = Math.min(W, H) * 0.35;
      return {
        id: n.id,
        x: W / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: H / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        label: n.label,
        group: n.group,
        publications: n.publications,
        citations: n.citations,
        degree: n.degree,
        color: groupColors[n.group] || '#64748B',
        radius: Math.max(8, Math.min(30, 8 + (n.publications || 0) * 1.5)),
      };
    });

    const idToIndex = {};
    positions.forEach((p, i) => { idToIndex[p.id] = i; });

    // Simple force simulation (run N iterations)
    for (let iter = 0; iter < 120; iter++) {
      // Repulsion
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          let dx = positions[j].x - positions[i].x;
          let dy = positions[j].y - positions[i].y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          let force = 2000 / (dist * dist);
          let fx = (dx / dist) * force;
          let fy = (dy / dist) * force;
          positions[i].vx -= fx;
          positions[i].vy -= fy;
          positions[j].vx += fx;
          positions[j].vy += fy;
        }
      }
      // Attraction via links
      links.forEach(link => {
        const si = idToIndex[link.source];
        const ti = idToIndex[link.target];
        if (si === undefined || ti === undefined) return;
        let dx = positions[ti].x - positions[si].x;
        let dy = positions[ti].y - positions[si].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - 100) * 0.005 * (link.weight || 1);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        positions[si].vx += fx;
        positions[si].vy += fy;
        positions[ti].vx -= fx;
        positions[ti].vy -= fy;
      });
      // Center gravity
      positions.forEach(p => {
        p.vx += (W / 2 - p.x) * 0.001;
        p.vy += (H / 2 - p.y) * 0.001;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        // Keep in bounds
        p.x = Math.max(40, Math.min(W - 40, p.x));
        p.y = Math.max(40, Math.min(H - 40, p.y));
      });
    }

    positionsRef.current = positions;

    // Draw
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Draw links
    links.forEach(link => {
      const si = idToIndex[link.source];
      const ti = idToIndex[link.target];
      if (si === undefined || ti === undefined) return;
      const s = positions[si];
      const t = positions[ti];
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = `rgba(100, 116, 139, ${Math.min(0.8, 0.15 + (link.weight || 1) * 0.15)})`;
      ctx.lineWidth = Math.min(5, 1 + (link.weight || 1));
      ctx.stroke();
    });

    // Draw nodes
    positions.forEach(p => {
      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius + 4, 0, 2 * Math.PI);
      ctx.fillStyle = `${p.color}22`;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, 2 * Math.PI);
      const gradient = ctx.createRadialGradient(p.x - 2, p.y - 2, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, p.color + 'DD');
      gradient.addColorStop(1, p.color);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label - read computed color from CSS variable
      const computedTextColor = getComputedStyle(document.documentElement).getPropertyValue('--main-text').trim() || '#e2e8f0';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = computedTextColor;
      ctx.fillText(p.label, p.x, p.y + p.radius + 15);
    });

  }, [nodes, links]);

  const handleMouseMove = (e) => {
    if (!positionsRef.current.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found = null;
    for (const p of positionsRef.current) {
      const dist = Math.sqrt((mx - p.x) ** 2 + (my - p.y) ** 2);
      if (dist < p.radius + 5) {
        found = p;
        break;
      }
    }
    setHoveredNode(found);
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sec-text)' }}>
        <FaProjectDiagram size={40} style={{ opacity: 0.4, marginBottom: '10px' }} />
        <p>Aucune donnée de collaboration disponible</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{ width: '100%', height: '500px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.6)', cursor: hoveredNode ? 'pointer' : 'default' }}
      />
      {hoveredNode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'var(--bg-cartes)',
          border: '1px solid var(--bordres)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          boxShadow: 'var(--shadow-md)',
          minWidth: '200px',
          zIndex: 10
        }}>
          <h4 style={{ margin: 0, color: hoveredNode.color, fontSize: '14px' }}>{hoveredNode.label}</h4>
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--sec-text)', lineHeight: '1.8' }}>
            <div><FaFileAlt style={{marginRight: '5px'}}/> Publications : <strong style={{ color: 'var(--main-text)' }}>{hoveredNode.publications}</strong></div>
            <div><FaChartBar style={{marginRight: '5px'}}/> Citations : <strong style={{ color: 'var(--main-text)' }}>{hoveredNode.citations}</strong></div>
            <div><FaHandshake style={{marginRight: '5px'}}/> Collaborateurs : <strong style={{ color: 'var(--main-text)' }}>{hoveredNode.degree}</strong></div>
            <div><FaUsers style={{marginRight: '5px'}}/> Groupe : <strong style={{ color: hoveredNode.color }}>{hoveredNode.group}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================
function CollaborationAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollaborationData();
  }, []);

  const fetchCollaborationData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hierarchy/collaboration/analysis');
      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching collaboration data:', err);
      setError('Impossible de charger les données de collaboration.');
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard-loading">Analyse des collaborations en cours...</div>;
  if (error) return <div className="dashboard-error">{error}</div>;
  if (!data) return null;

  const { network, stats, top_collaborators, collaboration_by_year } = data;

  // Pie chart data for collaboration rate
  const pieData = [
    { name: 'Collaboratives', value: Math.round(stats.collaboration_rate) || 0 },
    { name: 'Individuelles', value: Math.round(100 - (stats.collaboration_rate || 0)) }
  ];
  const PIE_COLORS = ['#16A34A', '#334155'];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaProjectDiagram style={{ color: 'var(--main-green)' }} />
            Analyse de Collaboration
          </h1>
          <p style={{ color: 'var(--sec-text)', marginTop: '4px' }}>
            Cartographie des réseaux de co-autorat et mesure de l'intensité des échanges scientifiques
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-section">
        <div className="kpi-card" style={{ background: 'var(--bg-cartes)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', border: '1px solid var(--bordres)' }}>
          <FaUsers size={28} style={{ color: '#3B82F6', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--main-text)' }}>{stats.total_researchers}</div>
          <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Chercheurs</div>
        </div>
        <div className="kpi-card" style={{ background: 'var(--bg-cartes)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', border: '1px solid var(--bordres)' }}>
          <FaBook size={28} style={{ color: '#9333EA', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--main-text)' }}>{stats.total_publications}</div>
          <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Publications</div>
        </div>
        <div className="kpi-card" style={{ background: 'var(--bg-cartes)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', border: '1px solid var(--bordres)' }}>
          <FaHandshake size={28} style={{ color: '#16A34A', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--main-text)' }}>{stats.collaboration_rate}%</div>
          <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Taux de collaboration</div>
        </div>
        <div className="kpi-card" style={{ background: 'var(--bg-cartes)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', border: '1px solid var(--bordres)' }}>
          <FaStar size={28} style={{ color: '#F59E0B', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--main-text)' }}>{stats.avg_authors_per_pub}</div>
          <div style={{ fontSize: '12px', color: 'var(--sec-text)' }}>Auteurs / Publication</div>
        </div>
      </div>

      {/* Network Graph */}
      <div className="dashboard-section" style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaProjectDiagram style={{ color: 'var(--main-green)' }} />
          Réseau de Co-autorat
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--sec-text)', marginBottom: '12px' }}>
          Chaque nœud représente un chercheur. Les liens indiquent des publications communes. La taille est proportionnelle au nombre de publications.
        </p>
        <NetworkGraph nodes={network.nodes} links={network.links} />
        {/* Legend */}
        {network.nodes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
            {[...new Set(network.nodes.map(n => n.group))].filter(g => g !== 'default').map((group, i) => {
              const palette = ['#16A34A', '#3B82F6', '#9333EA', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#8B5CF6'];
              return (
                <div key={group} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--sec-text)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: palette[i % palette.length], display: 'inline-block' }} />
                  {group}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>

        {/* Collaboration by Year */}
        {collaboration_by_year && collaboration_by_year.length > 0 && (
          <div className="dashboard-section" style={{ height: '420px' }}>
            <h3 style={{ marginBottom: '16px' }}>Évolution de la Collaboration</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={collaboration_by_year} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
                <XAxis dataKey="year" stroke="var(--sec-text)" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--sec-text)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-cartes)', border: '1px solid var(--bordres)', borderRadius: 'var(--radius)' }}
                />
                <Legend />
                <Bar dataKey="collaboratives" fill="#16A34A" name="Publications collaboratives" radius={[4, 4, 0, 0]} />
                <Bar dataKey="individuelles" fill="#334155" name="Publications individuelles" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Collaboration Rate Pie */}
        <div className="dashboard-section" style={{ height: '420px' }}>
          <h3 style={{ marginBottom: '16px' }}>Taux de Co-autorat</h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--bg-cartes)', border: '1px solid var(--bordres)', borderRadius: 'var(--radius)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Collaborators Table */}
      {top_collaborators && top_collaborators.length > 0 && (
        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaTrophy style={{ color: '#F59E0B' }}/> Top Collaborateurs (par nombre de connexions)
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--bordres)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Rang</th>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Chercheur</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Groupe</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Publications</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Citations</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--sec-text)', fontWeight: '600' }}>Collaborateurs</th>
                </tr>
              </thead>
              <tbody>
                {top_collaborators.map((collab, index) => (
                  <tr key={collab.id} style={{ borderBottom: '1px solid var(--bordres)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px', color: 'var(--main-text)' }}>
                      {index === 0 ? <FaMedal color="#FFD700" size={20}/> : index === 1 ? <FaMedal color="#C0C0C0" size={20}/> : index === 2 ? <FaMedal color="#CD7F32" size={20}/> : `#${index + 1}`}
                    </td>
                    <td style={{ padding: '12px', color: 'var(--main-text)', fontWeight: '500' }}>{collab.label}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(22, 163, 74, 0.15)', color: '#16A34A', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                        {collab.group}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--main-text)' }}>{collab.publications}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: 'var(--main-text)' }}>{collab.citations}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                        {collab.degree}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CollaborationAnalysis;
