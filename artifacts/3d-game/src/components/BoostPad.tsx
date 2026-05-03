import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface BoostPadProps {
  position: THREE.Vector3
  tangent: THREE.Vector3
  active: boolean
}

export function BoostPad({ position, tangent, active }: BoostPadProps) {
  const arrowRef = useRef<THREE.Mesh>(null)
  const angle = Math.atan2(tangent.x, tangent.z)

  useFrame((_, delta) => {
    if (arrowRef.current) {
      arrowRef.current.rotation.y += delta * 2
    }
  })

  return (
    <group position={[position.x, 0.05, position.z]} rotation={[0, angle, 0]}>
      {/* Muddy pad base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 3]} />
        <meshStandardMaterial
          color={active ? '#f39c12' : '#8B6914'}
          roughness={0.8}
        />
      </mesh>

      {/* Arrow markers */}
      {[-1.5, 0, 1.5].map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.4, 0.8, 3]} />
          <meshStandardMaterial
            color={active ? '#f1c40f' : '#5a4010'}
            emissive={active ? '#f39c12' : '#000000'}
            emissiveIntensity={active ? 1.5 : 0}
          />
        </mesh>
      ))}

      {/* Spinning mushroom on active */}
      <mesh ref={arrowRef} position={[0, active ? 0.8 : 0.3, 0]}>
        <coneGeometry args={[0.5, 0.4, 8]} />
        <meshStandardMaterial
          color={active ? '#ff5500' : '#882200'}
          emissive={active ? '#ff3300' : '#000000'}
          emissiveIntensity={active ? 1.0 : 0}
        />
      </mesh>

      {active && (
        <pointLight color="#ffaa00" intensity={5} distance={14} position={[0, 2, 0]} />
      )}
    </group>
  )
}
