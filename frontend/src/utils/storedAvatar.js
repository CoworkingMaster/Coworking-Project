/** Avatar en localStorage por usuario (misma clave en todo el front). */

export const STORED_AVATAR_EVENT = 'workhub-stored-avatar'

export function storedAvatarKey(userId) {
  return `workhub_avatar_${userId}`
}

export function getStoredAvatarUrl(userId) {
  if (typeof window === 'undefined' || userId == null) return null
  try {
    return localStorage.getItem(storedAvatarKey(userId))
  } catch {
    return null
  }
}

export function setStoredAvatarUrl(userId, dataUrl) {
  if (userId == null || typeof window === 'undefined') return
  try {
    localStorage.setItem(storedAvatarKey(userId), dataUrl)
    window.dispatchEvent(new CustomEvent(STORED_AVATAR_EVENT, { detail: { userId } }))
  } catch { /* quota / private mode */ }
}

export function clearStoredAvatar(userId) {
  if (userId == null || typeof window === 'undefined') return
  try {
    localStorage.removeItem(storedAvatarKey(userId))
    window.dispatchEvent(new CustomEvent(STORED_AVATAR_EVENT, { detail: { userId } }))
  } catch { /* */ }
}
