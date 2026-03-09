import './Footer.css'

export default function Footer() {
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
    }
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <button className="nav-logo" onClick={() => scrollTo('hero')}>
              <span className="logo-icon">◆</span>
              <span>WorkHub <span className="logo-3d">3D</span></span>
            </button>
            <p className="footer-desc">
              El futuro del coworking. Reserva, trabaja e inspírate en un espacio diseñado para ti.
            </p>
            <div className="footer-social">
              <a href="#" className="social-link">𝕏</a>
              <a href="#" className="social-link">in</a>
              <a href="#" className="social-link">ig</a>
              <a href="#" className="social-link">fb</a>
            </div>
          </div>
          <div className="footer-links">
            <h4>Producto</h4>
            <button onClick={() => scrollTo('features')}>Características</button>
            <button onClick={() => scrollTo('spaces')}>Espacios</button>
            <button onClick={() => scrollTo('room3d')}>Vista 3D</button>
            <button onClick={() => scrollTo('pricing')}>Planes</button>
          </div>
          <div className="footer-links">
            <h4>Empresa</h4>
            <a href="#">Sobre nosotros</a>
            <a href="#">Blog</a>
            <a href="#">Carreras</a>
            <a href="#">Prensa</a>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
            <a href="#">Cookies</a>
            <a href="#">Licencias</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 WorkHub 3D. Todos los derechos reservados.</span>
          <span>Hecho con ♥ por el equipo de desarrollo.</span>
        </div>
      </div>
    </footer>
  )
}
