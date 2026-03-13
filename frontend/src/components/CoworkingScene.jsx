import { useRef, useEffect, useMemo } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"
import { rooms, deskPositions, plantPositions } from "../data/rooms"

/* ───────── ROOM FURNITURE ───────── */

function RoomFurniture({ room, cx, cz }) {

  const numChairs = parseInt(room.capacity)
  const chairsPerSide = Math.ceil(numChairs / 2)
  const maxChairs = Math.min(chairsPerSide, 4)

  return (

    <group>

      {/* TABLE */}

      <mesh position={[cx, 0.75, cz]} castShadow receiveShadow>
        <boxGeometry args={[room.width * 0.6, 0.08, room.depth * 0.35]} />
        <meshStandardMaterial color="#d4a574" roughness={0.6} metalness={0.1}/>
      </mesh>

      {/* LEGS */}

      {[
        [cx - room.width * 0.25, 0.375, cz - room.depth * 0.14],
        [cx + room.width * 0.25, 0.375, cz - room.depth * 0.14],
        [cx - room.width * 0.25, 0.375, cz + room.depth * 0.14],
        [cx + room.width * 0.25, 0.375, cz + room.depth * 0.14],
      ].map(([x,y,z],i)=>(
        <mesh key={i} position={[x,y,z]} castShadow>
          <cylinderGeometry args={[0.04,0.04,0.75,8]}/>
          <meshStandardMaterial color="#3d3d3d"/>
        </mesh>
      ))}

      {/* CHAIRS */}

      {Array.from({ length:maxChairs },(_,i)=>{

        const offset =
          (i-(maxChairs-1)/2) *
          (room.width*0.5/maxChairs)

        return(

          <group key={i}>

            <mesh position={[cx+offset,0.45,cz-room.depth*0.28]} castShadow>
              <boxGeometry args={[0.4,0.05,0.4]}/>
              <meshStandardMaterial color="#3d3d3d"/>
            </mesh>

            {i < Math.min(numChairs - chairsPerSide,4) && (

              <mesh position={[cx+offset,0.45,cz+room.depth*0.28]} castShadow>
                <boxGeometry args={[0.4,0.05,0.4]}/>
                <meshStandardMaterial color="#3d3d3d"/>
              </mesh>

            )}

          </group>

        )

      })}

    </group>

  )

}

/* ───────── ROOM ───────── */

function Room({ room, isSelected, onClick, occupied, mine, reservation, count }) {

  const color =
    isSelected
      ? "#ff9500"
      : mine
      ? "#007aff"
      : count > 2
      ? "#ff3b30"
      : count > 0
      ? "#ffd60a"
      : "#34c759"

  const hw = room.width / 2
  const hd = room.depth / 2
  const cx = room.position.x
  const cz = room.position.z
  const wallH = 2.8

  const glassMat = useMemo(()=>({
    color,
    transparent:true,
    opacity:isSelected ? 0.35 : 0.15
  }),[color,isSelected])

  return(

    <group onClick={(e)=>{e.stopPropagation();onClick(room)}}>

      {/* FLOOR */}

      <mesh position={[cx,0.05,cz]} receiveShadow>
        <boxGeometry args={[room.width,0.08,room.depth]}/>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.6 : 0.35}
        />
      </mesh>

      {/* WALLS */}

      <mesh position={[cx,wallH/2,cz-hd]}>
        <boxGeometry args={[room.width,wallH,0.08]}/>
        <meshStandardMaterial {...glassMat}/>
      </mesh>

      <mesh position={[cx,wallH/2,cz+hd]}>
        <boxGeometry args={[room.width,wallH,0.08]}/>
        <meshStandardMaterial {...glassMat}/>
      </mesh>

      <mesh position={[cx-hw,wallH/2,cz]}>
        <boxGeometry args={[0.08,wallH,room.depth]}/>
        <meshStandardMaterial {...glassMat}/>
      </mesh>

      <mesh position={[cx+hw,wallH/2,cz]}>
        <boxGeometry args={[0.08,wallH,room.depth]}/>
        <meshStandardMaterial {...glassMat}/>
      </mesh>

      {/* FURNITURE */}

      <RoomFurniture room={room} cx={cx} cz={cz}/>

      {/* LABEL */}

      <Html position={[cx,3.8,cz]} center>

        <div style={{
          background:"rgba(0,0,0,0.7)",
          color:"white",
          padding:"4px 8px",
          borderRadius:"6px",
          fontSize:"11px"
        }}>

          {mine ? "🔵 Tu reserva" : occupied ? "🔴 Reservada" : "🟢 Disponible"}

          {reservation && (
            <div style={{fontSize:"10px"}}>
              {new Date(reservation.inicio).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
              {" - "}
              {new Date(reservation.fin).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
            </div>
          )}

        </div>

      </Html>

    </group>

  )

}

/* ───────── DESK ───────── */

function Desk({ desk, onClick, isSelected, mine, occupied }) {

  const color =
    isSelected
      ? "#ff9500"
      : mine
      ? "#007aff"
      : occupied
      ? "#ff453a"
      : "#30d158"

  return(

    <group onClick={(e)=>{e.stopPropagation();onClick(desk)}}>

      {/* AREA */}

      <mesh position={[desk.x,0.02,desk.z]}>
        <boxGeometry args={[1.4,0.04,0.9]}/>
        <meshStandardMaterial color={color} transparent opacity={0.35}/>
      </mesh>

      {/* TABLE */}

      <mesh position={[desk.x,0.75,desk.z]}>
        <boxGeometry args={[1.2,0.05,0.7]}/>
        <meshStandardMaterial color="#d4a574"/>
      </mesh>

      {/* MONITOR */}

      <mesh position={[desk.x,1.1,desk.z-0.15]}>
        <boxGeometry args={[0.5,0.35,0.03]}/>
        <meshStandardMaterial color="#4d4d4d"/>
      </mesh>

      {/* CHAIR */}

      <mesh position={[desk.x,0.45,desk.z+0.4]}>
        <boxGeometry args={[0.4,0.05,0.4]}/>
        <meshStandardMaterial color="#3d3d3d"/>
      </mesh>

    </group>

  )

}

/* ───────── PLANT ───────── */

function Plant({ x,z }){

  return(

    <group>

      <mesh position={[x,0.15,z]}>
        <cylinderGeometry args={[0.2,0.15,0.3,12]}/>
        <meshStandardMaterial color="#c9b99a"/>
      </mesh>

      <mesh position={[x,0.65,z]}>
        <sphereGeometry args={[0.35,12,12]}/>
        <meshStandardMaterial color="#5a8a5a"/>
      </mesh>

    </group>

  )

}

/* ───────── CAMERA ───────── */

function CameraController({ viewMode }){

  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(()=>{

    if(!controlsRef.current) return

    const pos =
      viewMode==="top"
        ? new THREE.Vector3(0,28,0.01)
        : new THREE.Vector3(15,18,15)

    camera.position.copy(pos)

    controlsRef.current.target.set(0,0,0)
    controlsRef.current.update()

  },[viewMode,camera])

  return(
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      maxPolarAngle={Math.PI/2.2}
      minDistance={8}
      maxDistance={35}
    />
  )

}

/* ───────── SCENE ───────── */

function Scene({
  onRoomSelect,
  selectedRoomId,
  viewMode,
  occupiedSpaces=[],
  myReservations=[],
  reservationsInfo=[]
}){

  const occupied = Array.isArray(occupiedSpaces)?occupiedSpaces:[]
  const mine = Array.isArray(myReservations)?myReservations.map(Number):[]
  const reservations = Array.isArray(reservationsInfo)?reservationsInfo:[]

  const reservationCounts={}

  reservations.forEach(r=>{
    reservationCounts[r.espacio]=(reservationCounts[r.espacio]||0)+1
  })

  return(

    <>

      <ambientLight intensity={0.6}/>
      <directionalLight position={[10,20,10]} intensity={0.8}/>

      {/* FLOOR */}

      <mesh position={[0,-0.1,0]}>
        <boxGeometry args={[22,0.2,16]}/>
        <meshStandardMaterial color="#eae6e0"/>
      </mesh>

      {/* GRID */}

      <gridHelper
        args={[22,22,"#d8d4ce","#d8d4ce"]}
        position={[0,0.01,0]}
      />

      {/* ROOMS */}

      {rooms.map(room=>(
        <Room
          key={room.id}
          room={room}
          isSelected={selectedRoomId===room.id}
          onClick={onRoomSelect}
          occupied={occupied.includes(room.id)}
          mine={mine.includes(Number(room.id))}
          reservation={reservations.find(r=>Number(r.espacio)===Number(room.id))}
          count={reservationCounts[room.id]||0}
        />
      ))}

      {/* DESKS */}

      {deskPositions.map(desk=>(
        <Desk
          key={desk.id}
          desk={desk}
          onClick={onRoomSelect}
          isSelected={selectedRoomId===desk.id}
          mine={mine.includes(Number(desk.id))}
          occupied={occupied.includes(desk.id)}
        />
      ))}

      {/* PLANTS */}

      {plantPositions.map((p,i)=>(
        <Plant key={i} x={p.x} z={p.z}/>
      ))}

      <CameraController viewMode={viewMode}/>

    </>

  )

}

/* ───────── MAIN ───────── */

export default function CoworkingScene({
  viewMode,
  onRoomSelect,
  selectedRoomId,
  occupiedSpaces=[],
  myReservations=[],
  reservationsInfo=[]
}){

  return(

    <div style={{width:"100%",height:"100%"}}>

      <Canvas
        camera={{position:[15,18,15],fov:45}}
        shadows
      >

        <color attach="background" args={["#f5f5f0"]}/>

        <Scene
          onRoomSelect={onRoomSelect}
          selectedRoomId={selectedRoomId}
          occupiedSpaces={occupiedSpaces}
          myReservations={myReservations}
          reservationsInfo={reservationsInfo}
          viewMode={viewMode}
        />

      </Canvas>

    </div>

  )

}