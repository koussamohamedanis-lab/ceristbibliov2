import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaChartBar, FaBook, FaQuoteLeft, FaFire } from 'react-icons/fa';
import '../assets/stats-panel.css';

function StatsPanel({ statistics, entityType }) {
  if (!statistics) {
    return null;
  }

  // Safe extraction of publication data
  const publicationData = statistics.publication_by_year || [];
  
  // Transform data for Recharts (handles both [year, count] and {year, count} formats)
  const chartData = Array.isArray(publicationData) 
    ? publicationData.map(item => {
        if (Array.isArray(item)) {
          return { year: item[0]?.toString(), publications: item[1] };
        }
        return { year: item.year?.toString(), publications: item.count };
      })
    : [];

  const researchersCount = statistics.members_count || statistics.total_researchers || 0;
  const totalCitations = statistics.total_citations || 0;
  const totalPubs = statistics.total_publications || 0;
  const avgH = statistics.avg_h_index || 0;

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <FaChartBar className="stats-icon" />
        <h2>Tableau de Bord Statistique</h2>
      </div>

      {/* KPIs Grid */}
      <div className="stats-kpis">
        <div className="kpi-card kpi-researchers">
          <div className="kpi-top">
            <span className="kpi-label">Chercheurs</span>
            <FaFire className="kpi-icon" />
          </div>
          <div className="kpi-value">{researchersCount}</div>
          <p className="kpi-description">Nombre de chercheurs</p>
        </div>

        <div className="kpi-card kpi-publications">
          <div className="kpi-top">
            <span className="kpi-label">Publications</span>
            <FaBook className="kpi-icon" />
          </div>
          <div className="kpi-value">{totalPubs}</div>
          <p className="kpi-description">Total des publications</p>
        </div>

        <div className="kpi-card kpi-citations">
          <div className="kpi-top">
            <span className="kpi-label">Citations</span>
            <FaQuoteLeft className="kpi-icon" />
          </div>
          <div className="kpi-value">{totalCitations}</div>
          <p className="kpi-description">Total des citations</p>
        </div>

        <div className="kpi-card kpi-h-index">
          <div className="kpi-top">
            <span className="kpi-label">H-Index Moyen</span>
            <FaChartBar className="kpi-icon" />
          </div>
          <div className="kpi-value">{avgH.toFixed(2)}</div>
          <p className="kpi-description">Indice de Hirsch moyen</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="stats-chart-section">
        <h3 className="chart-title">Évolution des Publications</h3>
        <div className="chart-container">
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bordres)" />
                <XAxis
                  dataKey="year"
                  stroke="var(--sec-text)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="var(--sec-text)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-cartes)',
                    border: `1px solid var(--bordres)`,
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'var(--main-text)' }}
                  formatter={(value) => [`${value} publications`, 'Publications']}
                />
                <Legend wrapperStyle={{ color: 'var(--main-text)' }} />
                <Line
                  type="monotone"
                  dataKey="publications"
                  stroke="var(--main-green)"
                  strokeWidth={3}
                  dot={{
                    fill: 'var(--main-green)',
                    r: 5,
                  }}
                  activeDot={{
                    r: 7,
                    fill: 'var(--hover-green)',
                  }}
                  name="Publications"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">
              <p>Aucune donnée disponible</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      <div className="stats-summary">
        <h3>Résumé</h3>
        <div className="summary-text">
          <p>
            Cette {entityType === 'director' ? 'institution' : entityType === 'laboratory' ? 'unité de recherche' : 'équipe'} compte
            <strong> {researchersCount} membres</strong> ayant produit
            <strong> {totalPubs} publications</strong> citées
            <strong> {totalCitations} fois</strong> au total.
          </p>
          <p>
            L'indice de Hirsch moyen est de <strong>{avgH.toFixed(2)}</strong>,
            indiquant une productivité scientifique de qualité dans ce groupe.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
