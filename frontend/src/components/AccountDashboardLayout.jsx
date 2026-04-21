import { useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import UserAvatar from './UserAvatar'
import '../pages/Reservations.css'
import '../pages/DashboardProfile.css'

const planLabelMap = {
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'SuperPro',
}

/**
 * Cabecera tipo Reservas + sidebar «MI CUENTA» para perfil y suscripción.
 */
export default function AccountDashboardLayout({ user, onLogout, activeNav, children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const initials = useMemo(
    () =>
      `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
      || user?.email?.[0]?.toUpperCase()
      || '?',
    [user],
  )

  const isDashNav = location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')

  useEffect(() => {
    if (!user) navigate('/')
  }, [user, navigate])

  const handleLogout = async () => {
    try {
      await apiFetch('/api/logout/', { method: 'POST' })
    } catch { /* sigue */ }
    onLogout()
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="reservations-page">
      <header className="res-header">
        <div className="res-header-inner">
          <a href="/" className="res-logo">
            <span className="res-logo-icon">◆</span>
            <span className="res-logo-text">WorkHub</span>
          </a>
          <nav className="res-nav">
            <button
              type="button"
              className={`res-nav-link ${isDashNav ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              Inicio
            </button>
            <button
              type="button"
              className={`res-nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}
              onClick={() => navigate('/reservations')}
            >
              Mis reservas
            </button>
            <button
              type="button"
              className={`res-nav-link ${location.pathname === '/spaces' ? 'active' : ''}`}
              onClick={() => navigate('/spaces')}
            >
              Reservar
            </button>
          </nav>
          <div className="res-header-actions">
            <span className={`res-badge res-badge-${user?.role ?? 'standard'}`}>
              {planLabelMap[user?.role] ?? 'Standard'}
            </span>
            <UserAvatar userId={user.id} initials={initials} className="res-avatar" title={user.email} />
          </div>
        </div>
      </header>

      <div className="profile-shell">
        <aside className="profile-sidebar" aria-label="Menú de cuenta">
          <div className="profile-sidebar-user">
            <UserAvatar userId={user.id} initials={initials} className="profile-sidebar-avatar" />
            <p className="profile-sidebar-name">
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Usuario'}
            </p>
            <p className="profile-sidebar-email">{user.email}</p>
            <span className={`profile-badge-plan ${user.role ?? 'standard'}`}>
              {planLabelMap[user.role] ?? 'Standard'}
            </span>
          </div>
          <p className="profile-sidebar-label">MI CUENTA</p>
          <ul className="profile-side-nav">
            <li>
              <button
                type="button"
                className={`profile-side-link ${activeNav === 'profile' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/profile')}
              >
                <span className="profile-side-link-icon" aria-hidden>◧</span>
                Datos personales
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`profile-side-link ${activeNav === 'subscription' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard/subscription')}
              >
                <span className="profile-side-link-icon" aria-hidden>▣</span>
                Suscripción
              </button>
            </li>
            <li>
              <button type="button" className="profile-side-link danger" onClick={handleLogout}>
                <span className="sq" aria-hidden />
                Cerrar sesión
              </button>
            </li>
          </ul>
        </aside>

        {children}
      </div>
    </div>
  )
}
