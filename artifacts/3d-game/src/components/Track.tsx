import { useMemo } from 'react'
import * as THREE from 'three'

export const TRACK_WIDTH = 18
const HALF = 9          // TRACK_WIDTH / 2
const SAMPLES = 300
const TUBE_SEGS = 200

export const TRACK_POINTS = [
  // ── Start / Finish straight ──────────────────────────────────────────
  new THREE.Vector3(0,    0,   0),
  new THREE.Vector3(60,   0,  -5),
  new THREE.Vector3(125,  0, -12),
  new THREE.Vector3(178,  0, -28),
  // ── Turn 1 — long right-hand sweeper ─────────────────────────────────
  new THREE.Vector3(215,  0, -72),
  new THREE.Vector3(225,  0, -128),
  // ── Hairpin ──────────────────────────────────────────────────────────
  new THREE.Vector3(205,  0, -175),
  new THREE.Vector3(168,  0, -205),
  // ── Back straight ────────────────────────────────────────────────────
  new THREE.Vector3(115,  0, -222),
  new THREE.Vector3(58,   0, -235),
  // ── S-curves ─────────────────────────────────────────────────────────
  new THREE.Vector3(8,    0, -248),
  new THREE.Vector3(-42,  0, -238),
  new THREE.Vector3(-88,  0, -258),
  new THREE.Vector3(-135, 0, -242),
  // ── Left sweeper (Porsche curves) ────────────────────────────────────
  new THREE.Vector3(-178, 0, -212),
  new THREE.Vector3(-212, 0, -165),
  // ── Tight left hairpin ───────────────────────────────────────────────
  new THREE.Vector3(-222, 0, -108),
  new THREE.Vector3(-205, 0, -52),
  // ── Infield chicane ──────────────────────────────────────────────────
  new THREE.Vector3(-172, 0, -14),
  new THREE.Vector3(-132, 0,  12),
  new THREE.Vector3(-88,  0,  26),
  new THREE.Vector3(-48,  0,  14),
  new THREE.Vector3(-14,  0,   2),
]

let _curve: THREE.CatmullRomCurve3 | null = null
export function getTrackCurve(): THREE.CatmullRomCurve3 {
  if (!_curve) _curve = new THREE.CatmullRomCurve3(TRACK_POINTS, true, 'catmullrom', 0.5)
  return _curve
}

const OBSTACLE_DATA = [
  { t: 0.09, side: -4.5 }, { t: 0.19, side: 4.0 },
  { t: 0.30, side: -3.5 }, { t: 0.41, side: 4.5 },
  { t: 0.54, side: -4.0 }, { t: 0.64, side: 3.5 },
  { t: 0.75, side: -4.5 }, { t: 0.87, side: 4.0 },
]
const POWERUP_DATA = [
  { t: 0.06, type: 'nitro' }, { t: 0.28, type: 'nitro' },
  { t: 0.52, type: 'nitro' }, { t: 0.76, type: 'nitro' },
  { t: 0.17, type: 'health' }, { t: 0.60, type: 'health' },
]

function computeOffsetPositions(data: { t: number; side?: number; type?: string }[]) {
  const c = getTrackCurve()
  return data.map(d => {
    const p = c.getPoint(d.t)
    if (d.side !== undefined) {
      const tan = c.getTangent(d.t)
      const right = new THREE.Vector3(tan.z, 0, -tan.x).normalize()
      p.addScaledVector(right, d.side)
    }
    p.y = 1.0
    return p.clone()
  })
}

export function getObstaclePositions() { return computeOffsetPositions(OBSTACLE_DATA) }
export function getPowerupPositions()  { return computeOffsetPositions(POWERUP_DATA)  }
export function getPowerupTypes()      { return POWERUP_DATA.map(d => d.type as 'nitro' | 'health') }

/**
 * Build a flat ribbon along the track.
 * leftOff / rightOff are SIGNED distances from the track centre
 * (negative = left side, positive = right side).
 *
 * Winding: CCW from above → normals point UP (+Y) → visible from camera.
 *   b   = left  vertex at i
 *   b+1 = right vertex at i
 *   b+2 = left  vertex at i+1
 *   b+3 = right vertex at i+1
 *   Tri1: b, b+2, b+1  → +Y normal ✓
 *   Tri2: b+1, b+2, b+3 → +Y normal ✓
 */
function ribbon(leftOff: number, rightOff: number, y: number): THREE.BufferGeometry {
  const c = getTrackCurve()
  const verts: number[] = [], idx: number[] = [], uvs: number[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const t   = i / SAMPLES
    const p   = c.getPoint(t)
    const tan = c.getTangent(t).normalize()
    const r   = new THREE.Vector3(tan.z, 0, -tan.x)
    verts.push(p.x + r.x * leftOff,  y, p.z + r.z * leftOff)   // 2i   left
    verts.push(p.x + r.x * rightOff, y, p.z + r.z * rightOff)  // 2i+1 right
    uvs.push(0, t * 14,  1, t * 14)
  }
  for (let i = 0; i < SAMPLES; i++) {
    const b = i * 2
    idx.push(b, b + 2, b + 1,  b + 1, b + 2, b + 3)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,   2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

/** Barrier rail tube along the track at the given lateral offset. */
function barrierTube(lateralOff: number): THREE.BufferGeometry {
  const c = getTrackCurve()
  const RADIUS = 0.32
  const tubePts = Array.from({ length: TUBE_SEGS }, (_, i) => {
    const t   = i / TUBE_SEGS
    const p   = c.getPoint(t)
    const tan = c.getTangent(t).normalize()
    const r   = new THREE.Vector3(tan.z, 0, -tan.x)
    return new THREE.Vector3(p.x + r.x * lateralOff, RADIUS, p.z + r.z * lateralOff)
  })
  const path = new THREE.CatmullRomCurve3(tubePts, true)
  return new THREE.TubeGeometry(path, TUBE_SEGS, RADIUS, 6, true)
}

export function Track() {
  const BARRIER = HALF + 2.4   // 11.4 — where the barrier rail sits
  const KERB    = HALF + 1.6   // 10.6 — kerb outer edge

  const roadGeo      = useMemo(() => ribbon(-HALF, HALF, 0.002), [])
  const lKerbGeo     = useMemo(() => ribbon(-KERB, -HALF, 0.006), [])
  const rKerbGeo     = useMemo(() => ribbon(HALF,  KERB,  0.006), [])
  const lGrassGeo    = useMemo(() => ribbon(-HALF - 22, -KERB, 0), [])
  const rGrassGeo    = useMemo(() => ribbon(KERB,  HALF + 22, 0), [])
  const lLineGeo     = useMemo(() => ribbon(-HALF + 0.1, -HALF + 0.8, 0.012), [])
  const rLineGeo     = useMemo(() => ribbon(HALF - 0.8,  HALF - 0.1, 0.012), [])
  const cLineGeo     = useMemo(() => ribbon(-0.3, 0.3, 0.012), [])
  const lBarrierGeo  = useMemo(() => barrierTube(-BARRIER), [])
  const rBarrierGeo  = useMemo(() => barrierTube(BARRIER),  [])

  return (
    <group>
      {/* --- Road surface: packed dirt/rally feel --- */}
      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial color="#b87438" roughness={0.96} />
      </mesh>

      {/* --- Grass runoffs each side --- */}
      <mesh geometry={lGrassGeo} receiveShadow>
        <meshStandardMaterial color="#5a7e22" roughness={1} />
      </mesh>
      <mesh geometry={rGrassGeo} receiveShadow>
        <meshStandardMaterial color="#5a7e22" roughness={1} />
      </mesh>

      {/* --- Kerbs (left=red, right=white) --- */}
      <mesh geometry={lKerbGeo}>
        <meshStandardMaterial color="#cc2200" roughness={0.75} />
      </mesh>
      <mesh geometry={rKerbGeo}>
        <meshStandardMaterial color="#e4e4e4" roughness={0.75} />
      </mesh>

      {/* --- Edge lines --- */}
      <mesh geometry={lLineGeo}>
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>
      <mesh geometry={rLineGeo}>
        <meshStandardMaterial color="#ffffff" roughness={1} />
      </mesh>

      {/* --- Yellow centre line --- */}
      <mesh geometry={cLineGeo}>
        <meshStandardMaterial color="#f5c800" roughness={1} />
      </mesh>

      {/* --- Armco barriers (tube rail) --- */}
      <mesh geometry={lBarrierGeo} castShadow>
        <meshStandardMaterial color="#c0c8d0" roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh geometry={rBarrierGeo} castShadow>
        <meshStandardMaterial color="#c0c8d0" roughness={0.45} metalness={0.25} />
      </mesh>

      {/* --- Start / Finish checker band — tiles span ACROSS the track (Z axis) --- */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0.5, 0.015, (i - 4) * 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.5, 2]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#111111' : '#ffffff'} />
        </mesh>
      ))}

      {/* --- Start gantry poles — one each side of the track (Z = ±10) --- */}
      {[-10, 10].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh castShadow position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 7, 10]} />
            <meshStandardMaterial color="#999999" metalness={0.65} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* Crossbar spans Z axis — cars pass under it */}
      <mesh castShadow position={[0, 7.1, 0]}>
        <boxGeometry args={[0.28, 0.28, 20]} />
        <meshStandardMaterial color="#999999" metalness={0.65} roughness={0.35} />
      </mesh>
      {/* Hanging start/finish banner */}
      <mesh position={[0, 5.9, 0]}>
        <boxGeometry args={[0.08, 2.4, 19]} />
        <meshStandardMaterial color="#cc0000" roughness={0.8} />
      </mesh>
    </group>
  )
}
