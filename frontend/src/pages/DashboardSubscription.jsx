import { useState } from 'react'
import { apiFetch } from '../utils/api'
import AccountDashboardLayout from '../components/AccountDashboardLayout'
import { SUBSCRIPTION_PLANS } from '../data/subscriptionPlans'
import './DashboardSubscription.css'

export default function DashboardSubscription({ user, onLogout, onUserUpdate, showToast }) {
  const [busyRole, setBusyRole] = useState(null)
  const cycleEnd = user?.subscription_cycle_end ? new Date(user.subscription_cycle_end) : null
  const cycleActive = Boolean(cycleEnd && Number.isFinite(cycleEnd.getTime()) && new Date() < cycleEnd)
  const roleRank = { standard: 0, premium: 1, enterprise: 2 }
  const formatMoney = (amount) => {
    const num = Number(amount)
    if (!Number.isFinite(num)) return null
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num)
  }
  const formatDate = (dateValue) => {
    if (!dateValue) return null
    const dt = new Date(dateValue)
    if (!Number.isFinite(dt.getTime())) return null
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt)
  }

  const changePlan = async (role) => {
    setBusyRole(role)
    try {
      const res = await apiFetch('/api/me/', {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
      const patchBody = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast?.('No se pudo cambiar el plan', patchBody.error || 'Inténtalo de nuevo.', 'error')
        return
      }

      // Confirmar con la BD (evita estado desincronizado si el PATCH no persistió el rol)
      const verify = await apiFetch('/api/me/')
      const fresh = verify.ok ? await verify.json().catch(() => null) : null
      const effective = fresh && typeof fresh === 'object' && fresh.id != null ? fresh : patchBody

      onUserUpdate?.(effective)

      const labelRequested = SUBSCRIPTION_PLANS.find(p => p.backendRole === role)?.name ?? role
      const labelActual = SUBSCRIPTION_PLANS.find(p => p.backendRole === effective.role)?.name
        ?? effective.role

      if (effective.role === role) {
        const extra =
          effective.role_change_type === 'upgrade' && Number.isFinite(Number(effective.proration_estimate))
            ? ` Diferencia estimada: ${formatMoney(effective.proration_estimate)}.`
            : ''
        showToast?.('Plan actualizado', `Tu plan es ahora ${labelActual}.${extra}`)
      } else {
        showToast?.(
          'El cambio no se aplicó',
          `Pediste «${labelRequested}» pero el servidor sigue en «${labelActual}». Revisa el backend o recarga.`,
          'error',
        )
      }
    } catch {
      showToast?.('Error de red', 'Revisa la conexión e inténtalo de nuevo.', 'error')
    } finally {
      setBusyRole(null)
    }
  }

  const handleCancelPaid = (currentRole) => {
    if (cycleActive) {
      showToast?.(
        'Cambio bloqueado',
        `No puedes bajar de plan hasta el fin del ciclo (${formatDate(cycleEnd)}).`,
        'error',
      )
      return
    }

    const msg =
      currentRole === 'enterprise'
        ? '¿Cancelar SuperPro y volver a Standard? Perderás salas ilimitadas y analíticas.'
        : '¿Cancelar Premium y volver a Standard? Perderás acceso a salas.'
    if (!window.confirm(msg)) return
    changePlan('standard')
  }

  if (!user) return null

  return (
    <AccountDashboardLayout user={user} onLogout={onLogout} activeNav="subscription">
      <div className="subscription-main profile-main-col">
        <div className="subscription-hero">
          <h1>Planes de membresía</h1>
          <p>Escoge el que mejor se adapte a tu forma de trabajar</p>
        </div>

        <div className="subscription-grid">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = user.role === plan.backendRole
            const loading = busyRole !== null

            return (
              <div
                key={plan.id}
                className={`subscription-card${isCurrent ? ' subscription-card--current' : ''}`}
              >
                {isCurrent && (
                  <span className="subscription-badge-actual">ACTUAL</span>
                )}
                <span className="subscription-plan-pill">{plan.name}</span>
                <div className="subscription-price">{formatMoney(plan.pricePlaceholder)} /mes</div>

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

                {isCurrent ? (
                  plan.backendRole === 'standard' ? (
                    <button type="button" className="subscription-btn-current" disabled>
                      Plan actual
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="subscription-btn-cancel"
                      disabled={loading || cycleActive}
                      onClick={() => handleCancelPaid(plan.backendRole)}
                    >
                      {loading && busyRole === 'standard'
                        ? 'Procesando…'
                        : cycleActive
                        ? `Disponible ${formatDate(cycleEnd)}`
                        : 'Cancelar'}
                    </button>
                  )
                ) : (
                  (() => {
                    const isDowngradeAttempt =
                      roleRank[plan.backendRole] < roleRank[user.role]
                    const blockedByCycle = isDowngradeAttempt && cycleActive
                    return (
                  <button
                    type="button"
                    className="subscription-btn-choose"
                    disabled={loading || blockedByCycle}
                    onClick={() => changePlan(plan.backendRole)}
                  >
                    {blockedByCycle
                      ? `Bloqueado hasta ${formatDate(cycleEnd)}`
                      : loading && busyRole === plan.backendRole
                      ? 'Actualizando…'
                      : `Elegir ${plan.name}`}
                  </button>
                    )
                  })()
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AccountDashboardLayout>
  )
}
