export const PREMIUM_ROOM_HOURS = 10

/** Precios por plan y ciclo (alineados con PricingSection). */
export const PLAN_PRICES = {
  standard:   { monthly: 49,  annual: 39 },
  premium:    { monthly: 99,  annual: 79 },
  enterprise: { monthly: 199, annual: 159 },
}

export const SUBSCRIPTION_PLANS = [
  {
    id: 'standard',
    backendRole: 'standard',
    name: 'Standard',
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'WiFi de alta velocidad', included: true },
      { text: 'Café y snacks', included: true },
      { text: 'Salas de reuniones', included: false },
      { text: 'Analíticas de uso', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'premium',
    backendRole: 'premium',
    name: 'Premium',
    popular: true,
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'WiFi de alta velocidad', included: true },
      { text: 'Café y snacks premium', included: true },
      { text: `Salas hasta ${PREMIUM_ROOM_HOURS}h/mes`, included: true },
      { text: 'Analíticas de uso', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    id: 'enterprise',
    backendRole: 'enterprise',
    name: 'SuperPro',
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'WiFi empresarial', included: true },
      { text: 'Servicio de catering', included: true },
      { text: 'Salas ilimitadas', included: true },
      { text: 'Analíticas avanzadas', included: true },
      { text: 'Soporte dedicado 24/7', included: true },
    ],
  },
]
