import { useStoredAvatar } from '../hooks/useStoredAvatar'
import './UserAvatar.css'

/**
 * Muestra la foto guardada en localStorage para userId, o las iniciales.
 * className: p. ej. res-avatar, dash-avatar, nav-user-avatar, profile-sidebar-avatar
 */
export default function UserAvatar({ userId, initials, className = '', title }) {
  const url = useStoredAvatar(userId)

  return (
    <div className={`user-avatar ${className}`.trim()} title={title}>
      {url ? (
        <img src={url} alt="" className="user-avatar-img" />
      ) : (
        <span className="user-avatar-initials">{initials}</span>
      )}
    </div>
  )
}
