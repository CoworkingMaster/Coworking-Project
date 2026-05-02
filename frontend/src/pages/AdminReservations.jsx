import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import AdminNav from '../components/AdminNav'
import './AdminAnalytics.css'
import './AdminManagement.css'

const isAdminUser = (u) => Boolean(u?.is_staff || u?.is_superuser)

const ESTADO_LABELS = { activa: 'Activa', finalizada: 'Finalizada', cancelada: 'Cancelada' }
const ESTADO_COLORS = { activa: 'status-active', finalizada: 'status-done', cancelada: 'status-cancelled' }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function Pagination({ page, numPages, onPage }) {
  if (numPages <= 1) return null
  const pages = []
  for (let i = 1; i <= numPages; i++) {
    if (i === 1 || i === numPages || Math.abs(i - page) <= 2) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…')
    }
  }
  return (
    <div className="mgmt-pagination">
      <button className="mgmt-page-btn" onClick={() => onPage(page - 1)} disabled={page === 1}>&#8592;</button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`ellipsis-${i}`} className="mgmt-page-ellipsis">…</span>
          : <button
              key={p}
              className={`mgmt-page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPage(p)}
            >{p}</button>
      )}
      <button className="mgmt-page-btn" onClick={() => onPage(page + 1)} disabled={page === numPages}>&#8594;</button>
    </div>
  )
}

export default function AdminReservations({ user, onLogout, authChecked = true }) {
  const navigate = useNavigate()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [updating, setUpdating] = useState(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchReservations = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: p })
      if (filterEstado) params.set('estado', filterEstado)
      if (search) params.set('search', search)
      const res = await apiFetch(`/api/admin/reservations/?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setReservations(data.results)
      setNumPages(data.num_pages)
      setPage(data.page)
      setTotal(data.count)
    } catch (err) {
      setError(err.message || 'Error cargando reservas.')
    } finally {
      setLoading(false)
    }
  }, [filterEstado, search])

  useEffect(() => {
    if (!authChecked) return
    if (!user) { navigate('/'); return }
    if (!isAdminUser(user)) { setLoading(false); return }
    fetchReservations(1)
  }, [authChecked, user, navigate, fetchReservations])

  const goToPage = useCallback((p) => fetchReservations(p), [fetchReservations])

  const cancelReservation = useCallback(async (id) => {
    setUpdating(id)
    try {
      const res = await apiFetch(`/api/admin/reservations/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await res.json()
      setReservations(prev => prev.map(r => r.id === id ? { ...r, estado: updated.estado } : r))
    } catch {
      setError('No se pudo cancelar la reserva.')
    } finally {
      setUpdating(null)
    }
  }, [])

  const deleteReservation = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar esta reserva definitivamente?')) return
    setUpdating(id)
    try {
      const res = await apiFetch(`/api/admin/reservations/${id}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setReservations(prev => prev.filter(r => r.id !== id))
      setTotal(t => t - 1)
    } catch {
      setError('No se pudo eliminar la reserva.')
    } finally {
      setUpdating(null)
    }
  }, [])

  if (!user) return null

  if (!isAdminUser(user)) {
    return (
      <div className="analytics-page analytics-page-empty">
        <div className="analytics-empty-card">
          <h1>Panel solo para administradores</h1>
          <button className="analytics-primary-btn" onClick={() => navigate('/dashboard')}>Volver</button>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-page">
      <AdminNav user={user} onLogout={onLogout} active="reservations" />

      <main className="analytics-main">
        <section className="analytics-top">
          <div>
            <h1 className="analytics-title">Gestion de reservas</h1>
            <p className="analytics-subtitle">
              {!loading && `${total} reserva${total !== 1 ? 's' : ''} · `}
              Filtra por usuario o estado. Cancela las activas o elimina cualquiera.
            </p>
          </div>
          <button className="analytics-primary-btn" onClick={() => fetchReservations(1)} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </section>

        {error && <section className="analytics-alert"><p>{error}</p></section>}

        <section className="mgmt-filters">
          <input
            className="mgmt-search"
            placeholder="Buscar por nombre o email de usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchReservations(1)}
          />
          <select className="mgmt-select" value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <button className="analytics-primary-btn mgmt-search-btn" onClick={() => fetchReservations(1)}>Buscar</button>
        </section>

        <section className="mgmt-table-wrap">
          {loading ? (
            <p className="mgmt-empty">Cargando reservas...</p>
          ) : reservations.length === 0 ? (
            <p className="mgmt-empty">No hay reservas con esos filtros.</p>
          ) : (
            <>
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Espacio</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(r => (
                    <tr key={r.id} className={updating === r.id ? 'mgmt-row-updating' : ''}>
                      <td className="mgmt-id">{r.id}</td>
                      <td>
                        <div className="mgmt-cell-main">{r.usuario_nombre || r.usuario_email}</div>
                        <div className="mgmt-cell-sub">{r.usuario_email}</div>
                      </td>
                      <td>
                        <div className="mgmt-cell-main">{r.espacio_nombre}</div>
                        <div className="mgmt-cell-sub">{r.espacio_tipo} · cap. {r.espacio_capacidad}</div>
                      </td>
                      <td className="mgmt-date">{formatDate(r.fecha_inicio)}</td>
                      <td className="mgmt-date">{formatDate(r.fecha_fin)}</td>
                      <td>
                        <span className={`mgmt-status ${ESTADO_COLORS[r.estado]}`}>
                          {ESTADO_LABELS[r.estado] || r.estado}
                        </span>
                      </td>
                      <td className="mgmt-actions">
                        {r.estado === 'activa' && (
                          <button
                            className="mgmt-btn mgmt-btn-cancel"
                            onClick={() => cancelReservation(r.id)}
                            disabled={updating === r.id}
                          >Cancelar</button>
                        )}
                        <button
                          className="mgmt-btn mgmt-btn-delete"
                          onClick={() => deleteReservation(r.id)}
                          disabled={updating === r.id}
                        >Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mgmt-table-footer">
                <span className="mgmt-count">
                  Pagina {page} de {numPages} · {total} resultados
                </span>
                <Pagination page={page} numPages={numPages} onPage={goToPage} />
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
