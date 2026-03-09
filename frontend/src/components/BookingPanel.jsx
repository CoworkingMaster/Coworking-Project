import { useState, useMemo } from 'react'
import './BookingPanel.css'
import { createReservation } from '../utils/api'





export default function BookingPanel({ selectedRoom, onClose, onBook }) {
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0])
  const [startHour, setStartHour] = useState('10')
  const [endHour, setEndHour] = useState('12')

  const handleBooking = async () => {

  const reservation = {
    room: selectedRoom.name,
    date: bookingDate,
    start_hour: startHour,
    end_hour: endHour
  }

  try {

    const result = await createReservation(reservation)

    alert("Reserva creada correctamente")

  } catch (error) {

    console.error(error)
    alert("Error al crear la reserva")

  }
}

  const hours = useMemo(() => {
    const h = Math.max(parseInt(endHour) - parseInt(startHour), 1)
    return h
  }, [startHour, endHour])

  const total = useMemo(() => {
    if (!selectedRoom) return 0
    return selectedRoom.priceNum * hours
  }, [selectedRoom, hours])

  const timeOptions = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19']

  return (
    <div className="viewer-panel">
      <div className="panel-header">
        <h3>{selectedRoom ? selectedRoom.name : 'Selecciona una sala'}</h3>
        <button className="panel-close" onClick={onClose}>✕</button>
      </div>

      {!selectedRoom ? (
        <div className="panel-empty">
          <div className="panel-empty-icon">◈</div>
          <p>Haz clic en cualquier sala del modelo 3D para ver sus detalles y disponibilidad</p>
        </div>
      ) : (
        <div className="panel-content">
          {/* Status */}
          <div
            className="panel-room-status"
            style={{ background: selectedRoom.reserved ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)' }}
          >
            <span className={`status-dot ${selectedRoom.reserved ? 'red' : 'green'}`} />
            <span>{selectedRoom.reserved ? 'Reservada' : 'Disponible'}</span>
          </div>

          {/* Info grid */}
          <div className="panel-info-grid">
            <div className="panel-info-item">
              <span className="info-icon">👥</span>
              <div>
                <span className="info-label">Capacidad</span>
                <span className="info-value">{selectedRoom.capacity}</span>
              </div>
            </div>
            <div className="panel-info-item">
              <span className="info-icon">📏</span>
              <div>
                <span className="info-label">Tamaño</span>
                <span className="info-value">{selectedRoom.size}</span>
              </div>
            </div>
            <div className="panel-info-item">
              <span className="info-icon">💰</span>
              <div>
                <span className="info-label">Precio</span>
                <span className="info-value">{selectedRoom.price}</span>
              </div>
            </div>
            <div className="panel-info-item">
              <span className="info-icon">⭐</span>
              <div>
                <span className="info-label">Valoración</span>
                <span className="info-value">{selectedRoom.rating}</span>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="panel-amenities">
            <span className="info-label">Equipamiento</span>
            <div className="amenities-list">
              {selectedRoom.amenities.map((a, i) => (
                <span className="amenity-tag" key={i}>{a}</span>
              ))}
            </div>
          </div>

          {/* Booking form */}
          <div className="panel-booking">
            <span className="info-label">Reservar</span>
            <div className="booking-field">
              <label>Fecha</label>
              <input
                type="date"
                className="booking-input"
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
                  {timeOptions.slice(1).map(h => (
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
              disabled={selectedRoom.reserved}
              style={{ opacity: selectedRoom.reserved ? 0.5 : 1 }}
              onClick={async () => {
                const fechaInicio = `${bookingDate}T${startHour}:00:00`
                const fechaFin = `${bookingDate}T${endHour}:00:00`
                const reservation = {
                  espacio: selectedRoom.id,
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  estado: "activa"
                }
                try {
                  await createReservation(reservation)
                  alert("Reserva creada correctamente")
                } catch (error) {
                  console.error(error)
                  alert("Error al crear la reserva")
                }
              }}
            >
              {selectedRoom.reserved ? 'No disponible' : 'Reservar ahora'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
