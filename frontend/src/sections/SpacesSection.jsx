import './SpacesSection.css'

const spaces = [
  {
    title: 'Salas de Reunión',
    desc: '4 - 15 personas · Proyector · Pizarra',
    price: 'Desde 15€/hora',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    large: true,
    badge: 'Popular',
  },
  {
    title: 'Puestos Individuales',
    desc: 'Escritorio ergonómico · Monitor',
    price: 'Desde 20€/día',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    title: 'Zona Lounge',
    desc: 'Relax · Café ilimitado · Networking',
    price: 'Incluido',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    title: 'Sala Eventos',
    desc: '30 personas · Audio · Streaming',
    price: 'Desde 50€/hora',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    title: 'Phone Booths',
    desc: 'Privacidad total · Aislamiento acústico',
    price: 'Desde 5€/hora',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
]

export default function SpacesSection() {
  return (
    <section className="spaces" id="spaces">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Espacios</span>
          <h2 className="section-title">
            Espacios diseñados<br />
            <span className="text-muted">para inspirarte.</span>
          </h2>
        </div>
        <div className="spaces-grid">
          {spaces.map((space, i) => (
            <div className={`space-card ${space.large ? 'space-large' : ''}`} key={i}>
              <div className="space-image" style={{ background: space.gradient }}>
                {space.badge && <div className="space-badge">{space.badge}</div>}
                <div className="space-overlay">
                  <h3>{space.title}</h3>
                  <p>{space.desc}</p>
                  <span className="space-price">{space.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
