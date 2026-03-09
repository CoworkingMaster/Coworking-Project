/**
 * Utilidades para llamadas a la API del backend Django.
 * Gestiona automáticamente el token CSRF necesario para
 * peticiones POST/PUT/DELETE cuando el usuario está autenticado.
 */


export const API_BASE = 'http://localhost:8000'

export function getCsrfToken() {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
  return match ? match.split('=')[1] : ''
}

export async function apiFetch(path, options = {}) {

  const method = (options.method ?? 'GET').toUpperCase()
  const needsCsrf = ['POST','PUT','PATCH','DELETE'].includes(method)

  const headers = {
    'Content-Type': 'application/json',
    ...(needsCsrf ? { 'X-CSRFToken': getCsrfToken() } : {}),
    ...(options.headers ?? {})
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  })

  return res
}

export const createReservation = async (reservation) => {

  console.log("reservation enviada:", reservation)

  const res = await apiFetch('/api/reservations/', {
    method: 'POST',
    body: JSON.stringify(reservation)
  })

  if (!res.ok) {
    const error = await res.json()
    console.error("Error backend:", error)
    throw new Error("Error creating reservation")
  }

  return await res.json()
}