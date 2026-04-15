export default function Welcome() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-main)',
      fontFamily: 'var(--font-text)',
      color: 'var(--main-text)'
    }}>
      <div style={{
        textAlign: 'center',
        backgroundColor: 'var(--bg-cartes)',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '500px'
      }}>
        <h1 style={{ color: 'var(--main-text)', marginBottom: '20px', fontFamily: 'var(--font-title)' }}>CERIST Platform</h1>
        <p style={{ color: 'var(--sec-text)', marginBottom: '30px', fontSize: '16px' }}>
          Plateforme de Bibliométrie et Recherche
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <a href="/login" style={{
            display: 'inline-block',
            backgroundColor: 'var(--accent-blue)',
            color: 'white',
            padding: '12px 30px',
            textDecoration: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}>
            Se connecter
          </a>
          <a href="/register" style={{
            display: 'inline-block',
            backgroundColor: 'var(--main-green)',
            color: 'white',
            padding: '12px 30px',
            textDecoration: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            S'inscrire
          </a>
        </div>

        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: 'var(--bg-main)',
          borderRadius: '4px',
          textAlign: 'left',
          fontSize: '14px',
          color: 'var(--sec-text)',
          border: '1px solid var(--bordres)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--main-text)' }}>Test Credentials:</h3>
          <p style={{ margin: '5px 0' }}><strong>Tutelle: </strong> admin.tutelle@cerist.dz / password123</p>
          <p style={{ margin: '5px 0' }}><strong>Directeur:</strong> ahmed.directeur@cerist.dz / password123</p>
          <p style={{ margin: '5px 0' }}><strong>Chercheur: </strong> ali.chercheur@cerist.dz / password123</p>
        </div>
      </div>
    </div>
  )
}
