import { useRef, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { rooms, deskPositions, plantPositions } from '../data/rooms'
import BookingPanel from "./BookingPanel"
import { useState } from "react"
import { createReservation } from "../utils/api"

/* ─── Room Component ─── */
function Room({ room, isSelected, onClick }) {
  const color = isSelected ? '#ff9500' : room.reserved ? '#ff3b30' : '#34c759'
  const hw = room.width / 2
  const hd = room.depth / 2
  const cx = room.position.x
  const cz = room.position.z
  const wallH = 2.8

  const glassMat = useMemo(() => ({
    color,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: isSelected ? 0.35 : 0.15,
  }), [color, isSelected])

  const frameMat = useMemo(() => ({
    color,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity: 0.6,
  }), [color])

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(room) }}>
      {/* Room floor */}
      <mesh position={[cx, 0.05, cz]} receiveShadow>
        <boxGeometry args={[room.width, 0.08, room.depth]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} transparent opacity={isSelected ? 0.6 : 0.35} />
      </mesh>

      {/* Glass walls */}
      <mesh position={[cx, wallH / 2, cz - hd]} castShadow>
        <boxGeometry args={[room.width, wallH, 0.08]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[cx, wallH / 2, cz + hd]} castShadow>
        <boxGeometry args={[room.width, wallH, 0.08]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[cx - hw, wallH / 2, cz]} castShadow>
        <boxGeometry args={[0.08, wallH, room.depth]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[cx + hw, wallH / 2, cz]} castShadow>
        <boxGeometry args={[0.08, wallH, room.depth]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>

      {/* Top frame */}
      {[
        [room.width + 0.1, 0.06, 0.06, cx, wallH, cz - hd],
        [room.width + 0.1, 0.06, 0.06, cx, wallH, cz + hd],
        [0.06, 0.06, room.depth + 0.1, cx - hw, wallH, cz],
        [0.06, 0.06, room.depth + 0.1, cx + hw, wallH, cz],
      ].map(([w, h, d, x, y, z], i) => (
        <mesh key={`frame-${i}`} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial {...frameMat} />
        </mesh>
      ))}

      {/* Furniture */}
      {room.type !== 'Phone Booth' ? (
        <RoomFurniture room={room} cx={cx} cz={cz} />
      ) : (
        <PhoneBoothFurniture cx={cx} cz={cz} />
      )}

      {/* Room label */}
      <Html position={[cx, 3.2, cz]} center style={{ pointerEvents: 'none' }}>
        <div style={{
          fontSize: '11px', fontWeight: 500, color: '#6e6e73',
          whiteSpace: 'nowrap', userSelect: 'none',
          fontFamily: 'Inter, sans-serif',
        }}>
          {room.name}
        </div>
      </Html>
    </group>
  )
}

/* ─── Room Furniture ─── */
function RoomFurniture({ room, cx, cz }) {
  const numChairs = parseInt(room.capacity)
  const chairsPerSide = Math.ceil(numChairs / 2)
  const maxChairs = Math.min(chairsPerSide, 4)

  return (
    <group>
      {/* Table */}
      <mesh position={[cx, 0.75, cz]} castShadow receiveShadow>
        <boxGeometry args={[room.width * 0.6, 0.08, room.depth * 0.35]} />
        <meshStandardMaterial color="#d4a574" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Table legs */}
      {[
        [cx - room.width * 0.25, 0.375, cz - room.depth * 0.14],
        [cx + room.width * 0.25, 0.375, cz - room.depth * 0.14],
        [cx - room.width * 0.25, 0.375, cz + room.depth * 0.14],
        [cx + room.width * 0.25, 0.375, cz + room.depth * 0.14],
      ].map(([x, y, z], i) => (
        <mesh key={`leg-${i}`} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.75, 8]} />
          <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Chairs */}
      {Array.from({ length: maxChairs }, (_, i) => {
        const offset = (i - (maxChairs - 1) / 2) * (room.width * 0.5 / maxChairs)
        return (
          <group key={`chair-${i}`}>
            <mesh position={[cx + offset, 0.45, cz - room.depth * 0.28]} castShadow>
              <boxGeometry args={[0.4, 0.05, 0.4]} />
              <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
            </mesh>
            {i < Math.min(numChairs - chairsPerSide, 4) && (
              <mesh position={[cx + offset, 0.45, cz + room.depth * 0.28]} castShadow>
                <boxGeometry args={[0.4, 0.05, 0.4]} />
                <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
              </mesh>
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ─── Phone Booth Furniture ─── */
function PhoneBoothFurniture({ cx, cz }) {
  return (
    <group>
      <mesh position={[cx, 0.75, cz - 0.3]} castShadow>
        <boxGeometry args={[0.8, 0.06, 0.4]} />
        <meshStandardMaterial color="#d4a574" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[cx, 0.225, cz + 0.2]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.45, 12]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

/* ─── Desk Component ─── */
function Desk({ x, z, occupied }) {
  return (
    <group>
      <mesh position={[x, 0.75, z]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.05, 0.7]} />
        <meshStandardMaterial color="#d4a574" roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Legs */}
      {[[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]].map(([dx, dz], i) => (
        <mesh key={i} position={[x + dx, 0.375, z + dz]}>
          <cylinderGeometry args={[0.025, 0.025, 0.75, 6]} />
          <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[x, 1.1, z - 0.15]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshStandardMaterial color={occupied ? '#3d3d3d' : '#4d4d4d'} roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[x, 0.88, z - 0.15]}>
        <cylinderGeometry args={[0.02, 0.04, 0.2, 8]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Screen glow */}
      {occupied && (
        <mesh position={[x, 1.1, z - 0.13]}>
          <planeGeometry args={[0.45, 0.3]} />
          <meshBasicMaterial color="#4facfe" transparent opacity={0.3} />
        </mesh>
      )}
      {/* Chair */}
      <mesh position={[x, 0.45, z + 0.4]} castShadow>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#3d3d3d" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  )
}

/* ─── Plant Component ─── */
function Plant({ x, z }) {
  return (
    <group>
      <mesh position={[x, 0.15, z]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.3, 12]} />
        <meshStandardMaterial color="#c9b99a" roughness={0.8} />
      </mesh>
      <mesh position={[x, 0.65, z]} castShadow>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ─── Camera Controller ─── */
function CameraController({ viewMode }) {
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (!controlsRef.current) return

    const duration = 1000
    const startTime = Date.now()
    const startPos = camera.position.clone()
    const startTarget = controlsRef.current.target.clone()

    let targetPos, targetLook
    if (viewMode === 'top') {
      targetPos = new THREE.Vector3(0, 28, 0.01)
      targetLook = new THREE.Vector3(0, 0, 0)
    } else {
      targetPos = new THREE.Vector3(15, 18, 15)
      targetLook = new THREE.Vector3(0, 0, 0)
    }

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    let frameId
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeInOutCubic(progress)

      camera.position.lerpVectors(startPos, targetPos, eased)
      controlsRef.current.target.lerpVectors(startTarget, targetLook, eased)
      controlsRef.current.update()

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    animate()
    return () => cancelAnimationFrame(frameId)
  }, [viewMode, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={8}
      maxDistance={35}
    />
  )
}

/* ─── Main Scene ─── */
function Scene({ onRoomSelect, selectedRoomId, viewMode }) {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-8, 10, -8]} intensity={0.3} color="#e8e0d8" />
      <hemisphereLight args={['#ffffff', '#e8e0d8', 0.3]} />

      {/* Floor */}
      <mesh position={[0, -0.1, 0]} receiveShadow>
        <boxGeometry args={[22, 0.2, 16]} />
        <meshStandardMaterial color="#eae6e0" roughness={0.8} metalness={0} />
      </mesh>

      {/* Grid */}
      <gridHelper
        args={[22, 22, '#d8d4ce', '#d8d4ce']}
        position={[0, 0.01, 0]}
        material-opacity={0.3}
        material-transparent
      />

      {/* Outer walls */}
      {[
        [22, 3.5, 0.15, 0, 1.75, -8],
        [22, 3.5, 0.15, 0, 1.75, 8],
        [0.15, 3.5, 16, -11, 1.75, 0],
        [0.15, 3.5, 16, 11, 1.75, 0],
      ].map(([w, h, d, x, y, z], i) => (
        <mesh key={`wall-${i}`} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#f2efea" roughness={0.9} metalness={0} transparent opacity={0.4} />
        </mesh>
      ))}

      {/* Rooms */}
      {rooms.map(room => (
        <Room
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          onClick={onRoomSelect}
        />
      ))}

      {/* Desks */}
      {deskPositions.map((d, i) => (
        <Desk key={`desk-${i}`} x={d.x} z={d.z} occupied={d.occupied} />
      ))}

      {/* Plants */}
      {plantPositions.map((p, i) => (
        <Plant key={`plant-${i}`} x={p.x} z={p.z} />
      ))}

      {/* Coffee area */}
      <mesh position={[8.5, 0.5, -6.5]} castShadow>
        <boxGeometry args={[2.5, 1, 0.6]} />
        <meshStandardMaterial color="#8b6f4e" roughness={0.5} />
      </mesh>

      {/* Labels */}
      <Html position={[8.5, 1.8, -6.5]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6e6e73', whiteSpace: 'nowrap', userSelect: 'none', fontFamily: 'Inter, sans-serif' }}>
          ☕ Zona Café
        </div>
      </Html>
      <Html position={[0, 3.8, 0.5]} center style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#6e6e73', whiteSpace: 'nowrap', userSelect: 'none', fontFamily: 'Inter, sans-serif' }}>
          Zona de Trabajo
        </div>
      </Html>

      <CameraController viewMode={viewMode} />
      <fog attach="fog" args={['#f5f5f0', 25, 45]} />
    </>
  )
}

export default function CoworkingScene({ viewMode }) {

  const [selectedRoom, setSelectedRoom] = useState(null)

  const handleRoomSelect = (room) => {
    setSelectedRoom(room)
  }

  const handleBook = async (reservationData) => {
    try {
      await createReservation(reservationData)
      alert("Reserva creada correctamente")
    } catch (error) {
      console.error(error)
      alert("Error al crear reserva")
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>

      <Canvas
        camera={{ position: [15, 18, 15], fov: 45, near: 0.1, far: 100 }}
        shadows
        style={{ width: '100%', height: '100%' }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >

        <color attach="background" args={['#f5f5f0']} />

        <Scene
          onRoomSelect={handleRoomSelect}
          selectedRoomId={selectedRoom?.id}
          viewMode={viewMode}
        />

      </Canvas>

      <BookingPanel
        selectedRoom={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onBook={handleBook}
      />

    </div>
  )
}