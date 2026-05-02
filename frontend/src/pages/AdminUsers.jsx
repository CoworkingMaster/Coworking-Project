import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import AdminNav from '../components/AdminNav'
import './AdminAnalytics.css'
import './AdminManagement.css'

const isAdminUser = (u) => Boolean(u?.is_staff || u?.is_superuser)

const ROLE_LABELS = { standard: 'Standard', premium: 'Premium', enterprise: 'SuperPro' }
const ROLE_COLORS = { standard: 'role-standard', premium: 'role-premium', enterprise: 'role-enterprise' }

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { dateStyle: 'medium' })
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

function EditUserModal({ user: targetUser, onSave, onClose }) {
  const [role, setRole] = useState(targetUser.role)
  const [isActive, setIsActive] = useState(targetUser.is_active)
  const [isStaff, setIsStaff] = useState(targetUser.is_staff)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(targetUser.id, { role, is_active: isActive, is_staff: isStaff })
    setSaving(false)
  }

  return (
    <div className="mgmt-modal-overlay" onClick={onClose}>
      <div className="mgmt-modal" onClick={e => e.stopPropagation()}>
        <h2 className="mgmt-modal-title">Editar usuario</h2>
        <p className="mgmt-modal-sub">{targetUser.email}</p>

        <label className="mgmt-label">Plan</label>
        <select className="mgmt-select mgmt-select-full" value={role} onChange={e => setRole(e.target.value)}>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
          <option value="enterprise">SuperPro</option>
        </select>

        <div className="mgmt-toggle-row">
          <label className="mgmt-label">Cuenta activa</label>
          <button className={`mgmt-toggle ${isActive ? 'on' : 'off'}`} onClick={() => setIsActive(v => !v)} type="button">
            {isActive ? 'Si' : 'No'}
          </button>
        </div>

        <div className="mgmt-toggle-row">
          <label className="mgmt-label">Admin (staff)</label>
          <button className={`mgmt-toggle ${isStaff ? 'on' : 'off'}`} onClick={() => setIsStaff(v => !v)} type="button">
            {isStaff ? 'Si' : 'No'}
          </button>
        </div>

        <div className="mgmt-modal-actions">
          <button className="mgmt-btn mgmt-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="analytics-primary-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminUsers({ user, onLogout, authChecked = true }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: p })
      if (filterRole) params.set('role', filterRole)
      if (filterActive) params.set('is_active', filterActive)
      if (search) params.set('search', search)
      const res = await apiFetch(`/api/admin/users/?${params}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      setUsers(data.results)
      setNumPages(data.num_pages)
      setPage(data.page)
      setTotal(data.count)
    } catch (err) {
      setError(err.message || 'Error cargando usuarios.')
    } finally {
      setLoading(false)
    }
  }, [filterRole, filterActive, search])

  useEffect(() => {
    if (!authChecked) return
    if (!user) { navigate('/'); return }
    if (!isAdminUser(user)) { setLoading(false); return }
    fetchUsers(1)
  }, [authChecked, user, navigate, fetchUsers])

  const goToPage = useCallback((p) => fetchUsers(p), [fetchUsers])

  const saveUserChanges = useCallback(async (id, changes) => {
    try {
      const res = await apiFetch(`/api/admin/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === id ? updated : u))
      setEditingUser(null)
    } catch {
      setError('No se pudo actualizar el usuario.')
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
      <AdminNav user={user} onLogout={onLogout} active="users" />

      <main className="analytics-main">
        <section className="analytics-top">
          <div>
            <h1 className="analytics-title">Gestion de usuarios</h1>
            <p className="analytics-subtitle">
              {!loading && `${total} usuario${total !== 1 ? 's' : ''} · `}
              Cambia plan, activa o desactiva cuentas.
            </p>
          </div>
          <button className="analytics-primary-btn" onClick={() => fetchUsers(1)} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </section>

        {error && <section className="analytics-alert"><p>{error}</p></section>}

        <section className="mgmt-filters">
          <input
            className="mgmt-search"
            placeholder="Buscar por nombre, email o empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
          />
          <select className="mgmt-select" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">Todos los planes</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="enterprise">SuperPro</option>
          </select>
          <select className="mgmt-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
            <option value="">Activos e inactivos</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
          <button className="analytics-primary-btn mgmt-search-btn" onClick={() => fetchUsers(1)}>Buscar</button>
        </section>

        <section className="mgmt-table-wrap">
          {loading ? (
            <p className="mgmt-empty">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="mgmt-empty">No hay usuarios con esos filtros.</p>
          ) : (
            <>
              <table className="mgmt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Empresa / Cargo</th>
                    <th>Telefono</th>
                    <th>Plan</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="mgmt-id">{u.id}</td>
                      <td>
                        <div className="mgmt-cell-main">
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                        </div>
                        <div className="mgmt-cell-sub">{u.email}</div>
                        {u.is_staff && <span className="mgmt-badge-staff">Staff</span>}
                        {u.is_superuser && <span className="mgmt-badge-super">Super</span>}
                      </td>
                      <td>
                        {u.company && <div className="mgmt-cell-main">{u.company}</div>}
                        {u.job_title && <div className="mgmt-cell-sub">{u.job_title}</div>}
                        {!u.company && !u.job_title && <span className="mgmt-cell-empty">—</span>}
                      </td>
                      <td className="mgmt-phone">{u.phone || '—'}</td>
                      <td>
                        <span className={`mgmt-role ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`mgmt-status ${u.is_active ? 'status-active' : 'status-cancelled'}`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="mgmt-date">{formatDate(u.date_joined)}</td>
                      <td className="mgmt-actions">
                        <button className="mgmt-btn mgmt-btn-edit" onClick={() => setEditingUser(u)}>Editar</button>
                        <button
                          className={`mgmt-btn ${u.is_active ? 'mgmt-btn-cancel' : 'mgmt-btn-activate'}`}
                          onClick={() => saveUserChanges(u.id, { is_active: !u.is_active })}
                        >{u.is_active ? 'Desactivar' : 'Activar'}</button>
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={saveUserChanges}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  )
}
