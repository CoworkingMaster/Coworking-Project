import { useState } from 'react'
import useIntersectionObserver from '../hooks/useIntersectionObserver'
import './PricingSection.css'

const plans = [
  {
    name: 'Standard',
    monthlyPrice: 49,
    features: [
      { text: 'Hot desk compartido', included: true },
      { text: '20 horas/mes incluidas', included: true },
      { text: 'WiFi de alta velocidad', included: true },
      { text: 'Café y snacks', included: true },
      { text: 'Sala de reuniones', included: false },
      { text: 'Taquilla personal', included: false },
    ],
  },
  {
    name: 'Premium',
    monthlyPrice: 99,
    featured: true,
    features: [
      { text: 'Escritorio dedicado', included: true },
      { text: 'Acceso ilimitado', included: true },
      { text: 'WiFi de alta velocidad', included: true },
      { text: 'Café y snacks premium', included: true },
      { text: '8h sala de reuniones/mes', included: true },
      { text: 'Taquilla personal', included: false },
    ],
  },
  {
    name: 'SuperPro',
    monthlyPrice: 199,
    features: [
      { text: 'Oficina privada', included: true },
      { text: 'Acceso 24/7', included: true },
      { text: 'WiFi empresarial', included: true },
      { text: 'Servicio de catering', included: true },
      { text: 'Sala de reuniones ilimitada', included: true },
      { text: 'Taquilla + almacén', included: true },
    ],
  },
]

export default function PricingSection({ onShowToast }) {
  const [isAnnual, setIsAnnual] = useState(false)
  const sectionRef = useIntersectionObserver()

  const getPrice = (monthly) => {
    if (isAnnual) return Math.round(monthly * 0.8)
    return monthly
  }

  return (
    <section id="pricing" className="section pricing-section" ref={sectionRef}>
      <div className="container">
        <div className="section-header fade-in">
          <h2>Planes de membresía</h2>
          <p className="section-subtitle">Escoge el que mejor se adapte a tu forma de trabajar</p>
        </div>

        {/* Toggle */}
        <div className="pricing-toggle fade-in">
          <span className={!isAnnual ? 'active' : ''}>Mensual</span>
          <button
            className={`toggle-switch ${isAnnual ? 'active' : ''}`}
            onClick={() => setIsAnnual(!isAnnual)}
            aria-label="Cambiar entre mensual y anual"
          >
            <span className="toggle-knob" />
          </button>
          <span className={isAnnual ? 'active' : ''}>
            Anual <span className="toggle-badge">-20%</span>
          </span>
        </div>

        {/* Cards */}
        <div className="pricing-grid">
          {plans.map((plan, i) => (
            <div
              className={`pricing-card fade-in ${plan.featured ? 'featured' : ''}`}
              style={{ transitionDelay: `${i * 100}ms` }}
              key={plan.name}
            >
              {plan.featured && <span className="pricing-badge">Más popular</span>}
              <h3 className="pricing-name">{plan.name}</h3>
              <div className="pricing-price">
                <span className="pricing-amount">{getPrice(plan.monthlyPrice)}€</span>
                <span className="pricing-period">/mes</span>
              </div>
              <ul className="pricing-features">
                {plan.features.map((f, j) => (
                  <li key={j} className={f.included ? 'included' : 'excluded'}>
                    <span className="feature-icon">{f.included ? '✓' : '✕'}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <button
                className={plan.featured ? 'btn-primary btn-full' : 'btn-secondary btn-full'}
                onClick={() => onShowToast(`Plan ${plan.name} seleccionado`)}
              >
                Empezar ahora
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
