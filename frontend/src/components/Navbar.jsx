import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import UserAvatar from './UserAvatar'
import './Navbar.css'

export default function Navbar({ onLoginClick, onRegisterClick, user }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      const sections = document.querySelectorAll('section[id]')
      let current = ''
      sections.forEach(section => {
        const top = section.offsetTop - 100
        if (window.scrollY >= top) {
          current = section.getAttribute('id')
        }
      })
      if (current) setActiveSection(current)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const offset = 80
      const position = el.offsetTop - offset
      window.scrollTo({ top: position, behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  const userInitials = useMemo(
    () =>
      user
        ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
          || user.email?.[0]?.toUpperCase()
          || '?'
        : '',
    [user],
  )

  const links = [
    { id: 'hero', label: 'Inicio' },
    { id: 'spaces', label: 'Espacios' },
    { id: 'services', label: 'Servicios' },
    { id: 'pricing', label: 'Precios' },
    { id: 'contact', label: 'Contacto' },
  ]

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <button className="nav-logo" onClick={() => scrollTo('hero')}>
            <span className="logo-icon">◆</span>
            <span>WorkHub</span>
          </button>

          <ul className="nav-links">
            {links.map(link => (
              <li key={link.id}>
                <button
                  className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
                  onClick={() => scrollTo(link.id)}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="nav-actions">
            {user ? (
              <div className="nav-actions-user">
                <UserAvatar
                  userId={user.id}
                  initials={userInitials}
                  className="nav-user-avatar"
                  title={user.email}
                />
                <Link to="/dashboard" className="btn-primary-sm">Mi cuenta</Link>
              </div>
            ) : (
              <>
                <button className="btn-text" onClick={onLoginClick}>Iniciar sesión</button>
                <button className="btn-primary-sm" onClick={onRegisterClick}>Registrarse</button>
              </>
            )}
          </div>

          <button
            className={`hamburger ${mobileOpen ? 'active' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${mobileOpen ? 'active' : ''}`}>
        <ul>
          {links.map(link => (
            <li key={link.id}>
              <button onClick={() => scrollTo(link.id)}>{link.label}</button>
            </li>
          ))}
          {user ? (
            <li className="nav-mobile-account">
              <UserAvatar
                userId={user.id}
                initials={userInitials}
                className="nav-user-avatar nav-user-avatar--mobile"
                title={user.email}
              />
              <Link
                to="/dashboard"
                className="btn-primary-sm"
                onClick={() => setMobileOpen(false)}
              >
                Mi cuenta
              </Link>
            </li>
          ) : (
            <li>
              <button className="btn-primary-sm" onClick={() => { setMobileOpen(false); onLoginClick() }}>
                Iniciar sesión
              </button>
            </li>
          )}
        </ul>
      </div>
    </>
  )
}
