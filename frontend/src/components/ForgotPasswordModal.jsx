import { useState } from 'react'
import { apiFetch } from '../utils/api'
import './Modal.css'

export default function ForgotPasswordModal({ isOpen, onClose, onSwitchToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleClose = () => {
    setEmail('')
    setError('')
    setSent(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Introduce tu email.')
      return
    }

    try {
      setLoading(true)
      setError('')
      const res = await apiFetch('/api/password-reset/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json()

      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'Error al procesar la solicitud.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={handleClose} aria-label="Cerrar">✕</button>

        <div className="modal-header">
          <span className="logo-icon modal-logo">◆</span>
          <h2>Recuperar contraseña</h2>
          <p>Te enviaremos un enlace a tu email</p>
        </div>

        {!sent ? (
          <form className="modal-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                placeholder="tu@email.com"
                className="form-input"
                value={email}
                onChange={(e) => { setError(''); setEmail(e.target.value) }}
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="form-error" role="alert">{error}</div>
            )}

            <button type="submit" className="btn-primary btn-full" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
            </button>

            <p className="form-footer">
              ¿Recuerdas tu contraseña?{' '}
              <button type="button" className="form-link" onClick={() => { handleClose(); onSwitchToLogin?.() }}>
                Inicia sesión
              </button>
            </p>
          </form>
        ) : (
          <div className="modal-form">
            <div className="form-success">
              <p>✅ Si el email <strong>{email}</strong> está registrado, recibirás un enlace en tu bandeja de entrada.</p>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>Revisa también la carpeta de spam.</p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-full"
              style={{ marginTop: '8px' }}
              onClick={() => { handleClose(); onSwitchToLogin?.() }}
            >
              Volver al login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
