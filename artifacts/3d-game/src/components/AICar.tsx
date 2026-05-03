import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getTrackCurve } from './Track'
import type { AIState } from '../types'
import { VehicleVFX } from './VehicleVFX'

interface AICarProps {
  startT:           number
  speed:            number
  color:            string
  bodyColor:        string
  carId:            number
  aiState:          AIState
  myIndex:          number
  allAiStates:      React.MutableRefObject<AIState[]>
  racing:           boolean
  onPositionUpdate: (t: number, laps: number) => void
}

const CAR_Y    = 0.42
const AI_COLL  = 3.5
const PUSH_OUT = 9

// Grid lateral lanes — 9 AI cars in 5 rows of 2 (player takes row-1 left)
// Row 1: AI0 right(+3)
// Row 2: AI1 left(-3), AI2 right(+3)
// Row 3: AI3 left(-3), AI4 right(+3)
// Row 4: AI5 left(-3), AI6 right(+3)
// Row 5: AI7 left(-3), AI8 right(+3)
const LAT_OFFSETS = [3.0, -3.0, 3.0, -3.0, 3.0, -3.0, 3.0, -3.0, 3.0]
const AI_NAMES = ['DustRunner', 'SavannaFox', 'IronJackal', 'CanyonViper', 'WildKudu', 'DuneRhino', 'BlazeHawk', 'MossCobra', 'SandFalcon']

export function AICar({
  startT, speed, color, bodyColor, carId, aiState,
  myIndex, allAiStates, racing, onPositionUpdate,
}: AICarProps) {
  const groupRef = useRef<THREE.Group>(null)
  const tRef     = useRef(startT)
  const lapsRef  = useRef(0)
  const curve    = useRef(getTrackCurve())
  const trackLen = useRef(curve.current.getLength())
  const latOff   = LAT_OFFSETS[carId] ?? ((carId % 2 === 0 ? 1 : -1) * 2.5)
  const name    = AI_NAMES[carId] ?? `AI ${carId + 1}`

  const pushVel    = useRef(new THREE.Vector3())
  const pushOffset = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const t     = tRef.current
    const trk   = curve.current.getPoint(t)
    const tan   = curve.current.getTangent(t).normalize()
    const right = new THREE.Vector3(tan.z, 0, -tan.x)

    // Always decay push (keeps cars settled during countdown too)
    if (aiState.push.lengthSq() > 0.01) {
      pushVel.current.add(aiState.push)
      aiState.push.set(0, 0, 0)
    }
    pushOffset.current.x += pushVel.current.x * delta
    pushOffset.current.z += pushVel.current.z * delta
    pushVel.current.multiplyScalar(Math.pow(0.35, delta * 60))
    pushOffset.current.multiplyScalar(Math.pow(0.82, delta * 60))

    const wx = trk.x + right.x * latOff + pushOffset.current.x
    const wz = trk.z + right.z * latOff + pushOffset.current.z

    // Always render — cars are visible and in position during 3-2-1 countdown
    groupRef.current.position.set(wx, CAR_Y, wz)
    const ahead = curve.current.getPoint((t + 0.022) % 1)
    groupRef.current.lookAt(
      ahead.x + right.x * latOff,
      CAR_Y,
      ahead.z + right.z * latOff,
    )

    // Always publish position so PlayerCar can query it
    aiState.position.set(groupRef.current.position.x, 0, groupRef.current.position.z)
    aiState.velocity.set(0, 0, 0)

    // ── Only advance physics after GO! ────────────────────────────────────
    if (!racing || lapsRef.current >= 5) return

    tRef.current += (speed / trackLen.current) * delta
    if (tRef.current >= 1) { 
      tRef.current -= 1; 
      lapsRef.current = Math.min(5, lapsRef.current + 1)
    }

    // AI-to-AI collision
    allAiStates.current.forEach((otherState, idx) => {
      if (idx === myIndex) return
      if (otherState.position.lengthSq() < 0.01) return

      const cdx    = groupRef.current!.position.x - otherState.position.x
      const cdz    = groupRef.current!.position.z - otherState.position.z
      const distSq = cdx * cdx + cdz * cdz

      if (distSq < AI_COLL * AI_COLL && distSq > 0.01) {
        const dist    = Math.sqrt(distSq)
        const nx      = cdx / dist
        const nz      = cdz / dist
        const overlap = AI_COLL - dist

        groupRef.current!.position.x += nx * overlap * 0.55
        groupRef.current!.position.z += nz * overlap * 0.55
        pushVel.current.x += nx * PUSH_OUT * 0.5
        pushVel.current.z += nz * PUSH_OUT * 0.5
        otherState.push.x -= nx * overlap * PUSH_OUT
        otherState.push.z -= nz * overlap * PUSH_OUT
      }
    })

    aiState.velocity.set(
      tan.x * speed + pushVel.current.x,
      0,
      tan.z * speed + pushVel.current.z,
    )

    onPositionUpdate(tRef.current, lapsRef.current)
  })

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[1.75, 0.44, 3.3]} />
        <meshStandardMaterial color={bodyColor} roughness={0.35} metalness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 0.38, -0.1]}>
        <boxGeometry args={[1.2, 0.32, 1.65]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.18, 1.1]}>
        <boxGeometry args={[1.6, 0.1, 0.9]} />
        <meshStandardMaterial color={bodyColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.1, 1.72]}>
        <boxGeometry args={[1.85, 0.24, 0.2]} />
        <meshStandardMaterial color="#222" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.52, -1.6]}>
        <boxGeometry args={[2.0, 0.09, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {([-1.0, 1.0] as const).flatMap(x =>
        ([-1.1, 1.1] as const).map(z => ({ x, z }))
      ).map(({ x, z }, i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.3, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.16 : -0.16, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
            <meshStandardMaterial color="#c0c0c0" metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <VehicleVFX health={3} isDead={lapsRef.current >= 5} />
      <Html position={[0, 2.45, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.78)',
          border: `2px solid ${color}`,
          borderRadius: 6,
          padding: '3px 10px',
          color: '#fff',
          fontFamily: '"Impact","Arial Black",sans-serif',
          fontSize: 13,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: `0 0 10px ${color}`,
          letterSpacing: 1,
          userSelect: 'none',
        }}>
          {name}
        </div>
      </Html>
    </group>
  )
}
