import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function MiniRoom({ x, z, w, d, color }) {
  const wh = 1.8
  const glassMat = { color, transparent: true, opacity: 0.12, roughness: 0.1 }

  return (
    <group>
      {/* Floor */}
      <mesh position={[x, 0.1, z]}>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} />
      </mesh>
      {/* Walls */}
      <mesh position={[x, wh / 2, z - d / 2]}>
        <boxGeometry args={[w, wh, 0.05]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[x, wh / 2, z + d / 2]}>
        <boxGeometry args={[w, wh, 0.05]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[x - w / 2, wh / 2, z]}>
        <boxGeometry args={[0.05, wh, d]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
      <mesh position={[x + w / 2, wh / 2, z]}>
        <boxGeometry args={[0.05, wh, d]} />
        <meshStandardMaterial {...glassMat} />
      </mesh>
    </group>
  )
}

function MiniDesk({ x, z }) {
  return (
    <mesh position={[x, 0.5, z]} castShadow>
      <boxGeometry args={[0.7, 0.04, 0.4]} />
      <meshStandardMaterial color="#d4a574" />
    </mesh>
  )
}

function HeroScene() {
  const miniRooms = [
    { x: -3.5, z: -2, w: 2.5, d: 2, color: '#34c759' },
    { x: -3.5, z: 2, w: 2.5, d: 2.5, color: '#ff3b30' },
    { x: 3.5, z: -2, w: 2.5, d: 2.5, color: '#34c759' },
    { x: 3.5, z: 2, w: 2.5, d: 2.5, color: '#ff9500' },
  ]

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 5]} intensity={0.6} castShadow />

      {/* Floor */}
      <mesh receiveShadow>
        <boxGeometry args={[12, 0.15, 9]} />
        <meshStandardMaterial color="#eae6e0" roughness={0.8} />
      </mesh>

      {/* Rooms */}
      {miniRooms.map((r, i) => (
        <MiniRoom key={i} {...r} />
      ))}

      {/* Desks */}
      {Array.from({ length: 6 }, (_, i) => {
        const x = -1.2 + (i % 3) * 1.2
        const z = -0.8 + Math.floor(i / 3) * 1.6
        return <MiniDesk key={i} x={x} z={z} />
      })}

      <OrbitControls
        enableDamping
        autoRotate
        autoRotateSpeed={1.5}
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.5}
      />
    </>
  )
}

export default function HeroPreview3D() {
  return (
    <Canvas
      camera={{ position: [10, 12, 10], fov: 40 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#f5f5f0']} />
      <HeroScene />
    </Canvas>
  )
}
