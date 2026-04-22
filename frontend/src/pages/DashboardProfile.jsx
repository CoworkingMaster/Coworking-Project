import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import { clearStoredAvatar, setStoredAvatarUrl } from '../utils/storedAvatar'
import UserAvatar from '../components/UserAvatar'
import AccountDashboardLayout from '../components/AccountDashboardLayout'
import { rooms, deskPositions } from '../data/rooms'
import './DashboardProfile.css'

const HOUR_BUDGET = 10
const DAYS_IN_MONTH = 30
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

const planLabelMap = {
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'Enterprise',
}

const resolveSpace = (reservation) => {
  const allSpaces = [...rooms, ...deskPositions]
  const found = allSpaces.find(s => String(s.id) === String(reservation.espacio))
  if (found) return found
  return {
    id: reservation.espacio,
    name: `Espacio #${reservation.espacio}`,
    type: 'Puesto',
    capacity: '1 persona',
    amenities: [],
  }
}

const getReservationType = (space) => {
  if (!space) return 'puesto'
  if (space.type?.toLowerCase().includes('sala')) return 'sala'
  if (space.type?.toLowerCase().includes('puesto')) return 'puesto'
  return 'puesto'
}

const getDurationHours = (start, end) => {
  const from = new Date(start)
  const to = new Date(end)
  return Math.max(0, (to - from) / 1000 / 60 / 60)
}

function formatMemberSince(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const s = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(d)
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return '—'
  }
}

function formatRenewal(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
  } catch {
    return '—'
  }
}

export default function DashboardProfile({ user, onLogout, onUserUpdate, showToast }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    job_title: '',
  })
  const [baseline, setBaseline] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [reservations, setReservations] = useState([])

  const initials = useMemo(
    () =>
      `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase()
      || user?.email?.[0]?.toUpperCase()
      || '?',
    [user],
  )

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    const next = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      phone: user.phone || '',
      company: user.company || '',
      job_title: user.job_title || '',
    }
    setForm(next)
    setBaseline(next)
  }, [user, navigate])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    apiFetch('/api/reservations/')
      .then(async (res) => {
        if (!res.ok || cancelled) return
        const data = await res.json().catch(() => null)
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
        const mine = list.filter(r => String(r.usuario) === String(user.id))
        if (!cancelled) setReservations(mine)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user?.id])

  const usageStats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const monthRes = reservations.filter((r) => {
      const start = new Date(r.fecha_inicio)
      return start >= monthStart && start < monthEnd && r.estado !== 'cancelada'
    })
    const days = new Set()
    let roomHours = 0
    monthRes.forEach((r) => {
      const space = resolveSpace(r)
      const type = getReservationType(space)
      if (type === 'puesto') {
        const start = new Date(r.fecha_inicio)
        days.add(`${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`)
      }
      if (type === 'sala') {
        roomHours += getDurationHours(r.fecha_inicio, r.fecha_fin)
      }
    })
    const deskCount = days.size
    const roomRounded = Math.round(roomHours)
    return {
      deskCount,
      roomRounded,
      roomRemaining: Math.max(0, HOUR_BUDGET - roomRounded),
      deskBar: Math.min(100, (deskCount / DAYS_IN_MONTH) * 100),
      roomBar: Math.min(100, (roomHours / HOUR_BUDGET) * 100),
    }
  }, [reservations])

  const dirty = useMemo(() => {
    if (!baseline) return false
    return Object.keys(form).some((k) => form[k] !== baseline[k])
  }, [form, baseline])

  const handleCancel = () => {
    if (baseline) setForm({ ...baseline })
    setError(null)
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await apiFetch('/api/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          company: form.company,
          job_title: form.job_title,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se pudieron guardar los cambios.')
        return
      }
      onUserUpdate?.(data)
      setBaseline({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        job_title: data.job_title || '',
      })
      setForm((f) => ({
        ...f,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        company: data.company || '',
        job_title: data.job_title || '',
      }))
      showToast?.('Cambios guardados', 'Tu perfil se ha actualizado correctamente.')
    } catch {
      setError('Error de red. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const onPickPhoto = () => fileInputRef.current?.click()

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user?.id) return
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      showToast?.('Formato no válido', 'Usa JPG o PNG.', 'error')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast?.('Archivo demasiado grande', 'Máximo 2 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result
      if (typeof url === 'string') {
        setStoredAvatarUrl(user.id, url)
      }
    }
    reader.readAsDataURL(file)
  }

  const onRemovePhoto = () => {
    if (!user?.id) return
    clearStoredAvatar(user.id)
  }

  const userIdLabel = user ? `#USR-${String(user.id).padStart(4, '0')}` : ''

  if (!user) return null

  return (
    <AccountDashboardLayout user={user} onLogout={onLogout} activeNav="profile">
      <div className="profile-main-col">
          <div className="profile-top-bar">
            <div>
              <h1>Datos personales</h1>
              <p>Actualiza tu información de perfil</p>
            </div>
            <div className="profile-top-actions">
              <button type="button" className="profile-btn-ghost" onClick={handleCancel} disabled={!dirty || saving}>
                Cancelar
              </button>
              <button
                type="button"
                className="profile-btn-primary"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {error && <p className="profile-form-error" role="alert">{error}</p>}

          <div className="profile-grid">
            <div>
              <div className="profile-card">
                <h2 className="profile-card-title">Foto de perfil</h2>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="profile-hidden-file"
                  onChange={onFileChange}
                />
                <div className="profile-photo-row">
                  <UserAvatar userId={user.id} initials={initials} className="profile-photo-big" />
                  <div className="profile-photo-actions">
                    <button type="button" className="profile-btn-secondary" onClick={onPickPhoto}>
                      Subir nueva foto
                    </button>
                    <button type="button" className="profile-btn-outline" onClick={onRemovePhoto}>
                      Eliminar
                    </button>
                  </div>
                </div>
                <p className="profile-hint">JPG o PNG · Máx 2MB</p>
              </div>

              <div className="profile-card" style={{ marginTop: 'var(--space-lg)' }}>
                <h2 className="profile-card-title">Información básica</h2>
                <div className="profile-form-row">
                  <div className="profile-field">
                    <label htmlFor="pf-first">Nombre</label>
                    <input
                      id="pf-first"
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="pf-last">Apellidos</label>
                    <input
                      id="pf-last"
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                <div className="profile-field full" style={{ marginBottom: 'var(--space-md)' }}>
                  <label htmlFor="pf-email">Email</label>
                  <input
                    id="pf-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    autoComplete="email"
                  />
                </div>
                <div className="profile-field full" style={{ marginBottom: 'var(--space-md)' }}>
                  <label htmlFor="pf-phone">Teléfono</label>
                  <input
                    id="pf-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    autoComplete="tel"
                  />
                </div>
                <div className="profile-field full" style={{ marginBottom: 'var(--space-md)' }}>
                  <label htmlFor="pf-company">Empresa</label>
                  <input
                    id="pf-company"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    autoComplete="organization"
                  />
                </div>
                <div className="profile-field full">
                  <label htmlFor="pf-job">Cargo (opcional)</label>
                  <input
                    id="pf-job"
                    value={form.job_title}
                    onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                    placeholder="Tu cargo"
                    autoComplete="organization-title"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="profile-card">
                <h2 className="profile-card-title">Información de cuenta</h2>
                <div className="profile-kv">
                  <div className="profile-kv-row">
                    <span>ID usuario</span>
                    <strong>{userIdLabel}</strong>
                  </div>
                  <div className="profile-kv-row">
                    <span>Miembro desde</span>
                    <span>{formatMemberSince(user.date_joined)}</span>
                  </div>
                  <div className="profile-kv-row">
                    <span>Plan activo</span>
                    <span className={`profile-badge-plan ${user.role ?? 'standard'}`}>
                      {planLabelMap[user.role] ?? 'Standard'}
                    </span>
                  </div>
                  <div className="profile-kv-row">
                    <span>Estado</span>
                    <span className="profile-badge-soft">{user.is_active !== false ? 'Activo' : 'Inactivo'}</span>
                  </div>
                  <div className="profile-kv-row">
                    <span>Renovación</span>
                    <span>{formatRenewal(user.vigente_hasta)}</span>
                  </div>
                </div>
              </div>

              <div className="profile-card" style={{ marginTop: 'var(--space-lg)' }}>
                <h2 className="profile-card-title">Uso este mes</h2>
                <div className="profile-usage-block">
                  <div className="profile-usage-head">
                    <span className="profile-usage-label">Puestos reservados</span>
                    <span className="profile-usage-value">{usageStats.deskCount}</span>
                  </div>
                  <div className="profile-progress">
                    <div className="profile-progress-fill" style={{ width: `${usageStats.deskBar}%` }} />
                  </div>
                  <p className="profile-usage-sub">Sin límite</p>
                </div>
                <div className="profile-usage-block">
                  <div className="profile-usage-head">
                    <span className="profile-usage-label">Horas de sala</span>
                    <span className="profile-usage-value">
                      {usageStats.roomRounded} / {HOUR_BUDGET}h
                    </span>
                  </div>
                  <div className="profile-progress">
                    <div className="profile-progress-fill" style={{ width: `${usageStats.roomBar}%` }} />
                  </div>
                  <p className="profile-usage-sub">
                    {usageStats.roomRemaining}h disponibles
                  </p>
                </div>
              </div>

              <div className="profile-card profile-danger-card" style={{ marginTop: 'var(--space-lg)' }}>
                <h2 className="profile-card-title">Zona de peligro</h2>
                <p className="profile-danger-sub">Estas acciones no se pueden deshacer.</p>
                <button
                  type="button"
                  className="profile-btn-danger-outline"
                  onClick={() =>
                    showToast?.(
                      'Solicitud enviada',
                      'Nos pondremos en contacto contigo para completar la eliminación de la cuenta.',
                    )}
                >
                  Solicitar eliminación de cuenta
                </button>
              </div>
            </div>
          </div>
        </div>
    </AccountDashboardLayout>
  )
}
