import { useState, useMemo, useEffect, useCallback } from "react"
import "./BookingPanel.css"
import { createReservation, apiFetch } from "../utils/api"

/* Slots horarios: cada número H representa el bloque H:00–H+1:00 */
const BOOKING_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
const WEEK_DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Construye un string ISO con el offset local del navegador.
 * Ej.: "2026-03-17T18:00+01:00"
 */
function localDateTimeStr(date, hour, minute = 0) {
  const d = new Date(date)
  d.setHours(hour, minute, 0, 0)
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')
  const mm = String(Math.abs(off) % 60).padStart(2, '0')
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(hour)}:${pad(minute)}${sign}${hh}:${mm}`
}

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export default function BookingPanel({
  selectedRoom,
  onClose,
  setBookingStart,
  setBookingEnd,
  occupiedSpaces,
  fetchOccupied,
  bookingStart,
  bookingEnd,
  onShowToast,
}) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  /* ── Estado del calendario ── */
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d
  })

  /* ── Selección de slots ── */
  const [slotStart, setSlotStart] = useState(null)
  const [slotEnd, setSlotEnd] = useState(null)

  /* ── Reservas del día para este espacio ── */
  const [dayReservations, setDayReservations] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [loading, setLoading] = useState(false)

  /* ── Fetch reservas del espacio en el día seleccionado ── */
  const fetchDayReservations = useCallback(async () => {
    if (!selectedRoom) return
    setLoadingSlots(true)
    try {
      const dayStart = localDateTimeStr(selectedDate, 0, 0)
      const dayEnd   = localDateTimeStr(selectedDate, 23, 59)
      const data = await apiFetch(
        `/api/reservations/occupied/?fecha_inicio=${encodeURIComponent(dayStart)}&fecha_fin=${encodeURIComponent(dayEnd)}`
      )
      const roomRes = (data.reservations || []).filter(
        r => Number(r.espacio) === Number(selectedRoom.id)
      )
      setDayReservations(roomRes)
    } catch {
      setDayReservations([])
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedRoom?.id, selectedDate])

  useEffect(() => { fetchDayReservations() }, [fetchDayReservations])

  /* Reset slots al cambiar sala o día */
  useEffect(() => {
    setSlotStart(null)
    setSlotEnd(null)
  }, [selectedRoom?.id, selectedDate.toISOString()])

  /* ── Horas ocupadas para el día seleccionado ── */
  const occupiedHours = useMemo(() => {
    const set = new Set()
    dayReservations.forEach(r => {
      const rStart = new Date(r.inicio)
      const rEnd   = new Date(r.fin)
      BOOKING_HOURS.forEach(h => {
        const sS = new Date(selectedDate); sS.setHours(h, 0, 0, 0)
        const sE = new Date(selectedDate); sE.setHours(h + 1, 0, 0, 0)
        if (rStart < sE && rEnd > sS) set.add(h)
      })
    })
    return set
  }, [dayReservations, selectedDate])

  /* ── Clic en un slot ── */
  const handleSlotClick = (h) => {
    if (occupiedHours.has(h)) return

    /* Sin selección o selección completa → empezar nueva */
    if (slotStart === null || slotEnd !== null) {
      setSlotStart(h); setSlotEnd(null); return
    }
    /* Mismo slot que el inicio → reserva de 1 hora */
    if (h === slotStart) {
      setSlotEnd(h); return
    }
    if (h > slotStart) {
      /* Verificar que no haya horas ocupadas en el rango */
      const blocked = BOOKING_HOURS
        .filter(hh => hh > slotStart && hh < h)
        .some(hh => occupiedHours.has(hh))
      if (blocked) { setSlotStart(h); setSlotEnd(null) }
      else          { setSlotEnd(h) }
    } else {
      /* Click por detrás del inicio → nuevo inicio */
      setSlotStart(h); setSlotEnd(null)
    }
  }

  /* ── Sincronizar con el estado padre ── */
  useEffect(() => {
    if (slotStart === null) return
    const endH = slotEnd !== null ? slotEnd + 1 : slotStart + 1
    setBookingStart(localDateTimeStr(selectedDate, slotStart))
    setBookingEnd  (localDateTimeStr(selectedDate, endH))
  }, [slotStart, slotEnd, selectedDate])

  /* ── Calendario: días del mes ── */
  const calDays = useMemo(() => {
    const y = calMonth.getFullYear(), m = calMonth.getMonth()
    const first = new Date(y, m, 1)
    const last  = new Date(y, m + 1, 0)
    let dow = first.getDay() - 1; if (dow < 0) dow = 6
    const days = []
    for (let i = dow; i > 0; i--) {
      const d = new Date(first); d.setDate(d.getDate() - i)
      days.push({ date: d, inMonth: false })
    }
    for (let d = 1; d <= last.getDate(); d++)
      days.push({ date: new Date(y, m, d), inMonth: true })
    while (days.length % 7 !== 0) {
      const prev = days[days.length - 1].date
      const next = new Date(prev); next.setDate(prev.getDate() + 1)
      days.push({ date: next, inMonth: false })
    }
    return days
  }, [calMonth])

  const monthLabel = calMonth.toLocaleString('es', { month: 'long', year: 'numeric' })
  const prevMonth  = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const nextMonth  = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  const selectDate = (date) => {
    if (date < today) return
    setSelectedDate(date)
    if (date.getMonth() !== calMonth.getMonth() || date.getFullYear() !== calMonth.getFullYear())
      setCalMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  /* ── Estado visual de cada slot ── */
  const getSlotState = (h) => {
    if (occupiedHours.has(h)) return 'occupied'
    if (h === slotStart || h === slotEnd) return 'selected'
    if (slotStart !== null && slotEnd !== null && h > slotStart && h < slotEnd) return 'range'
    return 'free'
  }

  const duration = slotEnd !== null ? slotEnd - slotStart + 1 : 0
  const total    = selectedRoom ? selectedRoom.priceNum * duration : 0
  const canBook  = slotStart !== null && slotEnd !== null

  const dateLabel = selectedDate.toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  /* ── Reservar ── */
  const handleReserve = async () => {
    if (!selectedRoom || !canBook || loading) return
    setLoading(true)
    try {
      await createReservation({
        espacio: selectedRoom.id,
        fecha_inicio: bookingStart,
        fecha_fin: bookingEnd,
        estado: "activa",
      })
      fetchOccupied(bookingStart, bookingEnd)
      onShowToast?.('Reserva confirmada', `${selectedRoom.name} reservada correctamente.`, 'success')
      setSlotStart(null)
      setSlotEnd(null)
      fetchDayReservations()
    } catch {
      onShowToast?.('Error al reservar', 'No se pudo completar la reserva. Inténtalo de nuevo.', 'error')
    } finally {
      setLoading(false)
    }
  }

  /* ═══════════════ UI ═══════════════ */
  return (
    <div className="viewer-panel">

      <div className="panel-header">
        <h3>{selectedRoom ? selectedRoom.name : "Selecciona un espacio"}</h3>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {!selectedRoom ? (
        <div className="panel-empty">
          <div className="panel-empty-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/>
              <rect x="9" y="13" width="6" height="8"/>
            </svg>
          </div>
          <p>Selecciona una sala o puesto en el mapa para ver disponibilidad y reservar</p>
        </div>
      ) : (
        <div className="panel-content">

          {/* ── Info compacta ── */}
          <div className="panel-info-compact">
            <div className="pic-badge pic-badge--cap">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              {selectedRoom.capacity}
            </div>
            <div className="pic-badge pic-badge--size">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              {selectedRoom.size}
            </div>
            <div className="pic-badge pic-badge--price">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              {selectedRoom.price}
            </div>
            <div className="pic-badge pic-badge--rating">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {selectedRoom.rating}
            </div>
          </div>

          <div className="panel-amenities">
            <div className="amenities-list">
              {selectedRoom.amenities.map((a, i) => (
                <span className="amenity-tag" key={i}>{a}</span>
              ))}
            </div>
          </div>

          {/* ── Sección de reserva ── */}
          <div className="panel-booking">

            {/* CALENDARIO */}
            <div className="cal-container">
              <div className="cal-header">
                <button className="cal-nav" onClick={prevMonth} aria-label="Mes anterior">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span className="cal-month-label">{monthLabel}</span>
                <button className="cal-nav" onClick={nextMonth} aria-label="Mes siguiente">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>

              <div className="cal-weekdays">
                {WEEK_DAYS.map(d => <span key={d}>{d}</span>)}
              </div>

              <div className="cal-grid">
                {calDays.map(({ date, inMonth }, i) => {
                  const isPast     = date < today
                  const isSelected = isSameDay(date, selectedDate)
                  const isToday    = isSameDay(date, today)
                  return (
                    <button
                      key={i}
                      className={[
                        'cal-day',
                        !inMonth  ? 'cal-day--faded'    : '',
                        isPast    ? 'cal-day--past'     : '',
                        isSelected? 'cal-day--selected' : '',
                        isToday && !isSelected ? 'cal-day--today' : '',
                      ].filter(Boolean).join(' ')}
                      disabled={isPast}
                      onClick={() => selectDate(date)}
                    >
                      {date.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SLOTS */}
            <div className="slots-section">
              <div className="slots-date-label">{dateLabel}</div>

              {loadingSlots ? (
                <div className="slots-loading">
                  <div className="slots-skeleton" />
                </div>
              ) : (
                <>
                  <div className="slots-legend">
                    <span className="slots-legend-item slots-legend-item--free">Libre</span>
                    <span className="slots-legend-item slots-legend-item--occupied">Ocupado</span>
                    <span className="slots-legend-item slots-legend-item--selected">Seleccionado</span>
                  </div>

                  <div className="slots-grid">
                    {BOOKING_HOURS.map(h => {
                      const state = getSlotState(h)
                      return (
                        <button
                          key={h}
                          className={`slot slot--${state}`}
                          disabled={state === 'occupied'}
                          onClick={() => handleSlotClick(h)}
                          title={state === 'occupied' ? 'Ocupado' : `${h}:00 – ${h + 1}:00`}
                        >
                          <span className="slot-hour">{h}<small>:00</small></span>
                        </button>
                      )
                    })}
                  </div>

                  {slotStart !== null && slotEnd === null && (
                    <p className="slots-hint">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Ahora elige la hora de fin
                    </p>
                  )}
                </>
              )}
            </div>

            {/* CONFIRMACIÓN */}
            <div className={`booking-confirm${canBook ? ' booking-confirm--active' : ''}`}>
              {canBook && (
                <div className="booking-summary-row">
                  <div className="booking-summary-time">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {slotStart}:00 → {slotEnd + 1}:00
                    <span className="booking-duration">{duration}h</span>
                  </div>
                  <div className="booking-summary-price">{total}€</div>
                </div>
              )}

              <button
                className="btn-primary btn-full"
                disabled={!canBook || loading}
                onClick={handleReserve}
              >
                {loading
                  ? "Reservando..."
                  : canBook
                  ? `Confirmar reserva · ${total}€`
                  : "Selecciona un horario"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}