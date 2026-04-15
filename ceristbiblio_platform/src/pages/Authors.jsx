import React from 'react';
import { useSearch } from '../context/useSearch';
import ResearcherCard from '../components/ResearcherCard';

function Authors() {
  const { results, setSelectedAuthor, selectedAuthor, source } = useSearch();

  const isPubMed = source === "pubmed";
  const pageTitle = isPubMed ? "Articles" : "Chercheurs";
  const pageSubtitle = isPubMed 
    ? "Consultez les articles et leurs détails"
    : "Analysez les profils et sélectionnez un chercheur pour explorer ses publications";
  const resultLabel = isPubMed ? "articles trouvés" : "chercheurs trouvés";
  const selectedLabel = isPubMed ? "Article sélectionné" : "sélectionné";
  const cardWrapperClass = isPubMed ? "article-card-wrapper" : "author-card-wrapper";

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{pageTitle}</h1>
        <p>{pageSubtitle}</p>
      </div>

      {results.length > 0 ? (
        <div className={isPubMed ? "articles-section" : "authors-section"}>
          <div className={isPubMed ? "articles-info" : "authors-info"}>
            <span className={isPubMed ? "articles-badge" : "authors-badge"}>{results.length} {resultLabel}</span>
            {selectedAuthor && (
              <span className="selection-badge">
                {selectedAuthor.display_name} {selectedLabel}
              </span>
            )}
          </div>
          <div className={isPubMed ? "articles-grid" : "authors-grid"}>
            {results.map((item, index) => (
              <div 
                key={item.id || index} 
                className={`${cardWrapperClass} ${selectedAuthor?.id === (item.id || index) ? 'selected' : ''}`}
                onClick={() => setSelectedAuthor(item)}
              >
                <ResearcherCard data={item} />
                <div className="card-footer">
                  {selectedAuthor?.id === (item.id || index) ? (
                    <span className="badge-selected">Sélectionné</span>
                  ) : (
                    <span className="badge-clickable">Cliquer pour voir plus</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state-full">
          <h2>Aucun {isPubMed ? "article" : "chercheur"} trouvé</h2>
          <p>Effectuez une recherche pour commencer</p>
        </div>
      )}
    </div>
  );
}

export default Authors;