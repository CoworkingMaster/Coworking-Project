import './SpacesSection.css'
import { rooms, deskPositions } from '../data/rooms'

const innovation = rooms.find((room) => room.name === 'Sala Innovación')
const strategy = rooms.find((room) => room.name === 'Sala Estrategia')
const creative = rooms.find((room) => room.name === 'Sala Creativa')
const executive = rooms.find((room) => room.name === 'Sala Ejecutiva')
const booth = rooms.find((room) => room.name === 'Phone Booth 1')
const desk = deskPositions[0]

const spaces = [
  {
    title: 'Salas de reunión',
    kind: '4 salas disponibles',
    desc: 'Innovación, Estrategia, Creativa y Ejecutiva con equipamiento completo.',
    capacity: 'De 4 a 12 personas',
    price: 'Desde 15€/hora',
    tags: ['Pizarra', 'WiFi 6', 'Videoconferencia'],
    gradient: 'linear-gradient(140deg, #1f3b73 0%, #2d6ea3 55%, #57b9d9 100%)',
    large: true,
    badge: 'Espacios reales',
  },
  {
    title: innovation?.name || 'Sala Innovación',
    kind: innovation?.type || 'Sala pequeña',
    desc: `${innovation?.size || '15 m²'} · Ideal para reuniones rápidas de equipo.`,
    capacity: innovation?.capacity || '4 personas',
    price: innovation?.price || '15€/hora',
    tags: innovation?.amenities?.slice(0, 3) || ['Pizarra', 'WiFi 6', 'Enchufes'],
    gradient: 'linear-gradient(140deg, #0f766e 0%, #14b8a6 55%, #5eead4 100%)',
  },
  {
    title: strategy?.name || 'Sala Estrategia',
    kind: strategy?.type || 'Sala mediana',
    desc: `${strategy?.size || '25 m²'} · Preparada para reuniones de proyecto y cliente.`,
    capacity: strategy?.capacity || '8 personas',
    price: strategy?.price || '25€/hora',
    tags: strategy?.amenities?.slice(0, 3) || ['Proyector', 'Pizarra', 'WiFi 6'],
    gradient: 'linear-gradient(140deg, #7a3e0a 0%, #b45309 55%, #f59e0b 100%)',
  },
  {
    title: creative?.name || 'Sala Creativa',
    kind: creative?.type || 'Sala mediana',
    desc: `${creative?.size || '20 m²'} · Pensada para workshops y sesiones de ideación.`,
    capacity: creative?.capacity || '6 personas',
    price: creative?.price || '20€/hora',
    tags: creative?.amenities?.slice(0, 3) || ['TV 65"', 'Pizarra', 'WiFi 6'],
    gradient: 'linear-gradient(140deg, #4c1d95 0%, #6d28d9 55%, #a78bfa 100%)',
  },
  {
    title: executive?.name || 'Sala Ejecutiva',
    kind: executive?.type || 'Sala grande',
    desc: `${executive?.size || '35 m²'} · La opción premium para reuniones clave.`,
    capacity: executive?.capacity || '12 personas',
    price: executive?.price || '40€/hora',
    tags: executive?.amenities?.slice(0, 3) || ['Proyector', 'Pizarra', 'WiFi 6'],
    gradient: 'linear-gradient(140deg, #7f1d1d 0%, #b91c1c 55%, #fb7185 100%)',
  },
  {
    title: 'Phone Booths',
    kind: '2 cabinas privadas',
    desc: `${booth?.size || '3 m²'} · Llamadas o foco total sin interrupciones.`,
    capacity: booth?.capacity || '1 persona',
    price: booth?.price || '5€/hora',
    tags: booth?.amenities?.slice(0, 3) || ['WiFi 6', 'Enchufes', 'Aislamiento'],
    gradient: 'linear-gradient(140deg, #0f172a 0%, #334155 55%, #64748b 100%)',
  },
  {
    title: 'Puestos Flex',
    kind: `${deskPositions.length} puestos`,
    desc: `${desk?.size || '4 m²'} · Espacios individuales para trabajo diario.`,
    capacity: desk?.capacity || '1 persona',
    price: desk?.price || '3€/hora',
    tags: ['Monitor', 'WiFi 6', 'Enchufes'],
    gradient: 'linear-gradient(140deg, #14532d 0%, #15803d 55%, #4ade80 100%)',
  },
]


export default function SpacesSection() {
  return (
    <section className="spaces" id="spaces">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Nuestros espacios
            <br />
            <span className="text-muted">Las mismas salas que puedes reservar en el mapa</span>
          </h2>
        </div>
        <div className="spaces-grid">
          {spaces.map((space, i) => (
            <div className={`space-card ${space.large ? 'space-large' : ''}`} key={i}>
              <div className="space-image" style={{ background: space.gradient }}>
                {space.badge && <div className="space-badge">{space.badge}</div>}
                <div className="space-overlay">
                  <span className="space-kind">{space.kind}</span>
                  <h3>{space.title}</h3>
                  <p>{space.desc}</p>
                  <div className="space-tags">
                    {space.tags.map((tag) => (
                      <span className="space-tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="space-footer">
                    <span className="space-price">{space.price}</span>
                    <span className="space-capacity">{space.capacity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
