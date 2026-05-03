import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface BoomEffectProps {
  position: [number, number, number]
  onDone: () => void
}

export function BoomEffect({ position, onDone }: BoomEffectProps) {
  const outerMesh = useRef<THREE.Mesh>(null)
  const innerMesh = useRef<THREE.Mesh>(null)
  const ringMesh  = useRef<THREE.Mesh>(null)
  const outerMat  = useRef<THREE.MeshStandardMaterial>(null)
  const innerMat  = useRef<THREE.MeshStandardMaterial>(null)
  const ringMat   = useRef<THREE.MeshStandardMaterial>(null)
  const lightRef  = useRef<THREE.PointLight>(null)
  const t         = useRef(0)
  const done      = useRef(false)

  useFrame((_, delta) => {
    if (done.current) return
    t.current += delta * 2.8  // completes in ~0.36 s
    if (t.current >= 1) { done.current = true; onDone(); return }

    const p    = t.current
    const fade = 1 - p
    const outerScale = p * 5
    const innerScale = p * 2.5
    const ringScale  = 0.5 + p * 3.5

    if (outerMesh.current) outerMesh.current.scale.setScalar(outerScale)
    if (innerMesh.current) innerMesh.current.scale.setScalar(innerScale)
    if (ringMesh.current)  ringMesh.current.scale.setScalar(ringScale)

    if (outerMat.current) outerMat.current.opacity = fade * 0.9
    if (innerMat.current) innerMat.current.opacity = Math.max(0, fade * 1.6 - 0.6)
    if (ringMat.current)  ringMat.current.opacity  = Math.max(0, fade * 0.7)

    if (lightRef.current) lightRef.current.intensity = fade * 30
  })

  return (
    <group position={position}>
      {/* Outer fireball */}
      <mesh ref={outerMesh}>
        <sphereGeometry args={[1, 10, 7]} />
        <meshStandardMaterial
          ref={outerMat}
          color="#ff7700"
          emissive="#ff4400"
          emissiveIntensity={2.5}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Inner bright core */}
      <mesh ref={innerMesh}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial
          ref={innerMat}
          color="#ffffff"
          emissive="#ffee00"
          emissiveIntensity={6}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Shockwave ring */}
      <mesh ref={ringMesh} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.22, 6, 16]} />
        <meshStandardMaterial
          ref={ringMat}
          color="#ffaa00"
          emissive="#ff6600"
          emissiveIntensity={2}
          transparent
          depthWrite={false}
        />
      </mesh>

      <pointLight ref={lightRef} color="#ff8800" intensity={30} distance={20} />
    </group>
  )
}
