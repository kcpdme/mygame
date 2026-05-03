import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VehicleVFXProps {
  health: number
  isDead: boolean
}

const MAX_SMOKE = 60
const MAX_FIRE = 50

export function VehicleVFX({ health, isDead }: VehicleVFXProps) {
  const smokeRef = useRef<THREE.Points>(null)
  const fireRef  = useRef<THREE.Points>(null)

  // Stable arrays to prevent resizing errors
  const smokeArray = useMemo(() => new Float32Array(MAX_SMOKE * 3).map(() => (Math.random() - 0.5) * 0.5), [])
  const fireArray  = useMemo(() => new Float32Array(MAX_FIRE * 3).map(() => (Math.random() - 0.5) * 0.8), [])

  useFrame((state, delta) => {
    if (smokeRef.current && smokeRef.current.visible) {
      const positions = smokeRef.current.geometry.attributes.position.array as Float32Array
      const count = isDead ? MAX_SMOKE : health === 1 ? 30 : health === 2 ? 15 : 0
      for (let i = 0; i < positions.length; i += 3) {
        // Move particles only if they are within the active range to save some work, 
        // but easier to just move all for simple logic.
        positions[i+1] += delta * (isDead ? 4 : 2)
        if (positions[i+1] > (isDead ? 5 : 3)) {
          positions[i] = (Math.random() - 0.5) * 0.5
          positions[i+1] = 0
          positions[i+2] = (Math.random() - 0.5) * 0.5
        }
      }
      smokeRef.current.geometry.attributes.position.needsUpdate = true
      smokeRef.current.geometry.setDrawRange(0, count)
    }
    
    if (fireRef.current && fireRef.current.visible) {
      const positions = fireRef.current.geometry.attributes.position.array as Float32Array
      const count = isDead ? MAX_FIRE : health === 1 ? 20 : 0
      for (let i = 0; i < positions.length; i += 3) {
        positions[i+1] += delta * 5
        if (positions[i+1] > 2) {
          positions[i] = (Math.random() - 0.5) * 0.8
          positions[i+1] = 0
          positions[i+2] = (Math.random() - 0.5) * 0.8
        }
      }
      fireRef.current.geometry.attributes.position.needsUpdate = true
      fireRef.current.geometry.setDrawRange(0, count)
    }
  })

  const showSmoke = isDead || health < 3
  const showFire  = isDead || health <= 1

  return (
    <group position={[0, 0.5, -1]}>
      <points ref={smokeRef} visible={showSmoke}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_SMOKE}
            array={smokeArray}
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
      <points ref={fireRef} visible={showFire}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_FIRE}
            array={fireArray}
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
    </group>
  )
}
