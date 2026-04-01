import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import { PLAN_LABELS, QUICK_ACTIONS } from '../data/dashboardLabels'
import './Dashboard.css'

const isAdminUser = (u) => Boolean(u?.is_staff || u?.is_superuser || u?.role === 'enterprise')

export default function Dashboard({ user, onLogout, authLoading = false }) {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const plan = PLAN_LABELS[user?.role] ?? PLAN_LABELS.standard
  const isAdmin = isAdminUser(user)

  // Si no hay usuario redirige al inicio
  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [authLoading, user, navigate])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await apiFetch('/api/logout/', { method: 'POST' })
    } catch { /* continúa aunque falle la petición */ }
    finally {
      onLogout()
      navigate('/')
    }
  }

  if (authLoading || !user) return null

  const actions = QUICK_ACTIONS.map((action) => {
    if (action.adminOnly && !isAdmin) {
      return {
        ...action,
        link: null,
        desc: 'Disponible solo para administradores',
      }
    }
    return action
  })

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email?.[0]?.toUpperCase()

  return (
    <div className="dashboard-page">
      {/* Navbar simplificado */}
      <header className="dash-header">
        <div className="dash-header-inner">
          <a href="/" className="dash-logo">
            <span className="dash-logo-icon">◆</span>
            <span className="dash-logo-text">WorkHub</span>
          </a>
          <button
            className="dash-logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      <main className="dash-main">
        {/* Hero bienvenida */}
        <section className="dash-hero">
          <div className="dash-avatar">{initials}</div>
          <div className="dash-hero-text">
            <h1>
              Hola, {user.first_name || 'Usuario'} 👋
            </h1>
            <p>Bienvenido a tu espacio de trabajo inteligente</p>
            <span
              className="dash-plan-badge"
              style={{ '--plan-color': plan.color }}
            >
              {plan.emoji} Plan {plan.label}
            </span>
          </div>
        </section>

        {/* Tarjeta de info del usuario */}
        <section className="dash-section">
          <h2 className="dash-section-title">Tu cuenta</h2>
          <div className="dash-card dash-info-grid">
            <div className="dash-info-item">
              <span className="dash-info-label">Nombre completo</span>
              <span className="dash-info-value">
                {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
              </span>
            </div>
            <div className="dash-info-item">
              <span className="dash-info-label">Email</span>
              <span className="dash-info-value">{user.email}</span>
            </div>
            <div className="dash-info-item">
              <span className="dash-info-label">Teléfono</span>
              <span className="dash-info-value">{user.phone || '—'}</span>
            </div>
            <div className="dash-info-item">
              <span className="dash-info-label">Empresa</span>
              <span className="dash-info-value">{user.company || '—'}</span>
            </div>
          </div>
        </section>

        {/* Acciones rápidas */}
        <section className="dash-section">
          <h2 className="dash-section-title">Acciones rápidas</h2>
          <div className="dash-actions-grid">
            {actions.map((action) => (
              <button
                key={action.id}
                className={`dash-card dash-action-card${action.link ? '' : ' dash-action-disabled'}`}
                onClick={() => action.link && navigate(action.link)}
                title={action.link ? undefined : 'Próximamente disponible'}
              >
                <span className="dash-action-icon">{action.icon}</span>
                <div>
                  <p className="dash-action-title">{action.title}</p>
                  <p className="dash-action-desc">{action.link ? action.desc : 'Próximamente'}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Estado del plan */}
        <section className="dash-section">
          <h2 className="dash-section-title">Tu plan</h2>
          <div className="dash-card dash-plan-card">
            <div className="dash-plan-left">
              <span className="dash-plan-emoji">{plan.emoji}</span>
              <div>
                <p className="dash-plan-name">Plan {plan.label}</p>
                <p className="dash-plan-sub">
                  {user.role === 'standard' && 'Acceso básico a espacios compartidos'}
                  {user.role === 'premium' && 'Salas privadas + prioridad de reserva'}
                  {user.role === 'enterprise' && 'Acceso ilimitado + soporte dedicado'}
                </p>
              </div>
            </div>
            <button className="dash-upgrade-btn">
              {user.role === 'enterprise' ? 'Ver detalles' : 'Mejorar plan →'}
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
