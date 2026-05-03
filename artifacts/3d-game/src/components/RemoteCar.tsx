import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { RemotePlayer } from '../hooks/useMultiplayer'

const CAR_Y      = 0.42
const LERP_POS   = 0.14
const LERP_ANGLE = 0.18

export function RemoteCar({ player }: { player: RemotePlayer }) {
  const groupRef = useRef<THREE.Group>(null)
  const curAngle = useRef(player.angle)
  const curPos   = useRef(new THREE.Vector3(player.x, CAR_Y, player.z))
  const targetP  = useRef(new THREE.Vector3(player.x, CAR_Y, player.z))

  targetP.current.set(player.x, CAR_Y, player.z)

  useFrame(() => {
    if (!groupRef.current) return
    curPos.current.lerp(targetP.current, LERP_POS)
    groupRef.current.position.copy(curPos.current)
    let da = player.angle - curAngle.current
    if (da > Math.PI) da -= Math.PI * 2
    if (da < -Math.PI) da += Math.PI * 2
    curAngle.current += da * LERP_ANGLE
    groupRef.current.rotation.y = curAngle.current
  })

  const isDead = player.health === 0
  const mainColor = isDead ? '#222222' : player.color
  const roofColor = isDead ? '#111111' : player.color
  const hoodColor = isDead ? '#1a1a1a' : player.color

  return (
    <group ref={groupRef} position={[player.x, CAR_Y, player.z]}>
      <mesh castShadow>
        <boxGeometry args={[1.75, 0.44, 3.3]} />
        <meshStandardMaterial color={mainColor} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.38, -0.1]}>
        <boxGeometry args={[1.2, 0.32, 1.65]} />
        <meshStandardMaterial color={roofColor} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.18, 1.1]}>
        <boxGeometry args={[1.6, 0.1, 0.9]} />
        <meshStandardMaterial color={mainColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.1, 1.72]}>
        <boxGeometry args={[1.85, 0.24, 0.2]} />
        <meshStandardMaterial color="#222" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.52, -1.6]}>
        <boxGeometry args={[2.0, 0.09, 0.4]} />
        <meshStandardMaterial color={hoodColor} roughness={0.4} />
      </mesh>
      {([-1.0, 1.0] as const).flatMap(lx =>
        ([-1.1, 1.1] as const).map(lz => ({ lx, lz }))
      ).map(({ lx, lz }, i) => (
        <group key={i} position={[lx, 0, lz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[lx > 0 ? 0.16 : -0.16, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <Html position={[0, 2.45, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.78)',
          border: `2px solid ${player.color}`,
          borderRadius: 6,
          padding: '3px 10px',
          color: '#fff',
          fontFamily: '"Impact","Arial Black",sans-serif',
          fontSize: 13,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: `0 0 10px ${player.color}`,
          letterSpacing: 1,
          userSelect: 'none',
        }}>
          {player.name}
        </div>
      </Html>
      {isDead && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}
