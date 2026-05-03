import { useMemo } from 'react'
import * as THREE from 'three'
import { getTrackCurve } from './Track'

const TREE_DATA = (() => {
  const c = getTrackCurve()
  const sides = [-22, 24, -28, 26, -20, 28, -25, 23, -30, 27, -23, 26, -21, 25, -29, 24, -27, 22, -26, 28, -22, 25]
  const ts    = [0.04,0.08,0.13,0.18,0.23,0.28,0.33,0.38,0.43,0.48,0.53,0.58,0.63,0.67,0.72,0.77,0.82,0.86,0.90,0.94,0.98]
  return ts.map((t, i) => {
    const p   = c.getPoint(t)
    const tan = c.getTangent(t)
    const r   = new THREE.Vector3(tan.z, 0, -tan.x)
    const q   = p.clone().addScaledVector(r, sides[i] + (i % 3) * 1.5)
    return { x: q.x, z: q.z, h: 5 + (i % 6), seed: i }
  })
})()

function Tree({ x, z, h, seed }: { x: number; z: number; h: number; seed: number }) {
  const lean = (seed % 3 - 1) * 0.04
  return (
    <group position={[x, 0, z]} rotation={[lean, seed * 1.3, 0]}>
      <mesh castShadow position={[0, h * 0.5, 0]}>
        <cylinderGeometry args={[0.22, 0.4, h, 6]} />
        <meshStandardMaterial color="#6b3d12" roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, h + 2.0, 0]}>
        <sphereGeometry args={[2.6 + (seed % 3) * 0.4, 7, 5]} />
        <meshStandardMaterial color="#3a7a1a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0.8, h + 0.6, 0.5]}>
        <sphereGeometry args={[1.6, 6, 4]} />
        <meshStandardMaterial color="#2d6616" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Mountains({ z, flip = false }: { z: number; flip?: boolean }) {
  const geo = useMemo(() => {
    const pts: [number, number][] = [
      [-350, 0], [-300, 28], [-240, 14], [-190, 44], [-140, 22],
      [-90, 50], [-40, 18], [20, 56], [70, 30], [130, 48],
      [180, 20], [240, 40], [300, 16], [350, 0],
    ]
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    pts.forEach(([x, y]) => shape.lineTo(x, y))
    shape.lineTo(350, 0)
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }, [])

  return (
    <mesh
      geometry={geo}
      position={[0, 0, z]}
      rotation={[-Math.PI / 2, 0, flip ? Math.PI : 0]}
      receiveShadow
    >
      <meshStandardMaterial color="#8a7a5a" side={THREE.DoubleSide} />
    </mesh>
  )
}

export function Environment() {
  return (
    <group>
      {/* ── Background colour ── */}
      <color attach="background" args={['#c8e8f5']} />

      {/* ── Lighting ── */}
      <directionalLight
        position={[80, 140, 50]}
        intensity={2.8}
        color="#fff4d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
      />
      <ambientLight intensity={0.9} color="#ffecd0" />
      <hemisphereLight args={['#8acfee', '#c8a86a', 0.6]} />

      {/* ── Slight haze ── */}
      <fog attach="fog" args={['#c0dff5', 120, 340]} />

      {/* ── Ground plane — sits just below road surface (Y=0.002) ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, -110]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color="#a89050" roughness={1} />
      </mesh>

      {/* ── Green savanna patches (far from road) ── */}
      {([
        [-80,  -0.003, -60,  90, 80],
        [80,   -0.003, -100, 70, 90],
        [-70,  -0.003, -200, 80, 70],
        [90,   -0.003, -190, 60, 80],
        [0,    -0.003, -280, 120, 60],
        [-100, -0.003, -130, 50, 60],
      ] as const).map(([x, y, z, w, d], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#6a8f28" roughness={1} />
        </mesh>
      ))}

      {/* ── Trees ── */}
      {TREE_DATA.map((t, i) => (
        <Tree key={i} x={t.x} z={t.z} h={t.h} seed={t.seed} />
      ))}

      {/* ── Distant acacia silhouettes ── */}
      {[-200, -160, 160, 200, -120, 120].map((x, i) => (
        <group key={i} position={[x, 0, i % 2 === 0 ? -280 : 140]}>
          <mesh position={[0, 3, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.7, 6, 6]} />
            <meshStandardMaterial color="#4a2a08" roughness={1} />
          </mesh>
          <mesh position={[0, 8, 0]} castShadow>
            <sphereGeometry args={[4.5, 6, 4]} />
            <meshStandardMaterial color="#2a5a10" roughness={1} />
          </mesh>
        </group>
      ))}

      {/* ── Distant rocks ── */}
      {[-130, 130, -80, 80].map((x, i) => (
        <mesh key={i} position={[x, 1, i < 2 ? -260 : 130]} castShadow>
          <dodecahedronGeometry args={[3 + i, 0]} />
          <meshStandardMaterial color="#8a7a60" roughness={0.95} />
        </mesh>
      ))}

      {/* ── Mountains (far backdrop) ── */}
      <Mountains z={-330} />
      <Mountains z={170} flip />
    </group>
  )
}
