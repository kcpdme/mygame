import { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { getTrackCurve } from './Track'
import type { AIState } from '../types'
import type { RemotePlayer } from '../hooks/useMultiplayer'
import { Html } from '@react-three/drei'

enum Controls {
  forward = 'forward',
  back    = 'back',
  left    = 'left',
  right   = 'right',
  nitro   = 'nitro',
}

interface PlayerCarProps {
  onSpeedChange:    (speed: number, nitro: number, health: number) => void
  onLapComplete:    (lapTime: number) => void
  onNitroCollect:   (index: number) => void
  onHealthCollect:  (index: number) => void
  onObstacleHit:    (index: number) => void
  onSpeedBoost?:    () => void
  onWorldUpdate?:   (x: number, y: number, z: number, angle: number, speed: number, laps: number, health: number) => void
  nitroPositions:   THREE.Vector3[]
  healthPositions:  THREE.Vector3[]
  obstaclePositions: THREE.Vector3[]
  powerupActive:    boolean[]
  obstacleActive:   boolean[]
  racing:           boolean
  onTrackTProgress: (t: number, laps: number) => void
  aiStateRef?: React.MutableRefObject<AIState[]>
  playerName:       string
  color?:           string
  remotePlayers?:   RemotePlayer[]
}

// ── Physics constants ─────────────────────────────────────────────────────────
const ACCEL         = 24     // forward acceleration (m/s²)
const BRAKE         = 40     // braking deceleration
const DRAG          = 0.978  // gentle lift-off drag (0.78 was instant-stop; 0.978 coasts naturally)
const MAX_SPEED     = 60     // m/s top speed (~216 km/h) — above fastest AI at 41
const NITRO_SPEED   = 105    // m/s nitro top speed (~378 km/h) — massive surge
const NITRO_ACCEL   = 120    // m/s² nitro acceleration — instant violent kick
const NITRO_COAST   = 22     // m/s² — how fast speed eases back from nitro to MAX after boost
const NITRO_DRAIN   = 38     // nitro units/s consumed
const NITRO_REFILL  = 33     // nitro units gained from canister
const STEER_MIN    = 0.55    // turn rate at low speed (rad/s)
const STEER_MAX    = 1.40    // turn rate at high speed
const DRIFT_GAIN   = 0.07    // lateral velocity accumulation when cornering
const LATERAL_GRIP = 0.74    // lateral vel retained per frame at 60 fps
const TRACK_HALF   = 10.8   // inner edge of barrier from track centre
const COLL_D       = 3.4     // car-to-car collision distance
const PUSH_FORCE   = 14      // impulse magnitude applied to AI on collision

export function PlayerCar(props: PlayerCarProps) {
  const {
    onSpeedChange, onLapComplete, onNitroCollect, onHealthCollect,
    onObstacleHit, onSpeedBoost, onWorldUpdate, nitroPositions, healthPositions,
    obstaclePositions, powerupActive, obstacleActive, racing,
    onTrackTProgress, aiStateRef, playerName, color, remotePlayers
  } = props

  const [renderHealth, setRenderHealth] = useState(3)
  const groupRef     = useRef<THREE.Group>(null)
  const [, getControls] = useKeyboardControls<Controls>()
  const { camera }   = useThree()
  const curve        = useRef(getTrackCurve())

  // Player starts at grid position Row 1 left (same row as AI car 0 on the right).
  // t=0.970 is ~10 m before the start/finish line on the final infield section.
  const PLAYER_GRID_T   = 0.970
  const PLAYER_GRID_LAT = -3.0   // left lane

  // Derive initial heading from the actual grid tangent (not t=0)
  const INIT_ANGLE = useRef(0)
  if (INIT_ANGLE.current === 0) {
    const tan = curve.current.getTangent(PLAYER_GRID_T)
    INIT_ANGLE.current = Math.atan2(tan.x, tan.z)
  }

  // ── Physics state refs (no re-renders from the game loop) ─────────────────
  const angle       = useRef(INIT_ANGLE.current)
  const speed       = useRef(0)           // longitudinal speed
  const lateralVel  = useRef(0)           // local-frame lateral velocity (right = +)
  const pos         = useRef(new THREE.Vector3(0, 0.55, 0))
  const nitro       = useRef(0)
  const nitroOn     = useRef(false)
  const health      = useRef(3)
  const lapStart    = useRef(Date.now())
  const lapsDone    = useRef(0)
  const prevX       = useRef(0)
  const closestT    = useRef(0)
  const shakeTimer  = useRef(0)
  const camPos      = useRef(new THREE.Vector3(0, 8, 20))
  const camLook     = useRef(new THREE.Vector3())

  const reset = () => {
    // Place the player on the racing grid (Row 1 left lane, ~10 m before start line)
    const gridPt    = curve.current.getPoint(PLAYER_GRID_T)
    const gridTan   = curve.current.getTangent(PLAYER_GRID_T)
    const gridRight = new THREE.Vector3(gridTan.z, 0, -gridTan.x)
    const startX    = gridPt.x + gridRight.x * PLAYER_GRID_LAT
    const startZ    = gridPt.z + gridRight.z * PLAYER_GRID_LAT

    angle.current      = Math.atan2(gridTan.x, gridTan.z)
    speed.current      = 0
    lateralVel.current = 0
    pos.current.set(startX, 0.55, startZ)
    nitro.current      = 0
    nitroOn.current    = false
    health.current     = 3
    lapStart.current   = Date.now()
    lapsDone.current   = 0
    prevX.current      = startX   // real starting X prevents false lap-line detection
    closestT.current   = PLAYER_GRID_T
    shakeTimer.current = 0
  }

  useEffect(() => { reset() }, [racing])

  useFrame((_, delta) => {
    if (!racing || !groupRef.current) return
    const ctrl = getControls()

    // ── Nitro ─────────────────────────────────────────────────────────────
    if (ctrl.nitro && nitro.current > 0) {
      nitroOn.current = true
      nitro.current   = Math.max(0, nitro.current - NITRO_DRAIN * delta)
      if (nitro.current <= 0) nitroOn.current = false
    } else {
      if (!ctrl.nitro) nitroOn.current = false
    }

    // ── Longitudinal speed ────────────────────────────────────────────────
    const topSpeed = health.current < 2 ? MAX_SPEED * 0.62 : MAX_SPEED

    if (health.current === 0) {
      speed.current = 0
      lateralVel.current = 0
    } else if (ctrl.forward) {
      if (nitroOn.current) {
        // Nitro: violent kick toward NITRO_SPEED using NITRO_ACCEL (much faster than normal)
        speed.current = Math.min(speed.current + NITRO_ACCEL * delta, NITRO_SPEED)
      } else if (speed.current > topSpeed) {
        // After nitro wears off, coast down gradually to normal top speed — no snap
        speed.current = Math.max(speed.current - NITRO_COAST * delta, topSpeed)
      } else {
        // Normal acceleration up to top speed
        speed.current = Math.min(speed.current + ACCEL * delta, topSpeed)
      }
    } else if (ctrl.back) {
      speed.current = Math.max(speed.current - BRAKE * delta, -14)
    } else {
      // Lift-off: gentle exponential drag — coasts naturally, does NOT instant-stop
      speed.current *= Math.pow(DRAG, delta * 60)
      if (Math.abs(speed.current) < 0.2) speed.current = 0
    }

    // ── Steering ──────────────────────────────────────────────────────────
    const steerInput = (health.current > 0) ? ((ctrl.left ? 1 : 0) - (ctrl.right ? 1 : 0)) : 0
    if (steerInput !== 0 && Math.abs(speed.current) > 0.5) {
      const spd   = Math.abs(speed.current)
      const sFact = Math.min(spd / MAX_SPEED, 1)
      const rate  = (STEER_MIN + (STEER_MAX - STEER_MIN) * sFact) * Math.sign(speed.current) * delta
      angle.current += steerInput * rate

      // Lateral slip: cornering at speed builds lateral velocity (drift/push-wide feel)
      const driftAdd = steerInput * sFact * DRIFT_GAIN * spd * delta
      lateralVel.current += driftAdd
    }

    // Lateral grip — tyre friction kills drift over time
    lateralVel.current *= Math.pow(LATERAL_GRIP, delta * 60)

    // ── World velocity → new position ────────────────────────────────────
    const sinA  = Math.sin(angle.current)
    const cosA  = Math.cos(angle.current)
    // right vector in world space = (cosA, 0, -sinA)
    const velX  = sinA * speed.current + cosA * lateralVel.current
    const velZ  = cosA * speed.current - sinA * lateralVel.current

    let newX = pos.current.x + velX * delta
    let newZ = pos.current.z + velZ * delta

    // ── Track wall clamping ───────────────────────────────────────────────
    const t  = nearestT(new THREE.Vector3(newX, 0, newZ), curve.current, closestT.current)
    closestT.current = t
    const tp = curve.current.getPoint(t)
    const dx = newX - tp.x
    const dz = newZ - tp.z
    const lat = Math.sqrt(dx * dx + dz * dz)
    if (lat > TRACK_HALF) {
      const push = TRACK_HALF / lat
      newX = tp.x + dx * push
      newZ = tp.z + dz * push
      speed.current      *= 0.42    // wall impact kills speed
      lateralVel.current *= 0.08    // nearly eliminates drift on wall hit
      shakeTimer.current  = 0.18
    }

    pos.current.set(newX, 0.55, newZ)
    onTrackTProgress(t, lapsDone.current)

    // ── Car-to-car collision ──────────────────────────────────────────────
    if (aiStateRef) {
      aiStateRef.current.forEach(aiState => {
        const cdx   = pos.current.x - aiState.position.x
        const cdz   = pos.current.z - aiState.position.z
        const distSq = cdx * cdx + cdz * cdz
        if (distSq < COLL_D * COLL_D && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const nx = cdx / dist   // unit normal from AI → player
          const nz = cdz / dist

          // Separate the cars (push player outward)
          const overlap = COLL_D - dist
          pos.current.x += nx * overlap * 0.40
          pos.current.z += nz * overlap * 0.40

          // Push AI car away (written to shared state; AICar reads it)
          aiState.push.x -= nx * PUSH_FORCE
          aiState.push.z -= nz * PUSH_FORCE

          // nx points FROM AI → TO PLAYER.
          // behindFactor > 0 means AI is in the player's rear hemisphere.
          // (dot of player-forward with the AI→player vector ≈ +1 when AI is behind)
          const behindFactor = sinA * nx + cosA * nz   // NO negation

          // Relative approach speed along player's forward axis
          const playerVx = sinA * speed.current
          const playerVz = cosA * speed.current
          const relApproach =
            (aiState.velocity.x - playerVx) * sinA +
            (aiState.velocity.z - playerVz) * cosA

          if (behindFactor > 0.35 && relApproach > 1.5) {
            // AI rammed us from behind — slingshot boost!
            // Minimum 15 m/s bonus; scales with how fast the AI was closing
            const boostAmt = Math.max(relApproach * 0.65 + 15, 15)
            speed.current = Math.min(speed.current + boostAmt, topSpeed * 1.55)
            shakeTimer.current = 0.25   // small shake for feedback
            onSpeedBoost?.()
          } else {
            // Side / head-on: slight mutual slow-down
            speed.current      *= 0.86
            lateralVel.current *= 0.55
          }
        }
      })
    }

    if (remotePlayers) {
      remotePlayers.forEach(rp => {
        const cdx   = pos.current.x - rp.x
        const cdz   = pos.current.z - rp.z
        const distSq = cdx * cdx + cdz * cdz
        if (distSq < COLL_D * COLL_D && distSq > 0.01) {
          const dist = Math.sqrt(distSq)
          const nx = cdx / dist
          const nz = cdz / dist

          const overlap = COLL_D - dist
          pos.current.x += nx * overlap * 0.40
          pos.current.z += nz * overlap * 0.40

          const behindFactor = sinA * nx + cosA * nz

          const playerVx = sinA * speed.current
          const playerVz = cosA * speed.current
          const rpSinA = Math.sin(rp.angle)
          const rpCosA = Math.cos(rp.angle)
          const rpVx = rpSinA * rp.speed
          const rpVz = rpCosA * rp.speed

          const relApproach = (rpVx - playerVx) * sinA + (rpVz - playerVz) * cosA

          if (behindFactor > 0.35 && relApproach > 1.5) {
            const boostAmt = Math.max(relApproach * 0.65 + 15, 15)
            speed.current = Math.min(speed.current + boostAmt, topSpeed * 1.55)
            shakeTimer.current = 0.25
            onSpeedBoost?.()
          } else {
            speed.current      *= 0.86
            lateralVel.current *= 0.55
          }
        }
      })
    }

    // ── Lap detection: cross x=0 going +X near z=0 ───────────────────────
    if (prevX.current < 0 && pos.current.x >= 0 && Math.abs(pos.current.z) < 16) {
      const elapsed = (Date.now() - lapStart.current) / 1000
      if (elapsed > 8) {
        lapsDone.current++
        lapStart.current = Date.now()
        onLapComplete(elapsed)
      }
    }
    prevX.current = pos.current.x

    // ── Pickups & obstacles ───────────────────────────────────────────────
    obstaclePositions.forEach((op, i) => {
      if (!obstacleActive[i]) return
      if (pos.current.distanceTo(op) < 2.5) {
        // Momentum-based impact: bigger speed = bigger bounce
        const impactSpeed = Math.abs(speed.current)
        speed.current      = -impactSpeed * 0.30   // bounce backward
        lateralVel.current  = 0
        shakeTimer.current  = 0.55
        health.current      = Math.max(0, health.current - 1)
        if (renderHealth !== health.current) setRenderHealth(health.current)
        onObstacleHit(i)
      }
    })

    nitroPositions.forEach((np, i) => {
      if (!powerupActive[i]) return
      if (pos.current.distanceTo(np) < 3.2) {
        nitro.current = Math.min(100, nitro.current + NITRO_REFILL)
        onNitroCollect(i)
      }
    })

    healthPositions.forEach((hp, idx) => {
      const pIdx = nitroPositions.length + idx
      if (!powerupActive[pIdx]) return
      if (pos.current.distanceTo(hp) < 3.2) {
        health.current = Math.min(3, health.current + 1)
        if (renderHealth !== health.current) setRenderHealth(health.current)
        onHealthCollect(idx)
      }
    })

    // ── Apply to mesh ─────────────────────────────────────────────────────
    groupRef.current.position.copy(pos.current)
    groupRef.current.rotation.x = 0
    groupRef.current.rotation.y = angle.current
    // Slight body roll proportional to lateral velocity (visual weight cue)
    groupRef.current.rotation.z = clamp(-lateralVel.current * 0.016, -0.18, 0.18)

    // ── Chase camera ─────────────────────────────────────────────────────
    const shake    = shakeTimer.current > 0 ? (Math.random() - 0.5) * 0.7 : 0
    shakeTimer.current = Math.max(0, shakeTimer.current - delta)

    const backDist  = 14 + Math.abs(speed.current) * 0.14
    const desiredCam = new THREE.Vector3(
      pos.current.x - sinA * backDist + shake,
      pos.current.y + 5.5,
      pos.current.z - cosA * backDist,
    )
    const desiredLook = new THREE.Vector3(
      pos.current.x + sinA * 8,
      pos.current.y + 1.0,
      pos.current.z + cosA * 8,
    )
    camPos.current.lerp(desiredCam, 0.10)
    camLook.current.lerp(desiredLook, 0.15)
    camera.position.copy(camPos.current)
    camera.lookAt(camLook.current)

    onSpeedChange(speed.current, nitro.current, health.current)
    if (renderHealth !== health.current) setRenderHealth(health.current)
    onWorldUpdate?.(pos.current.x, pos.current.y, pos.current.z, angle.current, speed.current, lapsDone.current, health.current)
  })

  const isDead = renderHealth === 0
  const mainColor = isDead ? "#222222" : (color || "#cc2200")
  const roofColor = isDead ? "#111111" : (color || "#881100")
  const hoodColor = isDead ? "#1a1a1a" : (color || "#dd3300")

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[1.8, 0.46, 3.4]} />
        <meshStandardMaterial color={mainColor} roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Roof / rollcage */}
      <mesh castShadow position={[0, 0.58, -0.1]}>
        <boxGeometry args={[1.35, 0.34, 1.8]} />
        <meshStandardMaterial color={roofColor} roughness={0.6} metalness={0.2} />
      </mesh>
      {/* Windshield */}
      <mesh position={[0, 0.55, 0.72]}>
        <boxGeometry args={[1.25, 0.28, 0.08]} />
        <meshStandardMaterial color="#aaccee" transparent opacity={0.7} roughness={0.1} metalness={0.3} />
      </mesh>
      {/* Hood */}
      <mesh castShadow position={[0, 0.38, 1.3]}>
        <boxGeometry args={[1.7, 0.12, 0.8]} />
        <meshStandardMaterial color={hoodColor} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Front bumper */}
      <mesh castShadow position={[0, 0.15, 1.76]}>
        <boxGeometry args={[1.9, 0.28, 0.22]} />
        <meshStandardMaterial color="#222222" roughness={0.7} />
      </mesh>
      {/* Rear spoiler */}
      <mesh castShadow position={[0, 0.75, -1.65]}>
        <boxGeometry args={[2.1, 0.1, 0.42]} />
        <meshStandardMaterial color="#111111" roughness={0.5} />
      </mesh>
      {/* Exhaust pipes */}
      {([-0.55, 0.55] as const).map((x, i) => (
        <mesh key={i} position={[x, 0.12, -1.75]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.3, 7]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Wheels */}
      {([-1.05, 1.05] as const).flatMap(wx =>
        ([-1.1, 1.1] as const).map(wz => ({ wx, wz }))
      ).map(({ wx, wz }, i) => (
        <group key={i} position={[wx, 0, wz]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.32, 14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[wx > 0 ? 0.17 : -0.17, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 8]} />
            <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Headlights */}
      <pointLight color="#fffde0" intensity={2.5} distance={22} position={[ 0.55, 0.3, 1.9]} />
      <pointLight color="#fffde0" intensity={2.5} distance={22} position={[-0.55, 0.3, 1.9]} />
      
      <Html position={[0, 2.45, 0]} center distanceFactor={20} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.78)',
          border: `2px solid ${color || '#fff'}`,
          borderRadius: 6,
          padding: '3px 10px',
          color: '#fff',
          fontFamily: '"Impact","Arial Black",sans-serif',
          fontSize: 13,
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: `0 0 10px ${color || '#fff'}`,
          letterSpacing: 1,
          userSelect: 'none',
        }}>
          {playerName}
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

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

/** Search ±0.10 around lastT for the closest curve point. */
function nearestT(
  pos: THREE.Vector3,
  curve: THREE.CatmullRomCurve3,
  lastT: number,
): number {
  const RANGE = 0.10
  const STEPS = 36
  let best = lastT, minD = Infinity
  for (let i = 0; i <= STEPS; i++) {
    const t = ((lastT - RANGE / 2 + (i / STEPS) * RANGE) % 1 + 1) % 1
    const p = curve.getPoint(t)
    const d = (pos.x - p.x) ** 2 + (pos.z - p.z) ** 2
    if (d < minD) { minD = d; best = t }
  }
  return best
}
