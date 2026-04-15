import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaUserCircle, FaGraduationCap, FaQuoteLeft, FaChartLine, FaEnvelope, FaExternalLinkAlt } from 'react-icons/fa';
import '../assets/researcher-card.css';

function ResearcherProfileCard({ data }) {
  if (!data) return null;

  const chartData = (data.publication_by_year || []).map(item => ({
    year: item.year?.toString(),
    count: item.count
  }));

  return (
    <div className="researcher-profile-card">
      <div className="profile-header">
        <div className="profile-avatar">
          <FaUserCircle />
        </div>
        <div className="profile-info">
          <h2>{data.prenom} {data.nom}</h2>
          <p className="profile-role"><FaGraduationCap /> {data.role || 'Chercheur'}</p>
          <p className="profile-email"><FaEnvelope /> {data.email}</p>
        </div>
      </div>

      <div className="profile-metrics-grid">
        <div className="metric-box h-index">
          <span className="metric-label">H-Index</span>
          <span className="metric-value">{data.h_index || 0}</span>
        </div>
        <div className="metric-box citations">
          <span className="metric-label">Citations</span>
          <span className="metric-value">{data.total_citations || 0}</span>
          <FaQuoteLeft className="box-icon" />
        </div>
        <div className="metric-box publications">
          <span className="metric-label">Publications</span>
          <span className="metric-value">{data.total_publications || 0}</span>
          <FaChartLine className="box-icon" />
        </div>
      </div>

      <div className="profile-chart-section">
        <h3>Évolution de la Production</h3>
        <div className="profile-chart-container">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bordres)" />
              <XAxis dataKey="year" fontSize={10} tickMargin={10} />
              <YAxis fontSize={10} />
              <Tooltip 
                contentStyle={{ borderRadius: 'var(--radius)', border: 'none', boxShadow: 'var(--shadow-sm)' }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="var(--main-green)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--main-green)' }} 
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="profile-external-links">
        <h3>Profils Externes</h3>
        <div className="links-row">
          <a href={`https://openalex.org/authors/${data.openalex_id}`} target="_blank" rel="noreferrer" className="external-link">
            OpenAlex <FaExternalLinkAlt size={10} />
          </a>
          <button className="external-link disabled">ORCID</button>
          <button className="external-link disabled">Scopus</button>
        </div>
      </div>
    </div>
  );
}

export default ResearcherProfileCard;
