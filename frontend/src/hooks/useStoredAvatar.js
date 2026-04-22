import { useSyncExternalStore } from 'react'
import {
  getStoredAvatarUrl,
  STORED_AVATAR_EVENT,
  storedAvatarKey,
} from '../utils/storedAvatar'

function subscribe(userId, onStoreChange) {
  if (userId == null) return () => {}

  const onCustom = () => onStoreChange()
  const onStorage = (e) => {
    if (e.key === storedAvatarKey(userId)) onStoreChange()
  }
  window.addEventListener(STORED_AVATAR_EVENT, onCustom)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(STORED_AVATAR_EVENT, onCustom)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * URL data: del avatar guardado para este usuario, o null.
 * Se actualiza al cambiar localStorage (otra pestaña) o al disparar STORED_AVATAR_EVENT (misma pestaña).
 */
export function useStoredAvatar(userId) {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(userId, onStoreChange),
    () => getStoredAvatarUrl(userId),
    () => null,
  )
}
