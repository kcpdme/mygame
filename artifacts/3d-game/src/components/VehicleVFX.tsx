import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VehicleVFXProps {
  health: number
  isDead: boolean
}

export function VehicleVFX({ health, isDead }: VehicleVFXProps) {
  const smokeRef = useRef<THREE.Points>(null)
  const fireRef  = useRef<THREE.Points>(null)

  useFrame((state, delta) => {
    if (smokeRef.current) {
      const positions = smokeRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i+1] += delta * (isDead ? 4 : 2)
        if (positions[i+1] > (isDead ? 5 : 3)) {
          positions[i] = (Math.random() - 0.5) * 0.5
          positions[i+1] = 0
          positions[i+2] = (Math.random() - 0.5) * 0.5
        }
      }
      smokeRef.current.geometry.attributes.position.needsUpdate = true
    }
    
    if (fireRef.current && (health <= 1 || isDead)) {
      const positions = fireRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i+1] += delta * 5
        if (positions[i+1] > 2) {
          positions[i] = (Math.random() - 0.5) * 0.8
          positions[i+1] = 0
          positions[i+2] = (Math.random() - 0.5) * 0.8
        }
      }
      fireRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  const smokeCount = isDead ? 50 : health === 1 ? 30 : health === 2 ? 15 : 0
  const fireCount = isDead ? 40 : health === 1 ? 20 : 0

  return (
    <group position={[0, 0.5, -1]}>
      {smokeCount > 0 && (
        <points ref={smokeRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={smokeCount}
              array={new Float32Array(smokeCount * 3).map(() => (Math.random() - 0.5) * 0.5)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={isDead ? 0.8 : 0.4}
            color={isDead || health === 1 ? "#333333" : "#aaaaaa"}
            transparent
            opacity={0.6}
            sizeAttenuation
          />
        </points>
      )}
      {fireCount > 0 && (
        <points ref={fireRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={fireCount}
              array={new Float32Array(fireCount * 3).map(() => (Math.random() - 0.5) * 0.8)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={isDead ? 0.6 : 0.3}
            color="#ff4400"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  )
}
