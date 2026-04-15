import React, { useMemo, useState, useEffect } from 'react';
import { useSearch } from '../context/useSearch';
import { getAuthorWorks } from '../services/api';
import ResearcherCard from '../components/ResearcherCard';

function Documents() {
  const { results, selectedAuthor, source } = useSearch();
  const [authorWorks, setAuthorWorks] = useState([]);
  const [loading, setLoading] = useState(!!selectedAuthor);

  const isPubMed = source === "pubmed";

  useEffect(() => {
    let isMounted = true;

    if (!selectedAuthor?.id) {
      return;
    }

    // Extract just the ID from the full URL if needed
    const authorId = selectedAuthor.id.includes('/') 
      ? selectedAuthor.id.split('/').pop() 
      : selectedAuthor.id;
    
    getAuthorWorks(authorId)
      .then(response => {
        if (isMounted) {
          setAuthorWorks(response.data.works || []);
          setLoading(false);
        }
      })
      .catch(error => {
        if (isMounted) {
          console.error('Error fetching author works:', error);
          setAuthorWorks([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAuthor]);

  const documentsData = useMemo(() => {
    if (selectedAuthor) {
      return [{
        id: selectedAuthor.id,
        authorName: selectedAuthor.display_name,
        authorId: selectedAuthor.id,
        publicationCount: selectedAuthor.works_count || 0,
        citationCount: selectedAuthor.cited_by_count || 0,
        hIndex: selectedAuthor.summary_stats?.h_index || 0,
        concepts: selectedAuthor.x_concepts || [],
        affiliation: selectedAuthor.last_known_institutions?.[0]?.display_name || 'Unknown',
        country: selectedAuthor.last_known_institutions?.[0]?.country_code || 'N/A',
        works: authorWorks,
      }];
    }

    const docs = [];
    results.forEach(author => {
      if (author.id) {
        docs.push({
          id: author.id,
          authorName: author.display_name,
          authorId: author.id,
          publicationCount: author.works_count || 0,
          citationCount: author.cited_by_count || 0,
          hIndex: author.summary_stats?.h_index || 0,
          concepts: author.x_concepts || [],
          affiliation: author.last_known_institutions?.[0]?.display_name || 'Unknown',
          country: author.last_known_institutions?.[0]?.country_code || 'N/A',
          works: [],
        });
      }
    });

    return docs.sort((a, b) => b.publicationCount - a.publicationCount);
  }, [results, selectedAuthor, authorWorks]);

  const handleAuthorClick = (authorId) => {
    // Extract just the ID if it's a full URL
    const cleanId = authorId.includes('/') 
      ? authorId.split('/').pop() 
      : authorId;
    window.open(`https://openalex.org/${cleanId}`, '_blank', 'noopener noreferrer');
  };

  const handleWorkClick = (workId) => {
    if (!workId) return;
    // Extract just the ID if it's a full URL
    const cleanId = workId.includes('/') 
      ? workId.split('/').pop() 
      : workId;
    window.open(`https://openalex.org/${cleanId}`, '_blank', 'noopener noreferrer');
  };

  const renderConcepts = (concepts) => {
    if (!concepts || concepts.length === 0) return 'Généraliste';
    return concepts.slice(0, 5).map(c => c.display_name).join(', ');
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h1>{isPubMed ? "Articles" : "Production Scientifique"}</h1>
        <p>{isPubMed ? "Articles PubMed trouvés lors de votre recherche" : "Répertoire de la production académique et explorable"}</p>
      </div>

      {isPubMed ? (
        // PubMed: Afficher directement les articles
        results && results.length > 0 ? (
          <div className="articles-list-pubmed">
            {results.map((article, idx) => (
              <div key={idx} className="article-item-pubmed">
                <div className="article-number">{idx + 1}</div>
                <div className="article-content">
                  <h3 className="article-title">
                    <a href={article.link} target="_blank" rel="noopener noreferrer">
                      {article.display_name || "Untitled"}
                    </a>
                  </h3>
                  <div className="article-meta">
                    <span className="article-authors">{article.authors_list?.slice(0, 3).join(", ")}{article.authors_list?.length > 3 ? " et al." : ""}</span>
                    <span className="article-journal">{article.journal}</span>
                    <span className="article-date">{article.publication_date}</span>
                  </div>
                </div>
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="btn-view-article">
                  Voir sur PubMed
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-full">
            <h2>Aucun article trouvé</h2>
            <p>Effectuez une recherche PubMed pour commencer</p>
          </div>
        )
      ) : (
        // OpenAlex: Afficher les chercheurs et leurs publications
        documentsData && documentsData.length > 0 ? (
          selectedAuthor ? (
            <div className="author-publications">
            <div className="author-hero-section">
              <div className="author-header-content">
                <div className="author-name-section">
                  <h2>{documentsData[0].authorName}</h2>
                  <p className="author-affiliation">{documentsData[0].affiliation}</p>
                </div>
                <button 
                  className="btn-profile-complete"
                  onClick={() => handleAuthorClick(documentsData[0].authorId)}
                  title="Consulter le profil complet sur OpenAlex"
                >
                  Voir le Profil
                </button>
              </div>

              <div className="author-stats-row">
                <div className="author-stat-item">
                  <span className="stat-number">{documentsData[0].publicationCount}</span>
                  <span className="stat-name">Publications</span>
                </div>
                <div className="author-stat-item">
                  <span className="stat-number">{documentsData[0].citationCount}</span>
                  <span className="stat-name">Citations</span>
                </div>
                <div className="author-stat-item">
                  <span className="stat-number">{documentsData[0].hIndex}</span>
                  <span className="stat-name">H-Index</span>
                </div>
              </div>

              <div className="author-expertise-line">
                <span className="expertise-label">Domaines:</span>
                <span className="expertise-tags">{renderConcepts(documentsData[0].concepts)}</span>
              </div>
            </div>

            <div className="publications-section">
              <div className="section-header">
                <h3>Production Scientifique</h3>
                <span className="pub-count">{documentsData[0].publicationCount} publications</span>
              </div>
              
              {loading ? (
                <div className="loading-publications">
                  <p>Chargement des publications...</p>
                </div>
              ) : documentsData[0].works && documentsData[0].works.length > 0 ? (
                <div className="publications-list">
                  {documentsData[0].works.map((work, idx) => (
                    <div key={idx} className="publication-item">
                      <div className="pub-index">{idx + 1}</div>
                      <div className="pub-content">
                        <button
                          className="pub-title"
                          onClick={() => handleWorkClick(work.id)}
                          title="Accéder à la publication"
                        >
                          {work.title || work.display_name || 'Sans titre'}
                        </button>
                        <div className="pub-footer">
                          <span className="pub-year">{work.publication_year || 'N/A'}</span>
                          <span className="pub-citations">{work.cited_by_count || 0} citations</span>
                        </div>
                      </div>
                      <button
                        className="pub-open-btn"
                        onClick={() => handleWorkClick(work.id)}
                        title="Ouvrir sur OpenAlex"
                      >
                        Consulter
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-publications">
                  <p>Aucune publication disponible</p>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="documents-grid">
              {documentsData.map((doc, idx) => (
                <div key={idx} className="document-card">
                  <div className="doc-header">
                    <h3 className="doc-title">
                      <button 
                        className="author-link"
                        onClick={() => handleAuthorClick(doc.authorId)}
                        title="Accéder au profil OpenAlex"
                      >
                        {doc.authorName}
                      </button>
                    </h3>
                    <div className="doc-badges">
                      <span className="badge publication-badge">{doc.publicationCount} publications</span>
                      <span className="badge citation-badge">{doc.citationCount} citations</span>
                    </div>
                  </div>

                  <div className="doc-metrics">
                    <div className="metric">
                      <span className="metric-label">H-Index</span>
                      <span className="metric-value">{doc.hIndex}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Affiliation</span>
                      <span className="metric-value-text">{doc.affiliation}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Pays</span>
                      <span className="metric-value">{doc.country}</span>
                    </div>
                  </div>

                  <div className="doc-concepts">
                    <h4>Domaines d'Expertise</h4>
                    <p>{renderConcepts(doc.concepts)}</p>
                  </div>

                  <div className="doc-actions">
                    <button 
                      className="action-btn"
                      onClick={() => handleAuthorClick(doc.authorId)}
                      title="Consulter sur OpenAlex"
                    >
                      Voir sur OpenAlex
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="empty-state-full">
            <h2>Aucun document disponible</h2>
            <p>Effectuez d'abord une recherche pour voir les publications</p>
          </div>
        )
      )}
    </div>
  );
}

export default Documents;
