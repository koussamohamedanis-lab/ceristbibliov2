import React, { useMemo } from 'react';
import { useSearch } from '../context/useSearch';

function Sources() {
  const { results, source } = useSearch();

  const isPubMed = source === "pubmed";

  const journalStats = useMemo(() => {
    const journalMap = {};

    results.forEach(article => {
      const journal = article.journal || 'Unknown';
      journalMap[journal] = (journalMap[journal] || 0) + 1;
    });

    const journals = Object.entries(journalMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return journals;
  }, [results]);

  const institutionStats = useMemo(() => {
    if (isPubMed) {
      return { institutions: [], countries: [] };
    }

    const institutionMap = {};
    const countryMap = {};

    results.forEach(author => {
      author.last_known_institutions?.forEach(institution => {
        const instName = institution.display_name || 'Unknown';
        const country = institution.country_code || 'Unknown';

        institutionMap[instName] = (institutionMap[instName] || 0) + 1;
        countryMap[country] = (countryMap[country] || 0) + 1;
      });
    });

    const institutions = Object.entries(institutionMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const countries = Object.entries(countryMap)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return { institutions, countries };
  }, [results, isPubMed]);

  const maxInstitutionCount = isPubMed 
    ? (journalStats.length > 0 ? Math.max(...journalStats.map(j => j.count)) : 0)
    : (institutionStats.institutions.length > 0 ? Math.max(...institutionStats.institutions.map(i => i.count)) : 0);

  const maxCountryCount = institutionStats.countries.length > 0
    ? Math.max(...institutionStats.countries.map(c => c.count))
    : 0;

  const getCountryName = (code) => {
    const countryNames = {
      'US': 'United States',
      'FR': 'France',
      'GB': 'United Kingdom',
      'DE': 'Germany',
      'JP': 'Japan',
      'CN': 'China',
      'IT': 'Italy',
      'ES': 'Spain',
      'BR': 'Brazil',
      'CA': 'Canada',
      'AU': 'Australia',
      'NL': 'Netherlands',
      'SE': 'Sweden',
      'CH': 'Switzerland',
      'KR': 'South Korea',
      'SG': 'Singapore',
      'IN': 'India',
      'RU': 'Russia',
      'MX': 'Mexico',
      'IL': 'Israel',
    };
    return countryNames[code] || code;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{isPubMed ? "Journaux & Sources" : "Cartographie des Affiliations"}</h1>
        <p>{isPubMed ? "Analyse des journaux où les articles ont été publiés" : "Analyse institutionnelle et géographique des pôles de compétences"}</p>
      </div>

      <div className="sources-grid">
        {isPubMed ? (
          <>
            <div className="sources-card journals-card">
              <h2>Journaux Principaux</h2>
              <p className="card-subtitle">Top 20 journaux par nombre d'articles</p>
              
              {journalStats.length > 0 ? (
                <div className="sources-list">
                  {journalStats.map((journal, idx) => (
                    <div key={idx} className="source-item">
                      <div className="source-rank">{idx + 1}</div>
                      <div className="source-content">
                        <div className="source-name">{journal.name}</div>
                        <div className="source-bar-wrapper">
                          <div 
                            className="source-bar"
                            style={{ width: `${(journal.count / maxInstitutionCount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="source-count">{journal.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">Aucun journal trouvé</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="sources-card institutions-card">
              <h2>Établissements Leaders</h2>
              <p className="card-subtitle">Top 20 institutions par nombre de chercheurs</p>
              
              {institutionStats.institutions.length > 0 ? (
            <div className="institutions-list">
              {institutionStats.institutions.map((inst, idx) => (
                <div key={idx} className="institution-item">
                  <div className="inst-info">
                    <span className="inst-rank">{idx + 1}</span>
                    <span className="inst-name">{inst.name}</span>
                  </div>
                  <div className="inst-bar-wrapper">
                    <div 
                      className="inst-bar"
                      style={{ width: `${(inst.count / maxInstitutionCount) * 100}%` }}
                      title={`${inst.count} chercheur${inst.count > 1 ? 's' : ''}`}
                    ></div>
                  </div>
                  <span className="inst-count">{inst.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Aucune donnée disponible</p>
          )}
        </div>

        <div className="sources-card geographic-card">
          <h2>Distribution Géographique</h2>
          <p className="card-subtitle">Présence par pays</p>
          
          {institutionStats.countries.length > 0 ? (
            <div className="countries-list">
              {institutionStats.countries.map((country, idx) => (
                <div key={idx} className="country-item">
                  <div className="country-info">
                    <span className="country-code">{country.code}</span>
                    <span className="country-name">{getCountryName(country.code)}</span>
                  </div>
                  <div className="country-bar-wrapper">
                    <div 
                      className="country-bar"
                      style={{ width: `${(country.count / maxCountryCount) * 100}%` }}
                      title={`${country.count} chercheur${country.count > 1 ? 's' : ''}`}
                    ></div>
                  </div>
                  <span className="country-count">{country.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">Aucune donnée disponible</p>
          )}
        </div>
          </>
        )}
      </div>

      <div className="sources-summary">
        {isPubMed ? (
          <>
            <div className="summary-stat">
              <div className="summary-title">Journaux Uniques</div>
              <div className="summary-value">{journalStats.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-title">Articles Trouvés</div>
              <div className="summary-value">{results.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-title">Journal Dominant</div>
              <div className="summary-value-text">
                {journalStats.length > 0 
                  ? journalStats[0].name 
                  : 'N/A'}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="summary-stat">
              <div className="summary-title">Institutions Uniques</div>
              <div className="summary-value">{institutionStats.institutions.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-title">Pays Représentés</div>
              <div className="summary-value">{institutionStats.countries.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-title">Chercheurs Totaux</div>
              <div className="summary-value">{results.length}</div>
            </div>
            <div className="summary-stat">
              <div className="summary-title">Institution Dominante</div>
              <div className="summary-value-text">
                {institutionStats.institutions.length > 0 
                  ? institutionStats.institutions[0].name 
                  : 'N/A'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Sources;