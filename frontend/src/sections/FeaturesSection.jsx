import './FeaturesSection.css'

const features = [
  { icon: '⚡', title: 'Reserva instantánea', desc: 'Confirma tu espacio en menos de 30 segundos. Sin esperas, sin llamadas.' },
  { icon: '📊', title: 'Panel inteligente', desc: 'Visualiza tu uso, gestiona reservas y controla tu suscripción desde un solo lugar.' },
  { icon: '🔒', title: 'Acceso seguro', desc: 'Autenticación robusta con múltiples niveles de permisos según tu plan.' },
  { icon: '📱', title: '100% Responsive', desc: 'Reserva desde cualquier dispositivo. La experiencia se adapta a ti.' },
  { icon: '🕐', title: 'Tiempo real', desc: 'Estado de ocupación actualizado al instante. Nunca te llevarás una sorpresa.' },
]

export default function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Características</span>
          <h2 className="section-title">
            Todo lo que necesitas.<br />
            <span className="text-muted">Nada que no necesites.</span>
          </h2>
          <p className="section-desc">
            Diseñado para profesionales que valoran su tiempo y su espacio de trabajo.
          </p>
        </div>
        <div className="features-grid">
          {/* Featured large card */}
          <div className="feature-card feature-large">
            <div className="feature-icon-wrapper">
              <div className="feature-icon">🎮</div>
            </div>
            <div>
              <h3>Reserva en 3D</h3>
              <p>Navega por un modelo tridimensional de nuestro coworking. Selecciona tu sala con un clic, ve su estado en tiempo real y reserva al instante.</p>
            </div>
            <div className="feature-tag">Exclusivo</div>
          </div>

          {features.map((f, i) => (
            <div className="feature-card" key={i} style={{ transitionDelay: `${(i + 1) * 0.08}s` }}>
              <div className="feature-icon-wrapper">
                <div className="feature-icon">{f.icon}</div>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
