import { useState, useMemo, useEffect } from "react"
import "./BookingPanel.css"
import { createReservation } from "../utils/api"

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

  const [bookingDate, setBookingDate] = useState(
    () => new Date().toISOString().split("T")[0]
  )

  const [startHour, setStartHour] = useState("10")
  const [endHour, setEndHour] = useState("12")
  const [loading, setLoading] = useState(false)

  /* ---------- RESERVAR ---------- */

  const handleReserve = async () => {

    if (!selectedRoom) return
    if (loading) return

    const reservation = {
      espacio: selectedRoom.id,
      fecha_inicio: bookingStart,
      fecha_fin: bookingEnd,
      estado: "activa"
    }

    setLoading(true)

    try {

      await createReservation(reservation)

      /* refresco inmediato del mapa */
      fetchOccupied(bookingStart, bookingEnd)

      onShowToast?.('Reserva confirmada', `${selectedRoom.name} reservada correctamente.`, 'success')

    } catch (error) {

      console.error(error)
      onShowToast?.('Error al reservar', 'No se pudo completar la reserva. Inténtalo de nuevo.', 'error')

    } finally {

      setLoading(false)

    }
  }

  /* ---------- ACTUALIZAR HORAS DEL MAPA ---------- */

  useEffect(() => {

    const fechaInicio = `${bookingDate}T${startHour}:00`
    const fechaFin = `${bookingDate}T${endHour}:00`

    setBookingStart(fechaInicio)
    setBookingEnd(fechaFin)

  }, [bookingDate, startHour, endHour])

  /* ---------- HORAS ---------- */

  const hours = useMemo(() => {

    const h = Math.max(parseInt(endHour) - parseInt(startHour), 1)
    return h

  }, [startHour, endHour])

  const total = useMemo(() => {

    if (!selectedRoom) return 0
    return selectedRoom.priceNum * hours

  }, [selectedRoom, hours])

  const timeOptions = [
    "08","09","10","11","12",
    "13","14","15","16","17","18","19"
  ]

  /* ---------- UI ---------- */

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
          <p>
            Selecciona una sala o puesto en el mapa
            para ver disponibilidad y reservar
          </p>
        </div>

      ) : (

        <div className="panel-content">

          <div
            className="panel-room-status"
            style={{
              background: selectedRoom.reserved
                ? "rgba(255, 59, 48, 0.1)"
                : "rgba(52, 199, 89, 0.1)"
            }}
          >
            <span className={`status-dot ${selectedRoom.reserved ? "red" : "green"}`} />
            <span>{selectedRoom.reserved ? "Reservada" : "Disponible"}</span>
          </div>

          <div className="panel-info-grid">

            <div className="panel-info-item">
              <span className="info-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <div>
                <span className="info-label">Capacidad</span>
                <span className="info-value">{selectedRoom.capacity}</span>
              </div>
            </div>

            <div className="panel-info-item">
              <span className="info-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 3H3v7h18V3ZM21 14H3v7h18v-7Z"/></svg>
              </span>
              <div>
                <span className="info-label">Tamaño</span>
                <span className="info-value">{selectedRoom.size}</span>
              </div>
            </div>

            <div className="panel-info-item">
              <span className="info-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              <div>
                <span className="info-label">Precio</span>
                <span className="info-value">{selectedRoom.price}</span>
              </div>
            </div>

            <div className="panel-info-item">
              <span className="info-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </span>
              <div>
                <span className="info-label">Valoración</span>
                <span className="info-value">{selectedRoom.rating}</span>
              </div>
            </div>

          </div>

          <div className="panel-amenities">
            <span className="info-label">Equipamiento</span>
            <div className="amenities-list">
              {selectedRoom.amenities.map((a, i) => (
                <span className="amenity-tag" key={i}>{a}</span>
              ))}
            </div>
          </div>

          <div className="panel-booking">

            <span className="info-label">Reservar</span>

            <div className="booking-field">
              <label>Fecha</label>
              <input
                type="date"
                className="booking-input"
                min={new Date().toISOString().split("T")[0]}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            <div className="booking-row">

              <div className="booking-field">
                <label>Hora inicio</label>
                <select
                  className="booking-input"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                >
                  {timeOptions.slice(0, -1).map(h => (
                    <option key={h} value={h}>{h}:00</option>
                  ))}
                </select>
              </div>

              <div className="booking-field">
                <label>Hora fin</label>
                <select
                  className="booking-input"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                >
                  {timeOptions
                    .filter(h => parseInt(h) > parseInt(startHour))
                    .map(h => (
                      <option key={h} value={h}>{h}:00</option>
                    ))}
                </select>
              </div>

            </div>

            <div className="booking-summary">
              <span>Total estimado</span>
              <span className="booking-total">{total}€</span>
            </div>

            <button
              className="btn-primary btn-full"
              disabled={occupiedSpaces?.includes(selectedRoom?.id) || loading}
              style={{
                opacity: occupiedSpaces?.includes(selectedRoom?.id) ? 0.5 : 1
              }}
              onClick={handleReserve}
            >
              {loading
                ? "Reservando..."
                : occupiedSpaces?.includes(selectedRoom?.id)
                ? "No disponible"
                : "Reservar ahora"}
            </button>

          </div>

        </div>
      )}
    </div>
  )
}