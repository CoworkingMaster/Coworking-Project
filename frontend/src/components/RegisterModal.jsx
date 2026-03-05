import './Modal.css'
import { useState } from 'react'
import { apiFetch } from '../utils/api'

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegisterSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    plan: 'standard'
  })

  const resetAndClose = () => {
    setStep(1)
    setError('')
    setRegisteredUser(null)
    setForm({ firstName: '', lastName: '', email: '', password: '', plan: 'standard' })
    onClose()
  }

  const handleChange = (e) => {
    setError('')
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (step === 1) {
      if (!form.firstName || !form.lastName || !form.email || !form.password) {
        setError('Completa todos los campos.')
        return
      }
      if (form.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres.')
        return
      }
      setError('')
      setStep(2)
      return
    }

    const payload = {
      username: form.email,
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.plan
    }

    try {
      setLoading(true)
      const res = await apiFetch('/api/register/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setRegisteredUser(data.user)
        setStep(3)
      } else {
        setError(data.error || 'Error al crear la cuenta.')
      }
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoToDashboard = () => {
    resetAndClose()
    onRegisterSuccess?.(registeredUser)
  }

  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && resetAndClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={resetAndClose} aria-label="Cerrar">✕</button>

        <div className="modal-header">
          <span className="logo-icon modal-logo">◆</span>
          <h2>Crear cuenta</h2>
          <p>Únete a la comunidad WorkHub</p>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" name="firstName" placeholder="Juan" className="form-input"
                    value={form.firstName} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input type="text" name="lastName" placeholder="Pérez" className="form-input"
                    value={form.lastName} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" placeholder="tu@email.com" className="form-input"
                  value={form.email} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="Mínimo 8 caracteres" className="form-input"
                  value={form.password} onChange={handleChange} />
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button type="submit" className="btn-primary btn-full">Continuar</button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Selecciona tu plan</label>
                <select className="form-input" name="plan" value={form.plan} onChange={handleChange}>
                  <option value="standard">Standard — 49€/mes</option>
                  <option value="premium">Premium — 99€/mes</option>
                  <option value="enterprise">Enterprise — 199€/mes</option>
                </select>
              </div>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button type="submit" className="btn-primary btn-full" disabled={loading}>
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
              <button type="button" className="btn-secondary btn-full" onClick={() => setStep(1)}>
                Atrás
              </button>
            </>
          )}

          {step === 3 && (
            <div className="success-message">
              <h3>¡Cuenta creada! 🎉</h3>
              <p>Bienvenido a WorkHub, {registeredUser?.first_name || form.firstName}</p>
              <button type="button" className="btn-primary btn-full" onClick={handleGoToDashboard}>
                Ir al dashboard
              </button>
            </div>
          )}

          {step !== 3 && (
            <p className="form-footer">
              ¿Ya tienes cuenta?{' '}
              <button type="button" className="form-link" onClick={() => { resetAndClose(); onSwitchToLogin() }}>
                Iniciar sesión
              </button>
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

