import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import AdminNav from '../components/AdminNav'
import './AdminAnalytics.css'

const isAdminUser = (u) => Boolean(u?.is_staff || u?.is_superuser)

const formatSigned = (value) => `${value > 0 ? '+' : ''}${value}`

function TrendBadge({ deltaData }) {
  if (!deltaData) return null
  const trendClass = deltaData.trend === 'up' ? 'up' : deltaData.trend === 'down' ? 'down' : 'flat'
  return (
    <span className={`analytics-trend analytics-trend-${trendClass}`}>
      {formatSigned(deltaData.delta)} ({formatSigned(deltaData.percentage)}%)
    </span>
  )
}

function BarChart({ series = [] }) {
  if (!series.length) {
    return <div className="analytics-sparkline-empty">No hay datos</div>
  }

  const maxValue = Math.max(...series.map((item) => item.value), 1)

  return (
    <div className="analytics-barchart">
      <div className="analytics-barchart-bars">
        {series.map((item, index) => {
          const height = (item.value / maxValue) * 100
          return (
            <div key={`${item.date}-${index}`} className="analytics-barchart-column" title={`${item.date}: ${item.value}`}>
              <div className="analytics-barchart-column-fill" style={{ height: `${height}%` }}>
                {item.value > 0 && <span>{item.value}</span>}
              </div>
              <div className="analytics-barchart-label">{item.date.slice(5)}</div>
            </div>
          )
        })}
      </div>
      <div className="analytics-barchart-axis">0</div>
    </div>
  )
}

function MiniBars({ items = [], maxItems = 8 }) {
  const sliced = items.slice(0, maxItems)
  const maxValue = Math.max(...sliced.map(item => item.value), 1)

  return (
    <div className="analytics-mini-bars">
      {sliced.map((item) => (
        <div key={item.label} className="analytics-mini-row">
          <div className="analytics-mini-label">{item.label}</div>
          <div className="analytics-mini-track">
            <div className="analytics-mini-fill" style={{ width: `${(item.value / maxValue) * 100}%` }} />
          </div>
          <div className="analytics-mini-value">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function RoomHeatmap({ rows = [] }) {
  if (!rows.length) {
    return <p className="analytics-empty-text">Sin datos de uso horario.</p>
  }

  return (
    <div className="analytics-heatmap">
      {rows.map((day) => (
        <div key={day.weekday} className="analytics-heatmap-row">
          <div className="analytics-heatmap-day">{day.label}</div>
          <div className="analytics-heatmap-cells">
            {day.hours.map((slot) => {
              let level = 'zero'
              if (slot.value >= 6) level = 'high'
              else if (slot.value >= 3) level = 'mid'
              else if (slot.value >= 1) level = 'low'

              return (
                <div
                  key={`${day.weekday}-${slot.hour}`}
                  className={`analytics-heatmap-cell analytics-heatmap-cell-${level}`}
                  title={`${day.label} ${slot.label}: ${slot.value} reservas`}
                />
              )
            })}
          </div>
        </div>
      ))}
      <div className="analytics-heatmap-legend">
        <span><i className="analytics-heatmap-cell analytics-heatmap-cell-zero" />0</span>
        <span><i className="analytics-heatmap-cell analytics-heatmap-cell-low" />1-2</span>
        <span><i className="analytics-heatmap-cell analytics-heatmap-cell-mid" />3-5</span>
        <span><i className="analytics-heatmap-cell analytics-heatmap-cell-high" />6+</span>
      </div>
    </div>
  )
}

export default function AdminAnalytics({ user, onLogout, authLoading = false }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const isAdmin = isAdminUser(user)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiFetch('/api/analytics/admin/overview/')
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('No tienes permisos para ver este panel.')
        }
        throw new Error(`No se pudieron cargar las analiticas (HTTP ${res.status}).`)
      }
      const payload = await res.json()
      setData(payload)
    } catch (err) {
      setError(err.message || 'Error inesperado cargando analiticas.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      navigate('/')
      return
    }
    if (!isAdminUser(user)) {
      setLoading(false)
      return
    }
    fetchAnalytics()
  }, [authLoading, user, navigate, fetchAnalytics])

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="analytics-page analytics-page-empty">
        <div className="analytics-empty-card">
          <h1>Panel solo para administradores</h1>
          <p>Tu usuario no tiene permisos para acceder a las analiticas globales.</p>
          <button className="analytics-primary-btn" onClick={() => navigate('/dashboard')}>
            Volver al dashboard
          </button>
        </div>
      </div>
    )
  }

  const users = data?.users ?? {}
  const reservations = data?.reservations ?? {}
  const plans = data?.plans?.distribution ?? []
  const usersDaily = users.daily_series_last_14_days ?? []
  const reservationsDaily = reservations.daily_series_last_14_days ?? []
  const reservationsWeekly = reservations.weekly_series_last_12_weeks ?? []
  const topSpaces = reservations.top_spaces ?? []
  const topRooms = reservations.top_rooms ?? []
  const peakHours = reservations.peak_hours ?? []
  const weekdays = reservations.weekday_distribution ?? []
  const typeDistribution = reservations.type_distribution ?? []
  const roomsAnalytics = data?.rooms ?? {}
  const roomsTop = roomsAnalytics.top_by_occupancy ?? []
  const roomsBottom = roomsAnalytics.bottom_by_occupancy ?? []
  const roomsHeatmap = roomsAnalytics.usage_heatmap ?? []
  const operatingWindow = roomsAnalytics.operating_window ?? {}

  const weeklyBars = reservationsWeekly.map((item) => ({
    label: item.week_start?.slice(5) ?? '',
    value: item.value ?? 0,
  }))

  const usersDailyBars = usersDaily.map((item) => ({
    label: item.date?.slice(5) ?? '',
    value: item.value ?? 0,
  }))

  const mostActiveHours = [...peakHours]
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    .slice(0, 8)
    .sort((a, b) => (a.hour ?? 0) - (b.hour ?? 0))
    .map((row) => ({ label: row.label, value: row.value ?? 0 }))

  return (
    <div className="analytics-page">
      <AdminNav user={user} onLogout={onLogout} active="analytics" />

      <main className="analytics-main">
        <section className="analytics-top">
          <div>
            <h1 className="analytics-title">Panel de analiticas</h1>
            <p className="analytics-subtitle">
              Indicadores en tiempo real de usuarios, planes y reservas del coworking.
            </p>
          </div>
          <button className="analytics-primary-btn" onClick={fetchAnalytics} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </section>

        {error && (
          <section className="analytics-alert">
            <p>{error}</p>
          </section>
        )}

        <section className="analytics-kpis">
          <article className="analytics-card">
            <div className="analytics-card-label">Usuarios totales</div>
            <div className="analytics-card-value">{users.total ?? 0}</div>
            <div className="analytics-card-foot">
              Hoy: {users.daily_growth?.current ?? 0} <TrendBadge deltaData={users.daily_growth} />
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card-label">Crecimiento semanal usuarios</div>
            <div className="analytics-card-value">{users.weekly_growth?.current ?? 0}</div>
            <div className="analytics-card-foot">
              Semana anterior: {users.weekly_growth?.previous ?? 0} <TrendBadge deltaData={users.weekly_growth} />
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card-label">Reservas no canceladas</div>
            <div className="analytics-card-value">{reservations.total ?? 0}</div>
            <div className="analytics-card-foot">
              Esta semana: {reservations.weekly_growth?.current ?? 0} <TrendBadge deltaData={reservations.weekly_growth} />
            </div>
          </article>

          <article className="analytics-card">
            <div className="analytics-card-label">Ocupacion proxima semana</div>
            <div className="analytics-card-value">{reservations.occupancy_rate_next_7d ?? 0}%</div>
            <div className="analytics-card-foot">
              Duracion media: {reservations.average_duration_hours ?? 0}h
            </div>
          </article>
        </section>

        <section className="analytics-grid analytics-grid-4">
          <article className="analytics-card analytics-card-room">
            <div className="analytics-card-label">Ocupacion operativa salas</div>
            <div className="analytics-card-value">{roomsAnalytics.occupancy_rate_operational ?? 0}%</div>
            <div className="analytics-card-foot">
              {roomsAnalytics.reserved_operational_hours ?? 0}h / {roomsAnalytics.capacity_operational_hours ?? 0}h
            </div>
          </article>
          <article className="analytics-card analytics-card-room">
            <div className="analytics-card-label">Cancelacion de salas</div>
            <div className="analytics-card-value">{roomsAnalytics.cancellation_rate ?? 0}%</div>
            <div className="analytics-card-foot">
              {roomsAnalytics.cancelled_requests ?? 0} canceladas de {roomsAnalytics.total_requests ?? 0}
            </div>
          </article>
          <article className="analytics-card analytics-card-room">
            <div className="analytics-card-label">Fill rate prime time</div>
            <div className="analytics-card-value">{roomsAnalytics.prime_time_fill_rate ?? 0}%</div>
            <div className="analytics-card-foot">
              Ventana {operatingWindow.start_hour ?? 8}:00-{operatingWindow.end_hour ?? 20}:00
            </div>
          </article>
          <article className="analytics-card analytics-card-room">
            <div className="analytics-card-label">Saturacion de salas</div>
            <div className="analytics-card-value">{roomsAnalytics.overloaded_rooms ?? 0}</div>
            <div className="analytics-card-foot">
              Infrautilizadas: {roomsAnalytics.underutilized_rooms ?? 0}
            </div>
          </article>
        </section>

        <section className="analytics-grid analytics-grid-2">
          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Altas de usuarios (ultimos 14 dias)</h2>
              <span>{usersDaily.reduce((acc, row) => acc + (row.value ?? 0), 0)} altas</span>
            </div>
            <div className="analytics-chart-meta">
              <div>
                <strong>{usersDaily.at(-1)?.value ?? 0}</strong>
                <span>Alta en último día</span>
              </div>
              <div>
                <strong>{(usersDaily.reduce((acc, row) => acc + (row.value ?? 0), 0) / Math.max(usersDaily.length, 1)).toFixed(1)}</strong>
                <span>Promedio diario</span>
              </div>
              <div>
                <strong>{formatSigned(users.daily_growth?.delta ?? 0)}</strong>
                <span>Cambio vs ayer</span>
              </div>
            </div>
            <BarChart series={usersDaily} />
            <MiniBars items={usersDailyBars} maxItems={7} />
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Reservas por semana (12 semanas)</h2>
              <span>{weeklyBars.reduce((acc, row) => acc + row.value, 0)} reservas</span>
            </div>
            <MiniBars items={weeklyBars} maxItems={12} />
          </article>
        </section>

        <section className="analytics-grid analytics-grid-3">
          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Distribucion de planes</h2>
            </div>
            <div className="analytics-mini-bars">
              {plans.map((plan) => (
                <div key={plan.role} className="analytics-mini-row">
                  <div className="analytics-mini-label">{plan.label}</div>
                  <div className="analytics-mini-track">
                    <div
                      className="analytics-mini-fill"
                      style={{
                        width: `${plan.percentage ?? 0}%`,
                        background: plan.color,
                      }}
                    />
                  </div>
                  <div className="analytics-mini-value">{plan.count}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Horas con mas reservas</h2>
            </div>
            <MiniBars items={mostActiveHours} maxItems={8} />
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Reservas por dia de semana</h2>
            </div>
            <MiniBars items={weekdays.map((row) => ({ label: row.label, value: row.value }))} maxItems={7} />
          </article>
        </section>

        <section className="analytics-grid analytics-grid-2">
          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Mapa de uso por horario (salas)</h2>
              <span>Ultimos {roomsAnalytics.period_days ?? 30} dias</span>
            </div>
            <RoomHeatmap rows={roomsHeatmap} />
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Salas y espacios mas reservados</h2>
            </div>
            <div className="analytics-table">
              {topSpaces.length === 0 ? (
                <p className="analytics-empty-text">Todavia no hay reservas registradas.</p>
              ) : (
                topSpaces.map((space, index) => (
                  <div key={`${space.id}-${index}`} className="analytics-table-row">
                    <div>
                      <div className="analytics-table-title">{space.nombre}</div>
                      <div className="analytics-table-sub">{space.tipo} · Capacidad {space.capacidad}</div>
                    </div>
                    <div className="analytics-table-value">{space.reservations_total}</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Detalle de actividad de reservas</h2>
            </div>
            <div className="analytics-detail-grid">
              <div className="analytics-detail">
                <span>Total registradas</span>
                <strong>{reservations.total ?? 0}</strong>
              </div>
              <div className="analytics-detail">
                <span>Activas</span>
                <strong>{reservations.active ?? 0}</strong>
              </div>
              <div className="analytics-detail">
                <span>Finalizadas</span>
                <strong>{reservations.finalized ?? 0}</strong>
              </div>
              <div className="analytics-detail">
                <span>Canceladas</span>
                <strong>{reservations.cancelled ?? 0}</strong>
              </div>
              {typeDistribution.map((row) => (
                <div key={row.type} className="analytics-detail">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
              <div className="analytics-detail">
                <span>Top salas</span>
                <strong>{topRooms.length}</strong>
              </div>
              <div className="analytics-detail">
                <span>Reservas (ultimos 14 dias)</span>
                <strong>{reservationsDaily.reduce((acc, row) => acc + (row.value ?? 0), 0)}</strong>
              </div>
            </div>
          </article>
        </section>

        <section className="analytics-grid analytics-grid-2">
          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Top salas por ocupacion</h2>
            </div>
            <div className="analytics-table">
              {roomsTop.length === 0 ? (
                <p className="analytics-empty-text">No hay datos de salas suficientes.</p>
              ) : (
                roomsTop.map((room) => (
                  <div key={room.room_id} className="analytics-table-row">
                    <div>
                      <div className="analytics-table-title">{room.room_name}</div>
                      <div className="analytics-table-sub">
                        Ocupacion {room.occupancy_rate_operational}% · Prime {room.prime_time_fill_rate}% · Cancelacion {room.cancellation_rate}%
                      </div>
                    </div>
                    <div className="analytics-table-value">{room.reserved_operational_hours}h</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Salas a revisar (baja ocupacion)</h2>
            </div>
            <div className="analytics-table">
              {roomsBottom.length === 0 ? (
                <p className="analytics-empty-text">No hay datos de salas suficientes.</p>
              ) : (
                roomsBottom.map((room) => (
                  <div key={room.room_id} className="analytics-table-row">
                    <div>
                      <div className="analytics-table-title">{room.room_name}</div>
                      <div className="analytics-table-sub">
                        Ocupacion {room.occupancy_rate_operational}% · Reservas {room.reservations_count}
                      </div>
                    </div>
                    <div className="analytics-table-value">{room.cancellations_count}</div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
