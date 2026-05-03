export const AI_NAMES = [
  'DustRunner', 'SavannaFox', 'IronJackal', 'CanyonViper', 
  'WildKudu', 'DuneRhino', 'BlazeHawk', 'MossCobra', 'SandFalcon'
]

export const AI_CONFIGS = [
  { id: 0, startT: 0.970, speed: 41, bodyColor: '#ddaa00', color: '#886600' },
  { id: 1, startT: 0.943, speed: 34, bodyColor: '#228844', color: '#114422' },
  { id: 2, startT: 0.943, speed: 38, bodyColor: '#2244cc', color: '#112288' },
  { id: 3, startT: 0.916, speed: 28, bodyColor: '#cc5500', color: '#882200' },
  { id: 4, startT: 0.916, speed: 44, bodyColor: '#9922cc', color: '#551188' },
  { id: 5, startT: 0.889, speed: 31, bodyColor: '#22aacc', color: '#116688' },
  { id: 6, startT: 0.889, speed: 36, bodyColor: '#cc2266', color: '#881144' },
  { id: 7, startT: 0.862, speed: 26, bodyColor: '#aacc22', color: '#668811' },
  { id: 8, startT: 0.862, speed: 39, bodyColor: '#cc8822', color: '#884411' },
]

export const TOTAL_SLOTS = 10
export const MAX_LAPS = 5
export const GRID_START_T = 0.970

export function normalizeProgress(t: number, laps: number): number {
  return laps + t
}

/** Search ±0.10 around lastT for the closest curve point. */
export function nearestT(
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
