import { useState } from 'react'
import { FiFileText, FiExternalLink, FiClipboard } from 'react-icons/fi'

const PublicationsTable = ({ publications = [] }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(publications.length / itemsPerPage)

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = publications.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="publications-container">
      <h3 className="publications-title">Mes Publications</h3>
      
      <div className="table-wrapper">
        <table className="publications-table">
          <thead>
            <tr>
              <th>Titre</th>
              <th>Année</th>
              <th>Type</th>
              <th>Citations</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((pub, idx) => (
                <tr key={idx}>
                  <td className="pub-title">{pub.title || 'Sans titre'}</td>
                  <td>{pub.year || 'N/A'}</td>
                  <td>
                    <span className="type-badge">{pub.type || 'Article'}</span>
                  </td>
                  <td>{pub.citations_count || pub.citations || pub.cited_by_count || 0}</td>
                  <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {pub.url && (
                      <a 
                        href={pub.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-link"
                        title="Voir la publication"
                      >
                        <FiFileText size={16} />
                      </a>
                    )}
                    {pub.openalex_id && (
                      <a 
                        href={`https://openalex.org/${pub.openalex_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-link"
                        title="Voir sur OpenAlex"
                      >
                        <FiExternalLink size={16} />
                      </a>
                    )}
                    {pub.doi && (
                      <a 
                        href={`https://doi.org/${pub.doi}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="action-link"
                        title="Voir le DOI"
                      >
                        <FiClipboard size={16} />
                      </a>
                    )}
                    {!pub.url && !pub.openalex_id && !pub.doi && (
                      <span style={{ color: 'var(--sec-text)', fontSize: '12px' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--sec-text)' }}>
                  Aucune publication trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Précédent
          </button>
          
          <div className="pagination-info">
            Page {currentPage} / {totalPages}
          </div>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}

export default PublicationsTable
