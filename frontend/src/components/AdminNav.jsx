import { useNavigate } from 'react-router-dom'
import '../pages/AdminAnalytics.css'

export default function AdminNav({ user, onLogout, active }) {
  const navigate = useNavigate()
  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase()

  return (
    <header className="analytics-header">
      <div className="analytics-header-inner">
        <a href="/" className="analytics-logo">
          <span className="analytics-logo-icon">◆</span>
          <span className="analytics-logo-text">WorkHub</span>
        </a>
        <nav className="analytics-nav">
          <button
            className={`analytics-nav-link ${active === 'analytics' ? 'active' : ''}`}
            onClick={() => navigate('/admin-analytics')}
          >Analiticas</button>
          <button
            className={`analytics-nav-link ${active === 'reservations' ? 'active' : ''}`}
            onClick={() => navigate('/admin-reservations')}
          >Reservas</button>
          <button
            className={`analytics-nav-link ${active === 'users' ? 'active' : ''}`}
            onClick={() => navigate('/admin-users')}
          >Usuarios</button>
        </nav>
        <div className="analytics-header-actions">
          <div className="analytics-badge">Admin</div>
          <div className="analytics-avatar">{initials}</div>
          <button className="analytics-logout-btn" onClick={onLogout}>Cerrar sesion</button>
        </div>
      </div>
    </header>
  )
}
