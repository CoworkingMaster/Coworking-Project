/** Horas de sala incluidas en Premium (alineado con Reservas). */
export const PREMIUM_ROOM_HOURS = 10

const parsePrice = (raw, fallback) => {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export const PLAN_PRICES = {
  standard: parsePrice(import.meta.env.VITE_PLAN_PRICE_STANDARD, 49),
  premium: parsePrice(import.meta.env.VITE_PLAN_PRICE_PREMIUM, 99),
  enterprise: parsePrice(import.meta.env.VITE_PLAN_PRICE_ENTERPRISE, 199),
}

/**
 * Planes mostrados en UI. `backendRole` coincide con User.role en Django.
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: 'standard',
    backendRole: 'standard',
    name: 'Standard',
    pricePlaceholder: PLAN_PRICES.standard,
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'Sin acceso a salas', included: false },
      { text: 'Sin analíticas', included: false },
    ],
  },
  {
    id: 'premium',
    backendRole: 'premium',
    name: 'Premium',
    pricePlaceholder: PLAN_PRICES.premium,
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: `Salas hasta ${PREMIUM_ROOM_HOURS} h/mes`, included: true },
      { text: 'Sin analíticas', included: false },
    ],
  },
  {
    id: 'enterprise',
    backendRole: 'enterprise',
    name: 'SuperPro',
    pricePlaceholder: PLAN_PRICES.enterprise,
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'Salas ilimitado', included: true },
      { text: 'Acceso a analíticas', included: true },
    ],
  },
]
