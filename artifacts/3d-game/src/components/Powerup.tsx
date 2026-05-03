import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface NitroCanisterProps {
  position: THREE.Vector3
  active: boolean
}

export function NitroCanister({ position, active }: NitroCanisterProps) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current && active) {
      groupRef.current.rotation.y += delta * 2.5
      groupRef.current.position.y = position.y + 0.7 + Math.sin(Date.now() * 0.003) * 0.2
    }
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={[position.x, position.y + 0.7, position.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.9, 10]} />
        <meshStandardMaterial color="#1166ff" emissive="#0033cc" emissiveIntensity={1.5} metalness={0.6} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.2, 8]} />
        <meshStandardMaterial color="#aaaaff" emissive="#6666ff" emissiveIntensity={2} />
      </mesh>
      <pointLight color="#0066ff" intensity={4} distance={8} />
    </group>
  )
}

interface HealthPackProps {
  position: THREE.Vector3
  active: boolean
}

export function HealthPack({ position, active }: HealthPackProps) {
  const groupRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (groupRef.current && active) {
      groupRef.current.rotation.y += delta * 1.8
      groupRef.current.position.y = position.y + 0.7 + Math.sin(Date.now() * 0.0025 + 1) * 0.2
    }
  })

  if (!active) return null

  return (
    <group ref={groupRef} position={[position.x, position.y + 0.7, position.z]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial color="#dd2222" emissive="#aa0000" emissiveIntensity={1.2} roughness={0.4} />
      </mesh>
      {/* White cross */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.55, 0.15, 0.15]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.55]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
      </mesh>
      <pointLight color="#ff2222" intensity={3} distance={7} />
    </group>
  )
}

interface RockObstacleProps {
  position: THREE.Vector3
  active: boolean
  size?: number
}

export function RockObstacle({ position, active, size = 1 }: RockObstacleProps) {
  if (!active) return null
  return (
    <group position={[position.x, position.y + size * 0.4, position.z]}>
      <mesh castShadow>
        <dodecahedronGeometry args={[size * 0.8, 0]} />
        <meshStandardMaterial color="#7a6a5a" roughness={0.95} />
      </mesh>
      <mesh position={[size * 0.5, -size * 0.1, size * 0.3]} castShadow>
        <dodecahedronGeometry args={[size * 0.5, 0]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.95} />
      </mesh>
    </group>
  )
}
