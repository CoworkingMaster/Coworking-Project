import { Suspense } from 'react'
import HeroPreview3D from '../components/HeroPreview3D'
import './HeroSection.css'

export default function HeroSection() {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
    }
  }

  return (
    <section className="hero" id="hero">
      <div className="hero-bg-gradient" />
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-dot" />
          Espacio de trabajo compartido
        </div>
        <h1 className="hero-title">
          Tu espacio.<br />
          <span className="hero-gradient-text">Tu ritmo.</span>
          <br />
          Tu comunidad.<br />
        </h1>
        <p className="hero-subtitle">
          Reserva tu puesto o sala en minutos. Coworking
moderno en el centro, con todo lo que necesitas para
trabajar en serio.
        </p>
        <div className="hero-ctas">
          <button className="btn-primary" onClick={() => scrollTo('room3d')}>
            Ver espacios disponibles
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <button className="btn-secondary" onClick={() => scrollTo('features')}>
            Conocer más
          </button>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">150+</span>
            <span className="stat-label">Puestos disponibles</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-number">12</span>
            <span className="stat-label">Salas de reunión</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-number">98%</span>
            <span className="stat-label">Horario de apertura</span>
          </div>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-3d-preview">
          <Suspense fallback={<div className="hero-3d-loading">Cargando 3D...</div>}>
            <HeroPreview3D />
          </Suspense>
        </div>
        <div className="hero-float-card card-1">
          <div className="float-card-icon green">✓</div>
          <div>
            <span className="float-card-title">Sala Innovación</span>
            <span className="float-card-sub">Disponible ahora</span>
          </div>
        </div>
        <div className="hero-float-card card-2">
          <div className="float-card-icon blue">◈</div>
          <div>
            <span className="float-card-title">8 personas</span>
            <span className="float-card-sub">Capacidad máxima</span>
          </div>
        </div>
      </div>
    </section>
  )
}
