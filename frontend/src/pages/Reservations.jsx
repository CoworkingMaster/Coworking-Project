import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import UserAvatar from '../components/UserAvatar'
import { rooms, deskPositions } from '../data/rooms'
import { TAB_OPTIONS, TYPE_OPTIONS, MONTH_OPTIONS, SECTION_LABELS } from '../data/reservationLabels'
import './Reservations.css'

const formatDate = (dateStr, opts) => {
  try {
    const dt = new Date(dateStr)
    return new Intl.DateTimeFormat('es-ES', opts).format(dt)
  } catch {
    return ''
  }
}

const formatTime = (dateStr) =>
  formatDate(dateStr, { hour: '2-digit', minute: '2-digit' })

const DAYS_IN_MONTH = 30
const HOUR_BUDGET = 10

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
  const diffMs = to - from
  return Math.max(0, diffMs / 1000 / 60 / 60)
}

export default function Reservations({ user, onLogout, authChecked }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('upcoming')
  const [typeFilter, setTypeFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const planLabelMap = {
    standard: 'Standard',
    premium: 'Premium',
    enterprise: 'Enterprise',
  }

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      if (authChecked) navigate('/')
      return
    }

    let cancelled = false
    setError(null)
    setLoading(true)

    apiFetch('/api/reservations/')
      .then(async (res) => {
        if (cancelled) return

        if (!res.ok) {
          const errorText = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status} ${res.statusText}${errorText ? ` - ${errorText}` : ''}`)
        }

        const data = await res.json().catch(() => null)
        if (cancelled) return

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : []

        if (!user?.id) {
          console.warn('No se recibió user.id desde /api/me/. Revisa que el backend devuelva id en el payload.')
          setError('No se pudo identificar tu usuario. Recarga la página para actualizar la sesión.')
          setReservations([])
          return
        }

        const mine = list.filter(r => String(r.usuario) === String(user.id))
        setReservations(mine)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Error cargando reservas:', err)
          setError('No se pudieron cargar tus reservas. Refresca la página para intentar de nuevo.')
          setReservations([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user, authChecked, navigate, reloadKey])

  const now = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const monthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 1), [now])

  useEffect(() => {
    if (loading || error || !reservations.length) return

    const hasUpcoming = reservations.some(res => {
      const start = new Date(res.fecha_inicio)
      return start >= now && res.estado !== 'cancelada'
    })

    const hasPast = reservations.some(res => {
      const end = new Date(res.fecha_fin)
      return end < now && res.estado !== 'cancelada'
    })

    if (!hasUpcoming && hasPast && activeTab === 'upcoming') {
      setActiveTab('past')
    }
  }, [loading, error, reservations, now, activeTab])

  const enrichedReservations = useMemo(() => {
    return reservations.map(r => {
      const start = new Date(r.fecha_inicio)
      const end = new Date(r.fecha_fin)
      const space = resolveSpace(r)
      const type = getReservationType(space)
      const status = r.estado || 'activa'
      return {
        ...r,
        start,
        end,
        space,
        type,
        status,
        durationHours: getDurationHours(r.fecha_inicio, r.fecha_fin),
        dayKey: `${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`,
      }
    })
  }, [reservations])

  const monthReservations = useMemo(() => {
    return enrichedReservations.filter((res) => {
      if (monthFilter === 'all') return true
      return res.start >= monthStart && res.start < monthEnd
    })
  }, [enrichedReservations, monthFilter, monthStart, monthEnd])

  const filteredReservations = useMemo(() => {
    const byTab = monthReservations.filter((res) => {
      if (activeTab === 'all') return true
      if (activeTab === 'cancelled') return res.status === 'cancelada'
      if (activeTab === 'past') return res.end < now && res.status !== 'cancelada'
      if (activeTab === 'upcoming') return res.start >= now && res.status !== 'cancelada'
      return true
    })

    const byType = typeFilter === 'all' ? byTab : byTab.filter(res => res.type === typeFilter)
    const bySearch = searchTerm.trim().length === 0
      ? byType
      : byType.filter(res =>
        res.space.name.toLowerCase().includes(searchTerm.toLowerCase())
      )

    return bySearch.sort((a, b) => a.start - b.start)
  }, [monthReservations, activeTab, typeFilter, searchTerm, now])

  const statUniqueDays = useMemo(() => {
    const days = new Set()
    monthReservations
      .filter(res => res.type === 'puesto' && res.status !== 'cancelada')
      .forEach(res => days.add(res.dayKey))
    return days.size
  }, [monthReservations])

  const statRoomHours = useMemo(() => {
    return monthReservations
      .filter(res => res.type === 'sala' && res.status !== 'cancelada')
      .reduce((sum, res) => sum + res.durationHours, 0)
  }, [monthReservations])

  const statTotal = monthReservations.filter(res => res.status !== 'cancelada').length

  useEffect(() => {
    if (loading || error) return
    if (monthFilter !== 'current') return
    if (!reservations.length) return

    const hasCurrent = reservations.some(res => {
      const start = new Date(res.fecha_inicio)
      return start >= monthStart && start < monthEnd
    })

    if (!hasCurrent) {
      setMonthFilter('all')
    }
  }, [loading, error, monthFilter, reservations, monthStart, monthEnd])

  const cancelReservation = async (id) => {
    setCancellingId(id)
    setError(null)

    try {
      const res = await apiFetch(`/api/reservations/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'cancelada' }),
      })

      if (!res.ok) {
        const statusText = `${res.status} ${res.statusText}`
        const body = await res.text().catch(() => '')
        throw new Error(`Error al cancelar reserva (${statusText}) ${body}`)
      }

      const updated = await res.json()

      setReservations(prev => prev.map(r => r.id === updated.id ? { ...r, estado: updated.estado } : r))

      // Si estás en tab "Próximas" y cancelas la última próxima, actualizamos estado
      if (activeTab === 'upcoming') {
        const hasUpcoming = reservations.some(r => r.id !== id && new Date(r.fecha_inicio) >= now && r.estado !== 'cancelada')
        if (!hasUpcoming) setActiveTab('past')
      }
    } catch (err) {
      console.error('Error al cancelar reserva:', err)
      setError('No se pudo cancelar la reserva. Intenta de nuevo.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="reservations-page">
      <header className="res-header">
        <div className="res-header-inner">
          <a href="/" className="res-logo">
            <span className="res-logo-icon">◆</span>
            <span className="res-logo-text">WorkHub</span>
          </a>
          <nav className="res-nav">
            <button
              type="button"
              className={`res-nav-link ${location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/') ? 'active' : ''}`}
              onClick={() => navigate('/dashboard')}
            >
              Inicio
            </button>
            <button type="button" className={`res-nav-link ${location.pathname === '/reservations' ? 'active' : ''}`}>
              Mis reservas
            </button>
            <button
              type="button"
              className={`res-nav-link ${location.pathname === '/spaces' ? 'active' : ''}`}
              onClick={() => navigate('/spaces')}
            >
              Reservar
            </button>
          </nav>
          <div className="res-header-actions">
            <span className={`res-badge res-badge-${user?.role ?? 'standard'}`}>
              {planLabelMap[user?.role] ?? 'Standard'}
            </span>
            <UserAvatar userId={user?.id} initials={initials} className="res-avatar" title={user?.email} />
            <button
              className="res-logout-btn"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="res-main">
        <section className="res-top">
          <div className="res-top-left">
            <h1 className="res-title">{SECTION_LABELS.pageTitle}</h1>
            <p className="res-subtitle">{SECTION_LABELS.pageSubtitle}</p>
          </div>
          <button
            className="res-new-btn"
            onClick={() => navigate('/spaces')}
          >
            {SECTION_LABELS.newReservation}
          </button>
        </section>

        <section className="res-stats">
          <div className="res-stat-card">
            <div className="res-stat-title">Puestos reservados este mes</div>
            <div className="res-stat-primary">{statUniqueDays} días</div>
            <div className="res-stat-sub">Sin límite · Plan {planLabelMap[user?.role] ?? 'Standard'}</div>
            <div className="res-progress">
              <div
                className="res-progress-fill"
                style={{ width: `${Math.min(100, (statUniqueDays / DAYS_IN_MONTH) * 100)}%` }}
              />
            </div>
          </div>

          <div className="res-stat-card">
            <div className="res-stat-title">Horas de sala usadas</div>
            <div className="res-stat-primary">{Math.round(statRoomHours)} / {HOUR_BUDGET}h</div>
            <div className="res-stat-sub">{Math.max(0, HOUR_BUDGET - Math.round(statRoomHours))}h disponibles · Se reinicia el {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(monthEnd)}</div>
            <div className="res-progress">
              <div
                className="res-progress-fill"
                style={{ width: `${Math.min(100, (statRoomHours / HOUR_BUDGET) * 100)}%` }}
              />
            </div>
          </div>

          <div className="res-stat-card res-stat-big">
            <div>
              <div className="res-stat-title">Total este mes</div>
              <div className="res-stat-primary res-stat-total">{statTotal}</div>
            </div>
            <div className="res-stat-sub">{monthReservations.length} reservas contabilizadas</div>
          </div>
        </section>

        <section className="res-filters">
          <div className="res-filters-left">
            <div className="res-tabs" role="tablist">
              {TAB_OPTIONS.map(tab => (
                <button
                  key={tab.key}
                  className={`res-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="res-filters-right">
            <div className="res-select-group">
              <label className="res-select-label">Tipo:</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="res-select"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="res-select-group">
              <label className="res-select-label">Mes:</label>
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="res-select"
              >
                {MONTH_OPTIONS.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="res-search">
              <input
                type="text"
                placeholder="Buscar espacio..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="res-list">
          {loading ? (
            <div className="res-loading">Cargando reservas…</div>
          ) : error ? (
            <div className="res-error">
              <p>{error}</p>
              <button className="res-retry-btn" onClick={() => setReloadKey(k => k + 1)}>
                Reintentar
              </button>
            </div>
          ) : filteredReservations.length === 0 ? (
            <div className="res-empty">No hay reservas para mostrar.</div>
          ) : (
            filteredReservations.map((res) => {
              const dateLabel = formatDate(res.start, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
              const timeLabel = `${formatTime(res.start)} – ${formatTime(res.end)}`
              const durationLabel = res.durationHours >= 10 ? 'Todo el día' : timeLabel

              return (
                <div key={res.id} className="res-item">
                  <div className="res-item-date">
                    <div className="res-item-day">{res.start.getDate()}</div>
                    <div className="res-item-month">{formatDate(res.start, { month: 'short' })}</div>
                  </div>

                  <div className="res-item-body">
                    <div className="res-item-header">
                      <div>
                        <div className="res-item-title">{res.space.name}</div>
                        <div className="res-item-meta">
                          {res.space.type} · {res.space.capacity}
                        </div>
                      </div>
                      <div className="res-item-actions">
                        <span className={`res-item-status ${res.status}`}> {res.status === 'cancelada' ? 'Cancelada' : 'Confirmada'} </span>
                        <button
                          className="res-item-cancel"
                          onClick={() => cancelReservation(res.id)}
                          disabled={res.status === 'cancelada' || cancellingId === res.id}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    <div className="res-item-details">
                      <span className="res-item-detail">{dateLabel}</span>
                      <span className="res-item-detail">{durationLabel}</span>
                    </div>
                    {res.space.amenities?.length > 0 && (
                      <div className="res-item-amenities">
                        {res.space.amenities.slice(0, 3).join(' · ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
