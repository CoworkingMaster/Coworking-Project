import './Toast.css'

export default function Toast({ visible, title, desc, onClose }) {
  return (
    <div className={`toast ${visible ? 'active' : ''}`}>
      <div className="toast-icon">✓</div>
      <div className="toast-content">
        <span className="toast-title">{title}</span>
        <span className="toast-desc">{desc}</span>
      </div>
      <button className="toast-close" onClick={onClose}>✕</button>
    </div>
  )
}
