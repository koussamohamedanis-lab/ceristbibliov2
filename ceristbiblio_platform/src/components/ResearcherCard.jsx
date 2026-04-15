import React from 'react';

function ResearcherCard({ data }) {
  if (!data) return null;

  // Déterminer si c'est un article PubMed ou un chercheur OpenAlex
  const isPubMed = data.source === "PubMed" || data.journal;
  
  if (isPubMed) {
    // Format PubMed : Article
    const authors = data.authors_list?.join(", ") || "Unknown Authors";
    const publicationDate = data.publication_date || "N/A";
    const journal = data.journal || "Unknown Journal";
    const articleUrl = data.link || "#";

    return (
      <div className="researcher-card pubmed-card">
        <h3 className="article-title">
          <a href={articleUrl} target="_blank" rel="noopener noreferrer">
            {data.display_name || "Untitled Article"}
          </a>
        </h3>
        
        <div className="researcher-stats">
          <div className="stat-item"><strong>Authors:</strong> {authors}</div>
          <div className="stat-item"><strong>Journal:</strong> {journal}</div>
          <div className="stat-item"><strong>Date:</strong> {publicationDate}</div>
          <div className="stat-item"><strong>Source:</strong> <span className="source-badge">PubMed</span></div>
        </div>
      </div>
    );
  }

  // Format OpenAlex : Chercheur
  const hIndex = data.summary_stats?.h_index || "N/A";
  const works = data.works_count || 0;
  const citations = data.cited_by_count || 0;
  const affiliation = data.last_known_institutions?.[0]?.display_name || "Unknown";
  const profileUrl = data.id || "#";
  const country = data.last_known_institutions?.[0]?.country_code || "N/A";
  const topics = data.x_concepts?.slice(0, 3).map((concept) => concept.display_name).join(", ") || "Généraliste";

  return (
    <div className="researcher-card openalex-card">
      <h3 className="researcher-name">
        <a href={profileUrl} target="_blank" rel="noopener noreferrer">
          {data.display_name || "Unknown Researcher"}
        </a>
      </h3>
      
      <div className="researcher-stats">
        <div className="stat-item"><strong>H-Index:</strong> {hIndex}</div>
        <div className="stat-item"><strong>Works:</strong> {works}</div>
        <div className="stat-item"><strong>Citations:</strong> {citations}</div>
        <div className="stat-item"><strong>Affiliation:</strong> {affiliation}</div>
        <div className="stat-item"><strong>Pays:</strong> {country}</div>
        <div className="stat-item"><strong>Topics:</strong> {topics}</div>
        <div className="stat-item"><strong>Source:</strong> <span className="source-badge">OpenAlex</span></div>
      </div>

      {data.counts_by_year && data.counts_by_year.length > 0 && (
        <p className="researcher-year">Active since: {data.counts_by_year[0]?.year || 'N/A'}</p>
      )}
    </div>
  );
}

export default ResearcherCard;