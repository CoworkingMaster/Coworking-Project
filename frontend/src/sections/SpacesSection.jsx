import './SpacesSection.css'

const spaces = [
  {
    title: 'Zona principal',
    desc: 'Espacio abierto · 20 personas',
    price: 'Desde 15€/hora',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    large: true,
    badge: 'Popular',
  },
  {
    title: 'Sala A',
    desc: '8-10 personas · Video conferencia',
    price: 'Desde 20€/hora',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    title: 'Sala B',
    desc: '5-6 personas · Pizarra',
    price: 'Desde 18€/hora',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    title: 'Puestos',
    desc: 'Escritorio ergonómico · Monitor',
    price: 'Desde 20€/día',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
  {
    title: 'Terraza',
    desc: 'Zona chill · Café libre',
    price: 'Incluido',
    gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  },
]


export default function SpacesSection() {
  return (
    <section className="spaces" id="spaces">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Nuestros espacios
            <br />
            <span className="text-muted">Diseñados para que no quieras marcharte</span>
          </h2>
        </div>
        <div className="spaces-grid">
          {spaces.map((space, i) => (
            <div className={`space-card ${space.large ? 'space-large' : ''}`} key={i}>
              <div className="space-image" style={{ background: space.gradient }}>
                {space.badge && <div className="space-badge">{space.badge}</div>}
                <div className="space-overlay">
                  <h3>{space.title}</h3>
                  {space.desc && <p>{space.desc}</p>}
                  {space.price && <span className="space-price">{space.price}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
