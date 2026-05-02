export const PLAN_LABELS = {
  standard: { label: 'Standard', color: '#0071e3', emoji: '🌱' },
  premium: { label: 'Premium', color: '#9b59b6', emoji: '⭐' },
  enterprise: { label: 'Enterprise', color: '#e67e22', emoji: '🚀' },
}

export const QUICK_ACTIONS = [
  {
    id: 'book-space',
    icon: '📅',
    title: 'Reservar espacio',
    desc: 'Encuentra y reserva tu sala o escritorio',
    link: '/spaces',
  },
  {
    id: 'my-bookings',
    icon: '🗓️',
    title: 'Mis reservas',
    desc: 'Consulta y gestiona tus reservas activas',
    link: '/reservations',
  },
  {
    id: 'profile',
    icon: '👤',
    title: 'Mi perfil',
    desc: 'Actualiza tus datos personales y plan',
    link: '/dashboard/profile',
  },
  {
    id: 'admin-analytics',
    icon: '📊',
    title: 'Estadísticas',
    desc: 'Panel avanzado con métricas de usuarios y reservas',
    link: '/admin-analytics',
    adminOnly: true,
  },
]
