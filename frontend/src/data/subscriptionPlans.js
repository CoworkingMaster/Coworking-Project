/** Horas de sala incluidas en Premium (alineado con Reservas). */
export const PREMIUM_ROOM_HOURS = 10

/**
 * Planes mostrados en UI. `backendRole` coincide con User.role en Django.
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: 'standard',
    backendRole: 'standard',
    name: 'Standard',
    pricePlaceholder: '—',
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
    pricePlaceholder: '—',
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
    pricePlaceholder: '—',
    features: [
      { text: 'Puestos individuales (ilimitado)', included: true },
      { text: 'Salas ilimitado', included: true },
      { text: 'Acceso a analíticas', included: true },
    ],
  },
]
