export const PLAN_LABELS = {
  standard: { label: 'Standard', color: '#0071e3', emoji: '🌱' },
  premium: { label: 'Premium', color: '#9b59b6', emoji: '⭐' },
  enterprise: { label: 'Enterprise', color: '#e67e22', emoji: '🚀' },
}

export const QUICK_ACTIONS = [
  { icon: '📅', title: 'Reservar espacio', desc: 'Encuentra y reserva tu sala o escritorio', link: '/spaces' },
  { icon: '🗓️', title: 'Mis reservas', desc: 'Consulta y gestiona tus reservas activas', link: '/reservations' },
  { icon: '👤', title: 'Mi perfil', desc: 'Actualiza tus datos personales y plan', link: '/dashboard/profile' },
  { icon: '📊', title: 'Estadísticas', desc: 'Revisa tu actividad en WorkHub', link: null },
]
