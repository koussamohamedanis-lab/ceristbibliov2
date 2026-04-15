import { Navigate } from 'react-router-dom'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('access_token')
  const userRole = localStorage.getItem('userRole')

  // Si pas de token, redirection au login
  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Si allowedRoles est défini et l'utilisateur n'est pas autorisé
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-main)',
        fontFamily: 'var(--font-text)',
        color: 'var(--main-text)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Accès Refusé</h1>
          <p>Vous n'avez pas les permissions pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
