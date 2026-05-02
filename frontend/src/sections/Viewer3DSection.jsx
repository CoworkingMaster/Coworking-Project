import { useState, useCallback, useEffect } from 'react'
import CoworkingScene from '../components/CoworkingScene'
import BookingPanel from '../components/BookingPanel'
import './Viewer3DSection.css'
import { apiFetch } from '../utils/api'

function getInitialBookingRangeISO() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(now.getHours(), 0, 0, 0)
  const end = new Date(start)
  end.setHours(start.getHours() + 2)
  return {
    startISO: start.toISOString().slice(0, 16),
    endISO: end.toISOString().slice(0, 16),
  }
}

const INITIAL_BOOKING = getInitialBookingRangeISO()

export default function Viewer3DSection({ onShowToast }) {
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [viewMode, setViewMode] = useState('3d')
  const [sceneKey, setSceneKey] = useState(0)
  const [occupiedSpaces, setOccupiedSpaces] = useState([])
  const [myReservations, setMyReservations] = useState([])
  const [reservationsInfo, setReservationsInfo] = useState([])
  const [bookingStart, setBookingStart] = useState(INITIAL_BOOKING.startISO)
  const [bookingEnd, setBookingEnd] = useState(INITIAL_BOOKING.endISO)


const fetchOccupied = (start, end) => {

  if(!start || !end) return

  apiFetch(`/api/reservations/occupied/?fecha_inicio=${start}&fecha_fin=${end}`)
    .then(res => {
      if (!res.ok) throw new Error()
      return res.json()
    })
    .then(data => {
      setOccupiedSpaces(Array.isArray(data?.occupied_spaces) ? data.occupied_spaces : [])
      setMyReservations(Array.isArray(data?.my_reservations) ? data.my_reservations : [])
      setReservationsInfo(Array.isArray(data?.reservations) ? data.reservations : [])
    })
    .catch(() => {})

}

  useEffect(() => {
    fetchOccupied(INITIAL_BOOKING.startISO, INITIAL_BOOKING.endISO)
  }, [])

  useEffect(() => {

  if(!bookingStart || !bookingEnd) return

  fetchOccupied(bookingStart, bookingEnd)

}, [bookingStart, bookingEnd])

  useEffect(() => {
    if (!bookingStart || !bookingEnd) return
    const interval = setInterval(() => {
      fetchOccupied(bookingStart, bookingEnd)
    }, 30000)
    return () => clearInterval(interval)
  }, [bookingStart, bookingEnd])

  const handleRoomSelect = useCallback((room) => {
    setSelectedRoom(room)
  }, [])

  const handlePanelClose = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  return (
    <section className="room3d-section" id="room3d">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Visor 3D</span>
          <h2 className="section-title">Explora y reserva tu espacio</h2>
          <p className="section-desc">
            Haz clic en cualquier sala o puesto para ver disponibilidad y reservar al instante.
          </p>
        </div>
      </div>

      <div className="viewer-wrapper">
        <div className="viewer-container">
          <div className="viewer-canvas">
            <CoworkingScene
              key={sceneKey}
              onRoomSelect={handleRoomSelect}
              selectedRoomId={selectedRoom?.id}
              occupiedSpaces={occupiedSpaces}
              myReservations={myReservations}
              reservationsInfo={reservationsInfo}
              viewMode={viewMode}
            />
          </div>

          {/* Controls */}
          <div className="viewer-controls">
            <button
              className="viewer-control-btn"
              title="Resetear vista"
              onClick={() => {
                setViewMode('3d')
                setSceneKey(k => k + 1)
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </button>
            <div className="control-divider" />
            <button
              className={`viewer-control-btn ${viewMode.startsWith('3d') ? 'active' : ''}`}
              onClick={() => setViewMode('3d')}
            >
              3D
            </button>
            <button
              className={`viewer-control-btn ${viewMode === 'top' ? 'active' : ''}`}
              onClick={() => setViewMode('top')}
            >
              2D
            </button>
          </div>

          {/* Legend */}
          <div className="viewer-legend">
            <div className="legend-item"><span className="legend-dot green" />Libre</div>
            <div className="legend-item"><span className="legend-dot red" />Ocupada</div>
            <div className="legend-item"><span className="legend-dot yellow" />Seleccionada</div>
          </div>

          {/* Instructions */}
          <div className="viewer-instructions">
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/></svg>
              Click izq. para rotar
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Scroll para zoom
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
              Click der. para mover
            </span>
            <span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8a6 6 0 0 0 6 6h2a5 5 0 0 0 5-5v-5a2 2 0 0 0-2-2 2 2 0 0 0-2 2"/></svg>
              Clic para seleccionar
            </span>
          </div>
        </div>

        <BookingPanel
          selectedRoom={selectedRoom}
          onClose={handlePanelClose}
          setBookingStart={setBookingStart}
          setBookingEnd={setBookingEnd}
          bookingStart={bookingStart}
          bookingEnd={bookingEnd}
          occupiedSpaces={occupiedSpaces}
          fetchOccupied={fetchOccupied}
          onShowToast={onShowToast}
        />
      </div>
    </section>
  )
}
