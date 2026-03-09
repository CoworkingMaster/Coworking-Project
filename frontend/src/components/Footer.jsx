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
        <div className="footer-bottom">
          <span className="footer-copyright">© 2026 WorkHub</span>
          <nav className="footer-links" aria-label="Enlaces de pie de página">
            <a href="#">Política de Privacidad</a>
            <a href="#">Términos de uso</a>
            <a href="#">Aviso Legal</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
