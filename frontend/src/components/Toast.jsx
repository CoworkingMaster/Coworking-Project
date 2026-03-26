import './Toast.css'

export default function Toast({ visible, title, desc, type = 'success', onClose }) {
  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  }

  return (
    <div className={`toast toast--${type}${visible ? ' active' : ''}`}>
      <div className="toast-icon">{icons[type] ?? icons.success}</div>
      <div className="toast-content">
        <span className="toast-title">{title}</span>
        {desc && <span className="toast-desc">{desc}</span>}
      </div>
      <button className="toast-close" onClick={onClose}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
