import './Modal.css'
import { useState } from 'react'

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  plan: 'standard'
})
const handleChange = (e) => {
  setForm({
    ...form,
    [e.target.name]: e.target.value
  })
}
const handleSubmit = async (e) => {
  e.preventDefault()

  if (step === 1) {

  if (!form.firstName || !form.lastName || !form.email || !form.password) {
  alert("Completa todos los campos")
  return
}

if (form.password.length < 8) {
  alert("La contraseña debe tener al menos 8 caracteres")
  return
}

  setStep(2)
  return
}

  const payload = {
    username: form.email,
    email: form.email,
    password: form.password,
    role: form.plan
  }

  try {
    setLoading(true)
    const res = await fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const data = await res.json()
    if (res.ok) {
      setStep(3)
    } else {
      alert(data.error || "Error creando usuario")
    }
    setLoading(false)
  } catch (err) {
    console.error(err)
    alert("No se pudo conectar con el servidor")
    setLoading(false)
  }
}

  return (
    <div
      className={`modal-overlay ${isOpen ? 'active' : ''}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <button className="modal-close" onClick={() => {
          setStep(1)
          setForm({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            plan: 'standard'
          })
          onClose()
          }}>✕</button>

        <div className="modal-header">
          <span className="logo-icon modal-logo">◆</span>
          <h2>Crear cuenta</h2>
          <p>Únete a la comunidad WorkHub 3D</p>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          {step === 1 && (
<>
  <div className="form-row">
    <div className="form-group">
      <label>Nombre</label>
      <input
        type="text"
        name="firstName"
        placeholder="Juan"
        className="form-input"
        value={form.firstName}
        onChange={handleChange}
      />
    </div>

    <div className="form-group">
      <label>Apellidos</label>
      <input
        type="text"
        name="lastName"
        placeholder="Pérez"
        className="form-input"
        value={form.lastName}
        onChange={handleChange}
      />
    </div>
  </div>

  <div className="form-group">
    <label>Email</label>
    <input
      type="email"
      name="email"
      placeholder="tu@email.com"
      className="form-input"
      value={form.email}
      onChange={handleChange}
    />
  </div>

  <div className="form-group">
    <label>Contraseña</label>
    <input
      type="password"
      name="password"
      placeholder="Mínimo 8 caracteres"
      className="form-input"
      value={form.password}
      onChange={handleChange}
    />
  </div>

  <button type="submit" className="btn-primary btn-full" disabled={loading}>
    Continuar
  </button>
</>
)}
{step === 2 && (
<>
  <div className="form-group">
    <label>Selecciona tu plan</label>
    <select
      className="form-input"
      name="plan"
      value={form.plan}
      onChange={handleChange}
    >
      <option value="standard">Standard — 49€/mes</option>
      <option value="premium">Premium — 99€/mes</option>
      <option value="superpro">SuperPro — 199€/mes</option>
    </select>
  </div>

  <button type="submit" className="btn-primary btn-full" disabled={loading}>
    {loading ? "Creando cuenta..." : "Crear cuenta"}
    </button>
</>
)}
{step === 3 && (
<div className="success-message">
  <h3>¡Cuenta creada!</h3>
  <p>Bienvenido a WorkHub</p>

  <button type="button" className="btn-primary btn-full" onClick={() => {
    setStep(1)
    onClose()}}>Ir al dashboard</button>
</div>
)}
          <p className="form-footer">
            ¿Ya tienes cuenta?{' '}
            <button type="button" className="form-link" onClick={onSwitchToLogin}>
              Iniciar sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
