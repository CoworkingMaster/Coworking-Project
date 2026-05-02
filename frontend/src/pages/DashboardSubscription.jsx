import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/api'
import AccountDashboardLayout from '../components/AccountDashboardLayout'
import { SUBSCRIPTION_PLANS, PLAN_PRICES } from '../data/subscriptionPlans'
import './DashboardSubscription.css'

const PLAN_NAMES = {
  standard: 'Standard',
  premium: 'Premium',
  enterprise: 'SuperPro',
}

const ACTION_LABELS = {
  created: 'Plan iniciado',
  upgraded: 'Plan mejorado',
  downgraded: 'Plan reducido',
  cancelled: 'Suscripción cancelada',
  reactivated: 'Suscripción reactivada',
  cycle_changed: 'Ciclo de facturación cambiado',
}

const ACTION_ICONS = {
  created: '★',
  upgraded: '↑',
  downgraded: '↓',
  cancelled: '✕',
  reactivated: '↺',
  cycle_changed: '⟳',
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    }).format(new Date(iso))
  } catch { return '—' }
}

function formatShortDate(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(iso))
  } catch { return '—' }
}

export default function DashboardSubscription({ user, onLogout, onUserUpdate, showToast, authChecked }) {
  const navigate = useNavigate()
  const [sub, setSub] = useState(null)
  const [loadingSub, setLoadingSub] = useState(true)
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [busy, setBusy] = useState(false)
  // confirm: { type: 'change' | 'cancel', plan?: string, cycle?: string }
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingSub(true)
    apiFetch('/api/subscription/')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data) {
          setSub(data)
          setBillingCycle(data.billing_cycle || 'monthly')
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSub(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const applyChange = async () => {
    if (!confirm || busy) return
    setBusy(true)
    try {
      let res
      if (confirm.type === 'cancel') {
        res = await apiFetch('/api/subscription/cancel/', { method: 'POST' })
      } else {
        const body = {}
        if (confirm.plan) body.plan = confirm.plan
        if (confirm.cycle) body.billing_cycle = confirm.cycle
        res = await apiFetch('/api/subscription/', {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.error || data.plan || data.billing_cycle || 'No se pudo actualizar'
        showToast?.('Error', msg, 'error')
        return
      }
      setSub(data)
      if (data.billing_cycle) setBillingCycle(data.billing_cycle)
      onUserUpdate?.({ role: data.plan, vigente_hasta: data.current_period_end })
      if (confirm.type === 'cancel') {
        showToast?.('Suscripción cancelada', 'Has vuelto al plan Standard.')
      } else {
        const planLabel = PLAN_NAMES[data.plan] ?? data.plan
        showToast?.('Plan actualizado', `Tu plan es ahora ${planLabel}.`)
      }
    } catch {
      showToast?.('Error de red', 'Revisa la conexión e inténtalo de nuevo.', 'error')
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const handleCycleToggle = async (cycle) => {
    if (cycle === billingCycle || busy) return
    setBillingCycle(cycle)
    if (!sub || sub.plan === 'standard') return
    setBusy(true)
    try {
      const res = await apiFetch('/api/subscription/', {
        method: 'PATCH',
        body: JSON.stringify({ billing_cycle: cycle }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBillingCycle(sub.billing_cycle)
        showToast?.('Error', data.billing_cycle || data.error || 'No se pudo cambiar el ciclo', 'error')
        return
      }
      setSub(data)
      onUserUpdate?.({ vigente_hasta: data.current_period_end })
      const label = cycle === 'annual' ? 'anual' : 'mensual'
      showToast?.('Ciclo actualizado', `Facturación ${label} activada.`)
    } catch {
      setBillingCycle(sub.billing_cycle)
      showToast?.('Error de red', 'Inténtalo de nuevo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (authChecked && !user) navigate('/')
  }, [authChecked, user, navigate])

  if (!user) return null

  const currentPlan = sub?.plan ?? user.role
  const usage = sub?.usage
  const roomLimit = usage?.room_hours_limit ?? null
  const roomUsed = usage?.room_hours ?? 0
  const roomBar = roomLimit ? Math.min(100, (roomUsed / roomLimit) * 100) : 0
  const deskDays = usage?.desk_days ?? 0
  const currentPrice = PLAN_PRICES[currentPlan]?.[billingCycle] ?? 0

  return (
    <AccountDashboardLayout user={user} onLogout={onLogout} activeNav="subscription">
      <div className="subscription-main profile-main-col">

        {/* ── Header ── */}
        <div className="subscription-page-header">
          <div>
            <h1>Suscripción</h1>
            <p>Gestiona tu plan y ciclo de facturación</p>
          </div>
          <div className="subscription-billing-toggle" aria-label="Ciclo de facturación">
            <button
              type="button"
              className={`subscription-cycle-btn${billingCycle === 'monthly' ? ' active' : ''}`}
              onClick={() => handleCycleToggle('monthly')}
              disabled={busy}
            >
              Mensual
            </button>
            <button
              type="button"
              className={`subscription-cycle-btn${billingCycle === 'annual' ? ' active' : ''}`}
              onClick={() => handleCycleToggle('annual')}
              disabled={busy}
            >
              Anual
              <span className="subscription-discount-badge">-20%</span>
            </button>
          </div>
        </div>

        {loadingSub ? (
          <div className="subscription-loading">
            <div className="subscription-skeleton" />
            <div className="subscription-skeleton subscription-skeleton--short" />
            <div className="subscription-skeleton" />
          </div>
        ) : (
          <>
            {/* ── Tarjeta de estado actual ── */}
            <div className="subscription-status-card">
              <div className="subscription-status-main">
                <div className="subscription-status-plan-row">
                  <span className={`subscription-status-pill plan-${currentPlan}`}>
                    {PLAN_NAMES[currentPlan] ?? currentPlan}
                  </span>
                  {sub?.status === 'cancelled' && (
                    <span className="subscription-cancelled-badge">Cancelada</span>
                  )}
                </div>
                <div className="subscription-status-price-row">
                  <span className="subscription-status-price">
                    {currentPrice > 0 ? `${currentPrice}€` : 'Gratis'}
                  </span>
                  {currentPrice > 0 && (
                    <span className="subscription-status-period">
                      /{billingCycle === 'annual' ? 'mes · facturación anual' : 'mes'}
                    </span>
                  )}
                </div>
                <p className="subscription-status-renewal">
                  {currentPlan === 'standard'
                    ? 'Plan gratuito · Sin renovación automática'
                    : sub?.current_period_end
                    ? `Renovación: ${formatDate(sub.current_period_end)}`
                    : '—'}
                </p>
              </div>

              {/* ── Medidores de uso ── */}
              <div className="subscription-status-usage">
                <p className="subscription-usage-title">Uso este mes</p>

                <div className="subscription-usage-item">
                  <div className="subscription-usage-head">
                    <span>Días con puesto</span>
                    <strong>{deskDays}</strong>
                  </div>
                  <div className="subscription-usage-bar">
                    <div
                      className="subscription-usage-fill"
                      style={{ width: `${Math.min(100, (deskDays / 22) * 100)}%` }}
                    />
                  </div>
                  <span className="subscription-usage-sub">Sin límite</span>
                </div>

                {(currentPlan === 'premium' || currentPlan === 'enterprise') && (
                  <div className="subscription-usage-item">
                    <div className="subscription-usage-head">
                      <span>Horas de sala</span>
                      <strong>
                        {roomUsed}h{roomLimit !== null ? ` / ${roomLimit}h` : ''}
                      </strong>
                    </div>
                    {roomLimit !== null ? (
                      <div className="subscription-usage-bar">
                        <div
                          className={`subscription-usage-fill${roomBar >= 90 ? ' subscription-usage-fill--warn' : ''}`}
                          style={{ width: `${roomBar}%` }}
                        />
                      </div>
                    ) : (
                      <div className="subscription-usage-bar">
                        <div className="subscription-usage-fill subscription-usage-fill--unlimited" />
                      </div>
                    )}
                    <span className="subscription-usage-sub">
                      {roomLimit === null
                        ? 'Ilimitado'
                        : `${usage?.room_hours_remaining ?? 0}h disponibles`}
                    </span>
                  </div>
                )}

                {currentPlan === 'standard' && (
                  <div className="subscription-usage-item subscription-usage-item--locked">
                    <div className="subscription-usage-head">
                      <span>Horas de sala</span>
                      <strong>—</strong>
                    </div>
                    <p className="subscription-usage-sub subscription-usage-sub--locked">
                      Disponible desde Premium
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Banner de cancelación ── */}
            {confirm?.type === 'cancel' && (
              <div className="subscription-cancel-banner">
                <div className="subscription-cancel-icon" aria-hidden>⚠</div>
                <div className="subscription-cancel-text">
                  <strong>¿Cancelar tu suscripción {PLAN_NAMES[currentPlan]}?</strong>
                  <p>
                    Volverás al plan Standard de forma inmediata. Perderás el acceso a
                    {currentPlan === 'enterprise'
                      ? ' salas ilimitadas, analíticas y soporte dedicado.'
                      : ' la reserva de salas de reuniones.'}
                  </p>
                </div>
                <div className="subscription-cancel-actions">
                  <button
                    type="button"
                    className="subscription-btn-danger"
                    onClick={applyChange}
                    disabled={busy}
                  >
                    {busy ? 'Cancelando…' : 'Sí, cancelar'}
                  </button>
                  <button
                    type="button"
                    className="subscription-btn-ghost-sm"
                    onClick={() => setConfirm(null)}
                    disabled={busy}
                  >
                    Mantener plan
                  </button>
                </div>
              </div>
            )}

            {/* ── Grid de planes ── */}
            <div className="subscription-plans-section">
              <h2 className="subscription-section-title">Planes disponibles</h2>
              <div className="subscription-grid">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan.backendRole
                  const price = PLAN_PRICES[plan.backendRole]?.[billingCycle] ?? 0
                  const isConfirmingChange =
                    confirm?.type === 'change' &&
                    confirm?.plan === plan.backendRole &&
                    !confirm?.cycle

                  return (
                    <div
                      key={plan.id}
                      className={[
                        'subscription-card',
                        isCurrent ? 'subscription-card--current' : '',
                        plan.popular && !isCurrent ? 'subscription-card--popular' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {isCurrent && (
                        <span className="subscription-badge-actual">ACTUAL</span>
                      )}
                      {plan.popular && !isCurrent && (
                        <span className="subscription-badge-popular">MÁS POPULAR</span>
                      )}

                      <span className="subscription-plan-pill">{plan.name}</span>

                      <div className="subscription-price">
                        {price > 0 ? (
                          <>
                            {price}€
                            <span className="subscription-price-period">/mes</span>
                          </>
                        ) : (
                          'Gratis'
                        )}
                      </div>

                      {billingCycle === 'annual' && price > 0 && (
                        <p className="subscription-annual-note">
                          {price * 12}€ al año
                        </p>
                      )}

                      <ul className="subscription-features">
                        {plan.features.map((f) => (
                          <li
                            key={f.text}
                            className={`subscription-feat ${f.included ? 'subscription-feat--yes' : 'subscription-feat--no'}`}
                          >
                            <span className="subscription-feat-box" aria-hidden>
                              {f.included ? '✓' : ''}
                            </span>
                            <span>{f.text}</span>
                          </li>
                        ))}
                      </ul>

                      {isConfirmingChange ? (
                        <div className="subscription-inline-confirm">
                          <p className="subscription-inline-confirm-msg">
                            ¿Cambiar a <strong>{plan.name}</strong>?
                          </p>
                          <div className="subscription-inline-confirm-btns">
                            <button
                              type="button"
                              className="subscription-btn-confirm-ok"
                              onClick={applyChange}
                              disabled={busy}
                            >
                              {busy ? 'Procesando…' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              className="subscription-btn-confirm-no"
                              onClick={() => setConfirm(null)}
                              disabled={busy}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : isCurrent ? (
                        plan.backendRole === 'standard' ? (
                          <button type="button" className="subscription-btn-current" disabled>
                            Plan actual
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="subscription-btn-cancel"
                            disabled={busy || confirm !== null}
                            onClick={() => setConfirm({ type: 'cancel' })}
                          >
                            Cancelar suscripción
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          className="subscription-btn-choose"
                          disabled={busy || confirm !== null}
                          onClick={() =>
                            setConfirm({ type: 'change', plan: plan.backendRole })
                          }
                        >
                          {`Elegir ${plan.name}`}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Historial de cambios ── */}
            {sub?.history?.length > 0 && (
              <div className="subscription-history-section">
                <h2 className="subscription-section-title">Historial de cambios</h2>
                <div className="subscription-history-list">
                  {sub.history.map((h, i) => (
                    <div key={i} className="subscription-history-item">
                      <span className="subscription-history-icon" aria-hidden>
                        {ACTION_ICONS[h.action] ?? '•'}
                      </span>
                      <div className="subscription-history-info">
                        <strong>{ACTION_LABELS[h.action] ?? h.action}</strong>
                        <span>
                          {PLAN_NAMES[h.plan] ?? h.plan} ·{' '}
                          {h.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}
                        </span>
                      </div>
                      <span className="subscription-history-date">
                        {formatShortDate(h.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AccountDashboardLayout>
  )
}
