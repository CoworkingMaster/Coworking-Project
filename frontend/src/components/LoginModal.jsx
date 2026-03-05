import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { apiFetch } from '../utils/api'
import './Modal.css'

export default function LoginModal({ isOpen, onClose, onSwitchToRegister, onLoginSuccess, onForgotPassword }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleClose = () => {
    setForm({ email: '', password: '' })
    setError('')
    onClose()
  }

  // ── Login con email/contraseña ──
  const handleSubmit = async (e) => {
    e.preventDefault()
    const { email, password } = form

    if (!email || !password) {
      setError('Completa todos los campos.')
      return
    }

    try {
      setLoading(true)
      const res = await apiFetch('/api/login/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()

      if (res.ok) {
        handleClose()
        onLoginSuccess(data.user)
      } else {
        setError(data.error || 'Error al iniciar sesión.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  // ── Login con Google (flujo: obtener access_token → intercambiar por id_token) ──
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true)
        // Enviamos el access_token al backend para verificar con Google UserInfo
        const res = await apiFetch('/api/auth/google/', {
          method: 'POST',
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        })
        const data = await res.json()
        if (res.ok) {
          handleClose()
          onLoginSuccess(data.user)
        } else {
          setError(data.error || 'Error al iniciar sesión con Google.')
        }
      } catch {
        setError('No se pudo conectar con el servidor.')
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Error al iniciar sesión con Google.'),
  })

  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={handleClose} aria-label="Cerrar">✕</button>

        <div className="modal-header">
          <span className="logo-icon modal-logo">◆</span>
          <h2>Bienvenido de nuevo</h2>
          <p>Inicia sesión para reservar tu espacio</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              name="email"
              placeholder="tu@email.com"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              name="password"
              placeholder="••••••••"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-options">
            <button
              type="button"
              className="form-link"
              onClick={() => { handleClose(); onForgotPassword?.() }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>

          {/* Divisor */}
          <div className="modal-divider">
            <span>o continúa con</span>
          </div>

          {/* Botón Google */}
          <button
            type="button"
            className="btn-google btn-full"
            onClick={() => googleLogin()}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continuar con Google
          </button>

          <p className="form-footer">
            ¿No tienes cuenta?{' '}
            <button type="button" className="form-link" onClick={() => { handleClose(); onSwitchToRegister() }}>
              Crear una cuenta
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

