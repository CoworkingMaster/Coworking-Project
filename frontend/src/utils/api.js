/**
 * Utilidades para llamadas a la API del backend Django.
 * Gestiona automáticamente el token CSRF necesario para
 * peticiones POST/PUT/DELETE cuando el usuario está autenticado.
 */

export const API_BASE = 'http://localhost:8000'

/** Lee el token CSRF de la cookie que Django establece automáticamente. */
export function getCsrfToken() {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
  return match ? match.split('=')[1] : ''
}

/**
 * Wrapper de fetch que incluye credentials y el header CSRF automáticamente.
 * @param {string} path  - Ruta relativa, ej: '/api/logout/'
 * @param {RequestInit} options  - Opciones de fetch (method, body, etc.)
 */
export async function apiFetch(path, options = {}) {
  const method = (options.method ?? 'GET').toUpperCase()
  const needsCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  const headers = {
    'Content-Type': 'application/json',
    ...(needsCsrf ? { 'X-CSRFToken': getCsrfToken() } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  return res
}
