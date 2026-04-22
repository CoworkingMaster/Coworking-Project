import { useState, useEffect } from "react"
import CoworkingScene from "../components/CoworkingScene"
import BookingPanel from "../components/BookingPanel"
import { apiFetch } from "../utils/api"

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

export default function Spaces({ onShowToast }) {

  const [selectedRoom, setSelectedRoom] = useState(null)
  const [occupiedSpaces, setOccupiedSpaces] = useState([])
  const [bookingStart, setBookingStart] = useState(INITIAL_BOOKING.startISO)
  const [bookingEnd, setBookingEnd] = useState(INITIAL_BOOKING.endISO)
  const [myReservations, setMyReservations] = useState([])
  const [reservationsInfo, setReservationsInfo] = useState([])

  const fetchOccupied = (start, end) => {
    if (!start || !end) return
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


  /* ---------- CARGA INICIAL ---------- */

  useEffect(() => {
    fetchOccupied(INITIAL_BOOKING.startISO, INITIAL_BOOKING.endISO)
  }, [])


  /* ---------- REFRESH AUTOMÁTICO ---------- */

  useEffect(() => {
    if (!bookingStart || !bookingEnd) return
    const interval = setInterval(() => {
      fetchOccupied(bookingStart, bookingEnd)
    }, 30000)
    return () => clearInterval(interval)
  }, [bookingStart, bookingEnd])


  return (

    <div style={{ height:"100vh", display:"flex", position:"relative" }}>

      {/* BARRA SUPERIOR */}

      <div
        style={{
          position:"absolute",
          top:20,
          left:"50%",
          transform:"translateX(-50%)",
          background:"rgba(255,255,255,0.9)",
          padding:"8px 16px",
          borderRadius:"10px",
          fontSize:"14px",
          fontWeight:500,
          zIndex:10
        }}
      >
        Mostrando disponibilidad

        {" "}
        {bookingStart?.replace("T"," ").slice(0,16)}

        {" - "}

        {bookingEnd?.slice(11,16)}

      </div>


      {/* ESCENA 3D */}

      <div style={{ flex:1 }}>

        <CoworkingScene
          viewMode="3d"
          onRoomSelect={setSelectedRoom}
          selectedRoomId={selectedRoom?.id}
          occupiedSpaces={occupiedSpaces}
          myReservations={myReservations}
          reservationsInfo={reservationsInfo}
        />

      </div>


      {/* PANEL DE RESERVA */}

      <BookingPanel
        selectedRoom={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        setBookingStart={setBookingStart}
        setBookingEnd={setBookingEnd}
        occupiedSpaces={occupiedSpaces}
        fetchOccupied={fetchOccupied}
        bookingStart={bookingStart}
        bookingEnd={bookingEnd}
        onShowToast={onShowToast}
      />

    </div>

  )
}