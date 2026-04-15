import { FiLink } from 'react-icons/fi'

const ProfileBadges = ({ profiles = {} }) => {
  const badgeList = [
    { key: 'open_alex_id', label: 'OpenAlex', url: (id) => `https://openalex.org/${id}` },
    { key: 'orcid', label: 'ORCID', url: (id) => `https://orcid.org/${id}` },
    { key: 'pubmed_id', label: 'PubMed', url: (id) => `https://pubmed.ncbi.nlm.nih.gov/?term=${id}` },
    { key: 'scopus_id', label: 'Scopus', url: (id) => `https://www.scopus.com/authid/detail.uri?authorId=${id}` },
  ]

  return (
    <div className="profile-badges-container">
      <h3 className="badges-title">Profils Externes</h3>
      <div className="badges-grid">
        {badgeList.map((badge) => {
          const value = profiles[badge.key]
          return (
            <div key={badge.key} className="profile-badge">
              <FiLink size={20} />
              <span>{badge.label}</span>
              {value && (
                <a 
                  href={badge.url(value)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="badge-link"
                >
                  Visiter
                </a>
              )}
              {!value && <span className="badge-empty">-</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProfileBadges
