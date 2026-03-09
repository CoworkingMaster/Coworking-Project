import { useState } from "react"
import CoworkingScene from "../components/CoworkingScene"
import BookingPanel from "../components/BookingPanel"
import { createReservation } from "../utils/api"

export default function Spaces() {

  const [selectedRoom, setSelectedRoom] = useState(null)

  const handleBook = async (reservationData) => {
    try {

      await createReservation(reservationData)

      alert("Reserva creada correctamente")

    } catch (error) {

      console.error(error)
      alert("Error creando reserva")

    }
  }

  return (
    <div style={{ height: "100vh", display: "flex" }}>

      <div style={{ flex: 1 }}>
        <CoworkingScene
          onRoomSelect={setSelectedRoom}
          selectedRoomId={selectedRoom?.id}
        />
      </div>

      <BookingPanel
        selectedRoom={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onBook={handleBook}
      />

    </div>
  )
}