import { useSearch } from '../context/useSearch';
import { useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import ResearcherCard from '../components/ResearcherCard';

function Results() {
  const { results, loading, hasMore, currentPage, appendResults, searchCriteria, totalResults, source } = useSearch();
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    if (!searchCriteria || loadingMore) return;

    setLoadingMore(true);
    try {
      const response = await axios.post(
        `http://localhost:8000/api/researcher/search/advanced`,
        {
          criteria: searchCriteria.criteria,
          primaryQuery: searchCriteria.primaryQuery,
          source: searchCriteria.source || source,
          page: currentPage + 1,
          perPage: 20
        }
      );
      
      appendResults(response.data.results || []);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-container">
          <p>Recherche en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Résultats de Recherche</h1>
        <p>Découvrez les chercheurs correspondant à votre requête</p>
      </div>

      {results.length > 0 ? (
        <div className="results-section">
          <div className="results-info">
            <span className="results-badge">
              {results.length} {totalResults > 0 ? `/ ${totalResults}` : ''} résultats
            </span>
          </div>
          <div className="results-grid">
            {results.map((result, index) => (
              <ResearcherCard key={index} data={result} />
            ))}
          </div>

          {(hasMore || results.length < totalResults) && (
            <div className="load-more-section">
              <button 
                className="btn-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <FaSpinner className="spinner-icon" />
                    Chargement...
                  </>
                ) : (
                  'Charger plus de résultats'
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state-full">
          <h2>Aucun résultat trouvé</h2>
          <p>Essayez une autre recherche</p>
        </div>
      )}
    </div>
  );
}

export default Results;
