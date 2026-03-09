import { useState, useCallback, useMemo } from 'react'
import { Suspense } from 'react'
import CoworkingScene from '../components/CoworkingScene'
import BookingPanel from '../components/BookingPanel'
import './Viewer3DSection.css'

export default function Viewer3DSection({ onShowToast }) {
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [viewMode, setViewMode] = useState('3d')

  const handleRoomSelect = useCallback((room) => {
    setSelectedRoom(room)
  }, [])

  const handlePanelClose = useCallback(() => {
    setSelectedRoom(null)
  }, [])

  const handleBook = useCallback((roomName) => {
    onShowToast('¡Reserva confirmada!', `${roomName} ha sido reservada con éxito.`)
  }, [onShowToast])

  return (
    <section className="room3d-section" id="room3d">
      <div className="container">
        <div className="section-header">
          <span className="section-tag">Experiencia 3D</span>
          <h2 className="section-title">
            Explora antes de reservar.<br />
            <span className="text-muted">En tres dimensiones.</span>
          </h2>
          <p className="section-desc">
            Navega por nuestro coworking virtual. Haz clic en cualquier sala para ver su disponibilidad y reservar al instante.
          </p>
        </div>
      </div>

      <div className="viewer-wrapper">
        <div className="viewer-container">
          <div className="viewer-canvas">
            <Suspense fallback={<div className="viewer-loading">Cargando escena 3D...</div>}>
              <CoworkingScene
                onRoomSelect={handleRoomSelect}
                selectedRoomId={selectedRoom?.id}
                viewMode={viewMode}
              />
            </Suspense>
          </div>

          {/* Controls */}
          <div className="viewer-controls">
            <button
              className="viewer-control-btn"
              title="Resetear vista"
              onClick={() => setViewMode(v => v === '3d' ? '3d-reset' : '3d')}
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
            <div className="legend-item">
              <span className="legend-dot green" />
              Disponible
            </div>
            <div className="legend-item">
              <span className="legend-dot red" />
              Reservada
            </div>
            <div className="legend-item">
              <span className="legend-dot yellow" />
              Seleccionada
            </div>
          </div>

          {/* Instructions */}
          <div className="viewer-instructions">
            <span>🖱️ Arrastra para rotar</span>
            <span>🔍 Scroll para zoom</span>
            <span>👆 Clic en sala para seleccionar</span>
          </div>
        </div>

        <BookingPanel
          selectedRoom={selectedRoom}
          onClose={handlePanelClose}
          onBook={handleBook}
        />
      </div>
    </section>
  )
}
