import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import './ResetPassword.css'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // Si no hay token en la URL, redirigir al inicio
  useEffect(() => {
    if (!token) navigate('/')
  }, [token, navigate])

  const handleChange = (e) => {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { password, confirm } = form

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    try {
      setLoading(true)
      const res = await apiFetch('/api/password-reset/confirm/', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (res.ok) {
        setDone(true)
      } else {
        setError(data.error || 'Enlace inválido o caducado. Solicita uno nuevo.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rp-page">
      {/* Fondo decorativo */}
      <div className="rp-bg" aria-hidden="true">
        <div className="rp-blob rp-blob-1" />
        <div className="rp-blob rp-blob-2" />
      </div>

      <div className="rp-card">
        {/* Logo */}
        <Link to="/" className="rp-logo">
          <span className="rp-logo-icon">◆</span>
          <span className="rp-logo-text">WorkHub</span>
        </Link>

        {!done ? (
          <>
            <h1 className="rp-title">Nueva contraseña</h1>
            <p className="rp-subtitle">Elige una contraseña segura para tu cuenta</p>

            <form className="rp-form" onSubmit={handleSubmit} noValidate>
              <div className="rp-group">
                <label htmlFor="rp-password">Nueva contraseña</label>
                <input
                  id="rp-password"
                  type="password"
                  name="password"
                  placeholder="Mínimo 8 caracteres"
                  className="rp-input"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              <div className="rp-group">
                <label htmlFor="rp-confirm">Confirmar contraseña</label>
                <input
                  id="rp-confirm"
                  type="password"
                  name="confirm"
                  placeholder="Repite la contraseña"
                  className="rp-input"
                  value={form.confirm}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              {/* Indicador de fuerza */}
              {form.password && (
                <div className="rp-strength">
                  <div
                    className={`rp-strength-bar ${
                      form.password.length < 8 ? 'weak'
                      : form.password.length < 12 ? 'medium'
                      : 'strong'
                    }`}
                  />
                  <span className="rp-strength-label">
                    {form.password.length < 8 ? 'Débil'
                      : form.password.length < 12 ? 'Moderada'
                      : 'Segura'}
                  </span>
                </div>
              )}

              {error && (
                <div className="rp-error" role="alert">{error}</div>
              )}

              <button type="submit" className="rp-btn" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        ) : (
          <div className="rp-success">
            <div className="rp-success-icon">✅</div>
            <h1 className="rp-title">¡Contraseña actualizada!</h1>
            <p className="rp-subtitle">
              Tu contraseña se ha cambiado correctamente.<br />
              Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Link to="/" className="rp-btn rp-btn-link">
              Ir al inicio
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
