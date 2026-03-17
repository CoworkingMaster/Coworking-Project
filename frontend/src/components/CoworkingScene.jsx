import { useRef, useEffect, useMemo, useState } from "react"
import { Canvas, useThree, useFrame } from "@react-three/fiber"
import { OrbitControls, Html, RoundedBox, Environment } from "@react-three/drei"
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing"
import * as THREE from "three"
import { rooms, deskPositions, plantPositions } from "../data/rooms"

/* ───────── HANGING LAMP ───────── */

function HangingLamp({ x, z, color = "#fff8e7" }) {
  return (
    <group position={[x, 2.95, z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.6, 6]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[0, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.28, 0.2, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.48, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.5, 0]} intensity={3} distance={6} color={color} castShadow shadow-mapSize={512} />
    </group>
  )
}

/* ───────── WHITEBOARD ───────── */

function Whiteboard({ x, z, rotY = 0 }) {
  return (
    <group position={[x, 1.5, z]} rotation={[0, rotY, 0]}>
      <RoundedBox args={[1.2, 0.8, 0.04]} radius={0.02} castShadow>
        <meshStandardMaterial color="#f8f8f8" roughness={0.3} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[1.28, 0.88, 0.02]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

/* ───────── ROOM FURNITURE ───────── */

function RoomFurniture({ room, cx, cz }) {
  const numChairs = parseInt(room.capacity)
  const chairsPerSide = Math.ceil(numChairs / 2)
  const maxChairs = Math.min(chairsPerSide, 4)

  return (
    <group>
      {/* TABLE */}
      <RoundedBox
        args={[room.width * 0.6, 0.07, room.depth * 0.35]}
        radius={0.015}
        position={[cx, 0.76, cz]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#b8875a" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* TABLE LEGS (metal) */}
      {[
        [cx - room.width * 0.25, 0.38, cz - room.depth * 0.14],
        [cx + room.width * 0.25, 0.38, cz - room.depth * 0.14],
        [cx - room.width * 0.25, 0.38, cz + room.depth * 0.14],
        [cx + room.width * 0.25, 0.38, cz + room.depth * 0.14],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.72, 8]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}

      {/* CHAIRS */}
      {Array.from({ length: maxChairs }, (_, i) => {
        const offset = (i - (maxChairs - 1) / 2) * (room.width * 0.5 / maxChairs)
        return (
          <group key={`chair-${i}`}>
            {/* Front chair */}
            <Chair x={cx + offset} z={cz - room.depth * 0.28} rotY={0} />
            {/* Back chair (if enough capacity) */}
            {i < Math.min(numChairs - chairsPerSide, 4) && (
              <Chair x={cx + offset} z={cz + room.depth * 0.28} rotY={Math.PI} />
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ───────── CHAIR ───────── */

function Chair({ x, z, rotY = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* Seat */}
      <RoundedBox args={[0.38, 0.05, 0.38]} radius={0.02} position={[0, 0.46, 0]} castShadow>
        <meshStandardMaterial color="#2c2c2c" roughness={0.8} metalness={0.1} />
      </RoundedBox>
      {/* Backrest */}
      <RoundedBox args={[0.36, 0.35, 0.04]} radius={0.02} position={[0, 0.7, -0.17]} castShadow>
        <meshStandardMaterial color="#2c2c2c" roughness={0.8} metalness={0.1} />
      </RoundedBox>
      {/* Legs */}
      {[[-0.14, 0.23, -0.14], [0.14, 0.23, -0.14], [-0.14, 0.23, 0.14], [0.14, 0.23, 0.14]].map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz]} castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.44, 6]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────── ROOM ───────── */

function Room({ room, isSelected, onClick, occupied, mine, reservation, count }) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef()

  const color =
    isSelected ? "#ff9500"
    : mine ? "#007aff"
    : count > 2 ? "#ff3b30"
    : count > 0 ? "#ffd60a"
    : "#34c759"

  const hw = room.width / 2
  const hd = room.depth / 2
  const cx = room.position.x
  const cz = room.position.z
  const wallH = 2.8

  useFrame(() => {
    if (!groupRef.current) return
    const target = hovered || isSelected ? 1.015 : 1
    groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, target, 0.1)
    groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, target, 0.1)
  })

  const glassMat = useMemo(() => ({
    color,
    transparent: true,
    opacity: isSelected ? 0.28 : 0.12,
    roughness: 0.05,
    metalness: 0.1,
    envMapIntensity: 1.5,
  }), [color, isSelected])

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick(room) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* FLOOR */}
      <mesh position={[cx, 0.06, cz]} receiveShadow>
        <boxGeometry args={[room.width, 0.06, room.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.5 : 0.25}
          roughness={0.4}
        />
      </mesh>

      {/* GLASS WALLS – MeshPhysicalMaterial for refraction */}
      {[
        { pos: [cx, wallH / 2, cz - hd], args: [room.width, wallH, 0.06] },
        { pos: [cx, wallH / 2, cz + hd], args: [room.width, wallH, 0.06] },
        { pos: [cx - hw, wallH / 2, cz], args: [0.06, wallH, room.depth] },
        { pos: [cx + hw, wallH / 2, cz], args: [0.06, wallH, room.depth] },
      ].map(({ pos, args }, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={args} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={isSelected ? 0.3 : 0.12}
            roughness={0.05}
            metalness={0.1}
            transmission={0.6}
            thickness={0.5}
            ior={1.5}
            envMapIntensity={2}
          />
        </mesh>
      ))}

      {/* WALL FRAME (metal edges) */}
      {[
        [cx - hw, wallH, cz - hd], [cx + hw, wallH, cz - hd],
        [cx - hw, wallH, cz + hd], [cx + hw, wallH, cz + hd],
      ].map(([fx, fy, fz], i) => (
        <mesh key={`frame-v-${i}`} position={[fx, fy / 2, fz]}>
          <boxGeometry args={[0.04, fy, 0.04]} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* TOP FRAME */}
      {[
        { pos: [cx, wallH, cz - hd], args: [room.width + 0.04, 0.04, 0.04] },
        { pos: [cx, wallH, cz + hd], args: [room.width + 0.04, 0.04, 0.04] },
        { pos: [cx - hw, wallH, cz], args: [0.04, 0.04, room.depth + 0.04] },
        { pos: [cx + hw, wallH, cz], args: [0.04, 0.04, room.depth + 0.04] },
      ].map(({ pos, args }, i) => (
        <mesh key={`frame-t-${i}`} position={pos}>
          <boxGeometry args={args} />
          <meshStandardMaterial color="#aaa" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* FURNITURE */}
      <RoomFurniture room={room} cx={cx} cz={cz} />

      {/* LAMP */}
      <HangingLamp x={cx} z={cz} color="#fff3d4" />

      {/* LABEL */}
      <Html position={[cx, 3.8, cz]} center distanceFactor={18}>
        <div className="scene-label" data-status={mine ? "mine" : occupied ? "occupied" : "free"}>
          <span className="scene-label-dot" />
          <span className="scene-label-name">{room.name}</span>
        </div>
      </Html>
    </group>
  )
}

/* ───────── DESK ───────── */

function Desk({ desk, onClick, isSelected, mine, occupied }) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef()

  const color =
    isSelected ? "#ff9500"
    : mine ? "#007aff"
    : occupied ? "#ff453a"
    : "#30d158"

  useFrame(() => {
    if (!groupRef.current) return
    const target = hovered || isSelected ? 1.04 : 1
    groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, target, 0.1)
    groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, target, 0.1)
  })

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick(desk) }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* AREA */}
      <mesh position={[desk.x, 0.02, desk.z]} receiveShadow>
        <boxGeometry args={[1.4, 0.03, 0.9]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} roughness={0.6} />
      </mesh>

      {/* TABLE */}
      <RoundedBox args={[1.15, 0.05, 0.65]} radius={0.01} position={[desk.x, 0.76, desk.z]} castShadow receiveShadow>
        <meshStandardMaterial color="#b8875a" roughness={0.45} metalness={0.05} />
      </RoundedBox>

      {/* TABLE LEGS */}
      {[[-0.5, 0.38, -0.25], [0.5, 0.38, -0.25], [-0.5, 0.38, 0.25], [0.5, 0.38, 0.25]].map(([lx, ly, lz], i) => (
        <mesh key={i} position={[desk.x + lx, ly, desk.z + lz]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.72, 6]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}

      {/* MONITOR STAND */}
      <mesh position={[desk.x, 0.84, desk.z - 0.15]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.06, 12]} />
        <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[desk.x, 0.92, desk.z - 0.15]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
        <meshStandardMaterial color="#444" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* MONITOR SCREEN */}
      <RoundedBox args={[0.52, 0.32, 0.02]} radius={0.008} position={[desk.x, 1.14, desk.z - 0.15]} castShadow>
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.2} />
      </RoundedBox>
      {/* Screen glow */}
      <mesh position={[desk.x, 1.14, desk.z - 0.135]}>
        <planeGeometry args={[0.46, 0.26]} />
        <meshStandardMaterial color="#d4eaff" emissive="#a0c8ff" emissiveIntensity={0.5} toneMapped={false} />
      </mesh>

      {/* CHAIR */}
      <Chair x={desk.x} z={desk.z + 0.45} rotY={0} />
    </group>
  )
}

/* ───────── PLANT ───────── */

function Plant({ x, z }) {
  const plantRef = useRef()

  useFrame(({ clock }) => {
    if (!plantRef.current) return
    plantRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.8 + x) * 0.02
    plantRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.6 + z) * 0.015
  })

  return (
    <group ref={plantRef}>
      {/* Pot */}
      <mesh position={[x, 0.18, z]} castShadow>
        <cylinderGeometry args={[0.18, 0.13, 0.36, 16]} />
        <meshStandardMaterial color="#c4956a" roughness={0.85} />
      </mesh>
      {/* Soil */}
      <mesh position={[x, 0.37, z]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
        <meshStandardMaterial color="#5a3e2b" roughness={1} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[x, 0.72, z]} castShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#3d7a3d" roughness={0.9} />
      </mesh>
      <mesh position={[x + 0.1, 0.85, z - 0.05]} castShadow>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color="#4a9a4a" roughness={0.9} />
      </mesh>
      <mesh position={[x - 0.08, 0.9, z + 0.08]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial color="#55aa55" roughness={0.9} />
      </mesh>
      {/* Trunk */}
      <mesh position={[x, 0.5, z]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.3, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ───────── BOOKSHELF ───────── */

function Bookshelf({ x, z, rotY = 0 }) {
  const books = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      h: 0.18 + Math.random() * 0.12,
      color: ["#c0392b", "#2980b9", "#27ae60", "#f39c12", "#8e44ad", "#1abc9c", "#e74c3c", "#3498db"][i],
      x: -0.28 + i * 0.08,
    })), [])

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <RoundedBox args={[0.8, 1.2, 0.28]} radius={0.02} position={[0, 0.6, 0]} castShadow>
        <meshStandardMaterial color="#b8875a" roughness={0.6} metalness={0.05} />
      </RoundedBox>
      {/* Shelf boards */}
      {[0.35, 0.7, 1.05].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.72, 0.03, 0.22]} />
          <meshStandardMaterial color="#a07040" roughness={0.6} />
        </mesh>
      ))}
      {/* Books on middle shelf */}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, 0.45 + b.h / 2, 0]}>
          <boxGeometry args={[0.06, b.h, 0.16]} />
          <meshStandardMaterial color={b.color} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/* ───────── CAMERA ───────── */

function CameraController({ viewMode }) {
  const { camera } = useThree()
  const controlsRef = useRef()
  const targetPos = useRef(new THREE.Vector3(15, 18, 15))
  const animating = useRef(false)

  useEffect(() => {
    targetPos.current = viewMode === "top"
      ? new THREE.Vector3(0, 28, 0.01)
      : new THREE.Vector3(15, 18, 15)
    animating.current = true
  }, [viewMode])

  useFrame(() => {
    if (!animating.current) return
    camera.position.lerp(targetPos.current, 0.06)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.06)
      controlsRef.current.update()
    }
    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      animating.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.1}
      /* zoom */
      enableZoom
      zoomSpeed={1.2}
      minDistance={5}
      maxDistance={50}
      /* pan con click derecho o dos dedos */
      enablePan
      panSpeed={1.0}
      screenSpacePanning={false}
      keyPanSpeed={12}
      /* rotación */
      enableRotate
      rotateSpeed={0.6}
      maxPolarAngle={Math.PI / 2.05}
      /* límites de encuadre */
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}
    />
  )
}

/* ───────── SCENE ───────── */

function Scene({
  onRoomSelect,
  selectedRoomId,
  viewMode,
  occupiedSpaces = [],
  myReservations = [],
  reservationsInfo = [],
}) {
  const occupied = Array.isArray(occupiedSpaces) ? occupiedSpaces : []
  const mine = Array.isArray(myReservations) ? myReservations.map(Number) : []
  const reservations = Array.isArray(reservationsInfo) ? reservationsInfo : []

  const reservationCounts = {}
  reservations.forEach(r => {
    reservationCounts[r.espacio] = (reservationCounts[r.espacio] || 0) + 1
  })

  return (
    <>
      {/* ─── LIGHTING ─── */}
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#b1e1ff", "#b97a20", 0.4]} />

      <directionalLight
        position={[12, 22, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-8, 10, -8]} intensity={0.3} />

      {/* ─── ENVIRONMENT ─── */}
      <Environment preset="apartment" background={false} environmentIntensity={0.3} />

      {/* ─── MAIN FLOOR ─── */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[60, 0.1, 60]} />
        <meshStandardMaterial color="#d9d0c4" roughness={0.75} metalness={0.02} />
      </mesh>

      {/* ─── ROOMS ─── */}
      {rooms.map(room => (
        <Room
          key={room.id}
          room={room}
          isSelected={selectedRoomId === room.id}
          onClick={onRoomSelect}
          occupied={occupied.includes(room.id)}
          mine={mine.includes(Number(room.id))}
          reservation={reservations.find(r => Number(r.espacio) === Number(room.id))}
          count={reservationCounts[room.id] || 0}
        />
      ))}

      {/* ─── DESKS ─── */}
      {deskPositions.map(desk => (
        <Desk
          key={desk.id}
          desk={desk}
          onClick={onRoomSelect}
          isSelected={selectedRoomId === desk.id}
          mine={mine.includes(Number(desk.id))}
          occupied={occupied.includes(desk.id)}
        />
      ))}

      {/* ─── PLANTS ─── */}
      {plantPositions.map((p, i) => (
        <Plant key={i} x={p.x} z={p.z} />
      ))}

      {/* ─── DECORATION ─── */}
      <Bookshelf x={-10} z={0} rotY={Math.PI / 2} />
      <Bookshelf x={10} z={0} rotY={-Math.PI / 2} />
      <Whiteboard x={-6} z={-4.7} rotY={0} />
      <Whiteboard x={6} z={-4.9} rotY={0} />

      {/* ─── ZONE LABEL SIGNS ─── */}
      <Html position={[-0.2, 0.05, -3.6]} center>
        <div className="scene-zone-label">Open Space</div>
      </Html>
      <Html position={[-6, 0.05, 0]} center>
        <div className="scene-zone-label">Salas</div>
      </Html>
      <Html position={[6, 0.05, 0]} center>
        <div className="scene-zone-label">Salas</div>
      </Html>

      <CameraController viewMode={viewMode} />
    </>
  )
}

/* ───────── MAIN ───────── */

export default function CoworkingScene({
  viewMode,
  onRoomSelect,
  selectedRoomId,
  occupiedSpaces = [],
  myReservations = [],
  reservationsInfo = [],
}) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [15, 18, 15], fov: 45 }}
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
      >
        <color attach="background" args={["#d9d0c4"]} />

        <Scene
          onRoomSelect={onRoomSelect}
          selectedRoomId={selectedRoomId}
          occupiedSpaces={occupiedSpaces}
          myReservations={myReservations}
          reservationsInfo={reservationsInfo}
          viewMode={viewMode}
        />

        {/* ─── POST-PROCESSING ─── */}
        <EffectComposer multisampling={4}>
          <Bloom luminanceThreshold={0.88} luminanceSmoothing={0.4} intensity={0.25} />
          <Vignette offset={0.3} darkness={0.4} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}