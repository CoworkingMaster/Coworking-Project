import { useState } from 'react'
import useIntersectionObserver from '../hooks/useIntersectionObserver'
import './ContactSection.css'

export default function ContactSection({ onShowToast }) {
  const sectionRef = useIntersectionObserver()

  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onShowToast('¡Mensaje enviado correctamente! Te responderemos en breve.')
    setForm({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <section id="contact" className="section contact-section" ref={sectionRef}>
      <div className="container">
        <div className="section-header">
          <span className="section-label">Contacto</span>
          <h2>¿Tienes alguna pregunta?</h2>
          <p className="section-subtitle">
            Estamos aquí para ayudarte. Contáctanos y te responderemos lo antes posible
          </p>
        </div>

        <div className="contact grid fade-in">
          {/* Info */}
          <div className="contact-info">
            <div className="contact-info-card">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <span className="contact-item-label">Dirección</span>
                  <span className="contact-item-value">Calle de la Innovación 42, 28001 Madrid</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <div>
                  <span className="contact-item-label">Email</span>
                  <span className="contact-item-value">hola@workhub3d.com</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <span className="contact-item-label">Teléfono</span>
                  <span className="contact-item-value">+34 912 345 678</span>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">🕐</span>
                <div>
                  <span className="contact-item-label">Horario</span>
                  <span className="contact-item-value">Lun - Vie: 8:00 - 20:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-name">Nombre</label>
                <input
                  type="text"
                  id="contact-name"
                  name="name"
                  className="form-input"
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">Email</label>
                <input
                  type="email"
                  id="contact-email"
                  name="email"
                  className="form-input"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="contact-subject">Asunto</label>
              <select
                id="contact-subject"
                name="subject"
                className="form-input"
                value={form.subject}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un asunto</option>
                <option value="info">Información general</option>
                <option value="pricing">Planes y precios</option>
                <option value="visit">Agendar visita</option>
                <option value="support">Soporte técnico</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="contact-message">Mensaje</label>
              <textarea
                id="contact-message"
                name="message"
                className="form-input form-textarea"
                placeholder="Cuéntanos cómo podemos ayudarte..."
                rows={5}
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn-primary btn-full">
              Enviar mensaje
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
