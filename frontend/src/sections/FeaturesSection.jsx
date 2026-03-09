import './FeaturesSection.css'

const features = [
  {
    icon: '⚡',
    title: 'Reserva en segundos',
    desc: 'Elige fecha, selecciona espacio y confirma. Sin llamadas ni formularios lentos.'
  },
  {
    icon: '🏢',
    title: 'Vista 3D interactiva',
    desc: 'Elige tu sala favorita directamente desde un plano 3D del espacio.'
  },
  {
    icon: '👥',
    title: 'Planes flexibles',
    desc: 'Standard, Premium o SuperPro. Solo pagas lo que realmente usas.'
  }
]

export default function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="container">

        <div className="section-header">
          <span className="section-tag">¿Por qué WorkHub?</span>

          <h2 className="section-title">
            Todo lo que necesitas para trabajar mejor
          </h2>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}