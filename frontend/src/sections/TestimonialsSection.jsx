import useIntersectionObserver from '../hooks/useIntersectionObserver'
import './TestimonialsSection.css'

const testimonials = [
  {
    name: 'Ana López',
    role: 'Diseñadora UX',
    initials: 'AL',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    stars: 5,
    text: 'WorkHub ha transformado mi forma de trabajar. El ambiente es increíble y la comunidad de profesionales es inspiradora. Las salas de reuniones con equipamiento premium son perfectas para presentaciones con clientes.',
  },
  {
    name: 'Carlos Martín',
    role: 'Developer Full Stack',
    initials: 'CM',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    stars: 5,
    text: 'La mejor inversión para mi productividad. Internet ultrarrápido, café excelente y un espacio que te motiva a dar lo mejor. El sistema de reservas 3D es una pasada, nunca había visto algo así.',
  },
  {
    name: 'Sara Rodríguez',
    role: 'Marketing Digital',
    initials: 'SR',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    stars: 5,
    text: 'Después de probar varios coworkings, WorkHub es sin duda el mejor. La flexibilidad de planes, la ubicación céntrica y los eventos de networking hacen que merezca cada céntimo.',
  },
]

export default function TestimonialsSection() {
  const sectionRef = useIntersectionObserver()

  return (
    <section id="testimonials" className="section testimonials-section" ref={sectionRef}>
      <div className="container">
        <div className="section-header fade-in">
          <span className="section-label">Testimonios</span>
          <h2>Lo que dicen nuestros miembros</h2>
          <p className="section-subtitle">
            Más de 500 profesionales confían en WorkHub cada día
          </p>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((t, i) => (
            <div
              className="testimonial-card fade-in"
              style={{ transitionDelay: `${i * 100}ms` }}
              key={t.name}
            >
              <div className="testimonial-stars">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <span key={j} className="star">★</span>
                ))}
              </div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className="author-avatar" style={{ background: t.gradient }}>
                  {t.initials}
                </div>
                <div>
                  <span className="author-name">{t.name}</span>
                  <span className="author-role">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
