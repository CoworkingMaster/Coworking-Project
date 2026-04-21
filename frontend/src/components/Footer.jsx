import './Footer.css'

export default function Footer() {
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
