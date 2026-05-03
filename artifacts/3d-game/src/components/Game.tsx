import { useCallback, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls } from '@react-three/drei'
import { Track } from './Track'
import { PlayerCar } from './PlayerCar'
import { AICar } from './AICar'
import { NitroCanister, HealthPack, RockObstacle } from './Powerup'
import { Environment } from './Environment'
import { HUD } from './HUD'
import { BoomEffect } from './BoomEffect'
import { RemoteCar } from './RemoteCar'
import { getObstaclePositions, getPowerupPositions, getPowerupTypes } from './Track'
import { useMultiplayer } from '../hooks/useMultiplayer'
import type { AIState } from '../types'
import * as THREE from 'three'
import { AI_CONFIGS, AI_NAMES, TOTAL_SLOTS, GRID_START_T, normalizeProgress, nearestT } from '../constants'
import ResultScreen from './ResultScreen'
import { useFrame } from '@react-three/fiber'

enum Controls {
  forward = 'forward',
  back    = 'back',
  left    = 'left',
  right   = 'right',
  nitro   = 'nitro',
}

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp',    'KeyW'] },
  { name: Controls.back,    keys: ['ArrowDown',  'KeyS'] },
  { name: Controls.left,    keys: ['ArrowLeft',  'KeyA'] },
  { name: Controls.right,   keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.nitro,   keys: ['Space'] },
]

const AI_NAMES_LOCAL = AI_NAMES // Backwards compat if needed inside the component

const obstaclePositions  = getObstaclePositions()
const allPowerupPositions = getPowerupPositions()
const powerupTypes        = getPowerupTypes()
const nitroPositions  = allPowerupPositions.filter((_, i) => powerupTypes[i] === 'nitro')
const healthPositions = allPowerupPositions.filter((_, i) => powerupTypes[i] === 'health')

interface Boom { id: number; pos: [number, number, number] }
interface LeaderboardEntry {
  id: string
  name: string
  color: string
  progress: number
  finished: boolean
  finishTime?: number
  health: number
}

interface GameProps {
  playerName: string
  onLeave:    () => void
}

export default function Game({ playerName, onLeave }: GameProps) {
  const { 
    myName, myColor, remotePlayers, connected, isHost, lobbyState, 
    currentRoom, rooms, startRace, claimHost, createRoom, joinRoom, leaveRoom, sendUpdate 
  } = useMultiplayer(playerName)

  const activeAICount = Math.max(0, TOTAL_SLOTS - 1 - remotePlayers.length)

  const [hud, setHud]           = useState({ speed: 0, nitro: 0, health: 3, boosting: false })
  const [lap, setLap]           = useState(1)
  const [lapTimes, setLapTimes] = useState<number[]>([])
  const [boostFlash, setBoostFlash] = useState(false)
  const [booms, setBooms]       = useState<Boom[]>([])
  const [countdown, setCountdown] = useState<number | null>(3)

  const [powerupActive, setPowerupActive] = useState<boolean[]>(new Array(allPowerupPositions.length).fill(true))
  const [obstacleActive, setObstacleActive] = useState<boolean[]>(new Array(obstaclePositions.length).fill(true))
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isFinished, setIsFinished] = useState(false)
  const [raceResults, setRaceResults] = useState<LeaderboardEntry[]>([])

  const lapStartRef = useRef(Date.now())
  const nextBoomId  = useRef(0)

  useEffect(() => {
    if (lobbyState !== 'racing' || countdown === null || !currentRoom) return
    if (countdown === 0) {
      const t = setTimeout(() => setCountdown(null), 700)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000)
    return () => clearTimeout(t)
  }, [countdown, lobbyState, currentRoom])

  const aiStateRef = useRef<AIState[]>(
    Array.from({ length: 9 }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      push:     new THREE.Vector3(),
    })),
  )

  const playerProgress = useRef({ t: GRID_START_T, laps: 0 })
  const aiProgress     = useRef(AI_CONFIGS.map(c => ({ t: c.startT, laps: 0 })))

  const handleSpeedChange = useCallback((speed: number, nitro: number, health: number) => {
    setHud({ speed, nitro, health, boosting: nitro > 0 && speed > 30 })
    if (health <= 0 && !isFinished) {
      // Handle player death logic if needed
    }
  }, [isFinished])

  const handleSpeedBoost = useCallback(() => {
    setBoostFlash(true)
    setTimeout(() => setBoostFlash(false), 900)
  }, [])

  const handleLapComplete = useCallback((lapTime: number) => {
    lapStartRef.current = Date.now()
    setLapTimes(prev => { const next = [...prev, lapTime]; setLap(next.length + 1); return next })
  }, [])

  const handleNitroCollect = useCallback((index: number) => {
    let realIdx = 0, count = 0
    for (let i = 0; i < powerupTypes.length; i++) {
      if (powerupTypes[i] === 'nitro') { if (count === index) { realIdx = i; break }; count++ }
    }
    setPowerupActive(prev => { const n = [...prev]; n[realIdx] = false; return n })
    setTimeout(() => setPowerupActive(prev => { const n = [...prev]; n[realIdx] = true; return n }), 8000)
  }, [])

  const handleHealthCollect = useCallback((index: number) => {
    let realIdx = 0, count = 0
    for (let i = 0; i < powerupTypes.length; i++) {
      if (powerupTypes[i] === 'health') { if (count === index) { realIdx = i; break }; count++ }
    }
    setPowerupActive(prev => { const n = [...prev]; n[realIdx] = false; return n })
    setTimeout(() => setPowerupActive(prev => { const n = [...prev]; n[realIdx] = true; return n }), 15000)
  }, [])

  const handleObstacleHit = useCallback((index: number) => {
    setObstacleActive(prev => { const n = [...prev]; n[index] = false; return n })
    setTimeout(() => setObstacleActive(prev => { const n = [...prev]; n[index] = true; return n }), 5000)
    const op = obstaclePositions[index]
    const id = nextBoomId.current++
    setBooms(prev => [...prev, { id, pos: [op.x, op.y + 1, op.z] }])
  }, [])

  const handleTrackProgress = useCallback((t: number, laps: number) => {
    playerProgress.current = { t, laps }
  }, [])

  const handleAIProgress = useCallback((carIdx: number, t: number, laps: number) => {
    aiProgress.current[carIdx] = { t, laps }
  }, [])

  // Keep a ref to remote players for the leaderboard logic
  const remotePlayersRef = useRef(remotePlayers)
  useEffect(() => { remotePlayersRef.current = remotePlayers }, [remotePlayers])

  // Periodic Leaderboard Update using a stable interval
  useEffect(() => {
    if (lobbyState !== 'racing') return
    const curve = getTrackCurve()

    const intervalId = setInterval(() => {
      const entries: LeaderboardEntry[] = []
      
      // Local Player
      entries.push({
        id: 'local',
        name: myName || playerName,
        color: myColor,
        progress: normalizeProgress(playerProgress.current.t, playerProgress.current.laps),
        finished: playerProgress.current.laps >= 5,
        health: hud.health
      })

      // AI Players
      AI_CONFIGS.slice(0, activeAICount).forEach((cfg, i) => {
        entries.push({
          id: `ai-${cfg.id}`,
          name: AI_NAMES[cfg.id] || `AI ${cfg.id}`,
          color: cfg.bodyColor,
          progress: normalizeProgress(aiProgress.current[i].t, aiProgress.current[i].laps),
          finished: aiProgress.current[i].laps >= 5,
          health: 3
        })
      })

      // Remote Players
      remotePlayersRef.current.forEach(rp => {
        const rpT = nearestT(new THREE.Vector3(rp.x, 0, rp.z), curve, 0)
        entries.push({
          id: rp.id,
          name: rp.name,
          color: rp.color,
          progress: normalizeProgress(rpT, rp.laps),
          finished: rp.laps >= 5,
          health: rp.health
        })
      })

      entries.sort((a, b) => b.progress - a.progress)
      setLeaderboard(entries.slice(0, 10))

      // Check if all finished
      const allFinished = entries.every(e => e.finished || e.health <= 0)
      if (allFinished && entries.length > 0 && !isFinished) {
        setRaceResults(entries)
        setIsFinished(true)
      }
    }, 200)

    return () => clearInterval(intervalId)
  }, [lobbyState, activeAICount, isFinished]) // Reduced dependencies to keep interval stable

  const removeBoom = useCallback((id: number) => {
    setBooms(prev => prev.filter(b => b.id !== id))
  }, [])
  
  const raceStartRef = useRef(Date.now())
  useEffect(() => {
    if (lobbyState === 'racing' && countdown === 0) {
      raceStartRef.current = Date.now()
    }
  }, [lobbyState, countdown])


  const getPosition = () => {
    const idx = leaderboard.findIndex(e => e.id === 'local')
    return idx === -1 ? 1 : idx + 1
  }

  const racing      = countdown === null && !!currentRoom
  const onlineCount = 1 + remotePlayers.length

  return (
    <div className="fixed inset-0 bg-black">
      <KeyboardControls map={keyMap}>
        <Canvas
          camera={{ position: [0, 8, 20], fov: 72, near: 0.1, far: 800 }}
          shadows={{ type: THREE.PCFShadowMap }}
          style={{ width: '100%', height: '100%' }}
        >
          <Environment />
          <Track />

          {obstaclePositions.map((pos, i) => (
            <RockObstacle key={i} position={pos} active={obstacleActive[i]} size={0.9 + (i % 3) * 0.3} />
          ))}
          {nitroPositions.map((pos, i) => {
            let realIdx = 0; let count = 0
            for (let j = 0; j < powerupTypes.length; j++) {
              if (powerupTypes[j] === 'nitro') { if (count === i) { realIdx = j; break } count++ }
            }
            return <NitroCanister key={i} position={pos} active={powerupActive[realIdx] ?? true} />
          })}
          {healthPositions.map((pos, i) => {
            let realIdx = 0; let count = 0
            for (let j = 0; j < powerupTypes.length; j++) {
              if (powerupTypes[j] === 'health') { if (count === i) { realIdx = j; break } count++ }
            }
            return <HealthPack key={i} position={pos} active={powerupActive[realIdx] ?? true} />
          })}

          {AI_CONFIGS.slice(0, activeAICount).map((cfg, i) => (
            <AICar
              key={cfg.id}
              startT={cfg.startT}
              speed={cfg.speed}
              color={cfg.color}
              bodyColor={cfg.bodyColor}
              carId={cfg.id}
              aiState={aiStateRef.current[i]}
              myIndex={i}
              allAiStates={aiStateRef}
              racing={racing}
              onPositionUpdate={(t, laps) => handleAIProgress(i, t, laps)}
            />
          ))}

          {remotePlayers.map(player => (
            <RemoteCar key={player.id} player={player} />
          ))}

          {currentRoom && (
            <PlayerCar
              onSpeedChange={handleSpeedChange}
              onLapComplete={handleLapComplete}
              onNitroCollect={handleNitroCollect}
              onHealthCollect={handleHealthCollect}
              onObstacleHit={handleObstacleHit}
              onSpeedBoost={handleSpeedBoost}
              onWorldUpdate={(x, y, z, angle, speed, laps, health) => sendUpdate(x, y, z, angle, speed, laps, health)}
              nitroPositions={nitroPositions}
              healthPositions={healthPositions}
              obstaclePositions={obstaclePositions}
              powerupActive={powerupActive}
              obstacleActive={obstacleActive}
              racing={racing}
              onTrackTProgress={handleTrackProgress}
              aiStateRef={aiStateRef}
              playerName={myName}
              color={myColor}
              remotePlayers={remotePlayers}
            />
          )}

          {booms.map(b => (
            <BoomEffect key={b.id} position={b.pos} onDone={() => removeBoom(b.id)} />
          ))}
        </Canvas>
      </KeyboardControls>

      {currentRoom && (
        <HUD
          speed={hud.speed}
          nitro={hud.nitro}
          health={hud.health}
          lap={lap}
          lapTimes={lapTimes}
          lapStart={lapStartRef.current}
          position={getPosition()}
          totalRacers={leaderboard.length}
          boosting={hud.boosting}
          onlineCount={onlineCount}
          myName={myName || playerName}
          onLeave={() => { leaveRoom(); setCountdown(3); }}
          leaderboard={leaderboard}
        />
      )}

      {isFinished && (
        <ResultScreen results={raceResults} onRestart={() => { setIsFinished(false); leaveRoom(); }} />
      )}

      {/* Room Selection UI */}
      {!currentRoom && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-md">
          <div className="bg-zinc-900 border-2 border-zinc-700 p-10 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-4xl font-black text-white italic tracking-tighter">RACE ROOMS</h2>
                <p className="text-zinc-500 text-xs tracking-widest uppercase font-bold mt-1">Select a lobby or create one</p>
              </div>
              <button 
                onClick={() => createRoom(`${myName}'s GP`)}
                className="px-6 py-3 bg-white hover:bg-zinc-200 text-black font-black rounded-lg transition-all active:scale-95"
              >
                CREATE ROOM
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {rooms.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <div className="text-zinc-600 font-bold uppercase tracking-widest text-sm mb-2">No active rooms found</div>
                  <button onClick={() => createRoom(`${myName}'s GP`)} className="text-amber-500 font-black hover:underline underline-offset-4">BE THE FIRST TO HOST</button>
                </div>
              ) : (
                rooms.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-5 bg-zinc-800/50 rounded-xl border border-zinc-700 hover:border-zinc-500 transition-all group">
                    <div>
                      <div className="text-white font-black text-xl italic tracking-tight uppercase">{r.name}</div>
                      <div className="flex gap-4 mt-1">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">👤 {r.playerCount} RACERS</span>
                        <span className={`text-xs font-black uppercase tracking-widest ${r.lobbyState === 'lobby' ? 'text-green-500' : 'text-amber-500'}`}>
                          ● {r.lobbyState === 'lobby' ? 'JOINABLE' : 'IN PROGRESS'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => joinRoom(r.id)}
                      className="px-8 py-3 bg-zinc-700 hover:bg-white hover:text-black text-white font-black rounded-lg transition-all active:scale-95 group-hover:bg-amber-500 group-hover:text-black"
                    >
                      JOIN
                    </button>
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={onLeave}
              className="mt-8 text-zinc-600 hover:text-white text-xs font-black uppercase tracking-widest self-center transition-colors"
            >
              ← BACK TO MAIN MENU
            </button>
          </div>
        </div>
      )}

      {/* Lobby UI */}
      {currentRoom && lobbyState === 'lobby' && (
        <div className="fixed inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border-2 border-zinc-700 p-8 rounded-xl max-w-md w-full shadow-2xl text-center">
            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter italic uppercase">{currentRoom.name}</h2>
            <div className="text-zinc-400 text-sm mb-6 tracking-widest uppercase font-bold">Lobby waiting area</div>
            
            <div className="space-y-3 mb-8 text-left max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: myColor }} />
                  <span className="text-white font-bold">{myName} (YOU)</span>
                </div>
                {isHost && <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black">HOST</span>}
              </div>
              
              {remotePlayers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-zinc-300">{p.name}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              {isHost ? (
                <button 
                  onClick={startRace}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-lg transition-all active:scale-95 shadow-[0_4px_0_rgb(180,130,0)]"
                >
                  START ENGINE
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="text-amber-500 font-bold animate-pulse">
                    WAITING FOR HOST TO START...
                  </div>
                  <button 
                    onClick={claimHost}
                    className="text-[10px] text-zinc-500 hover:text-amber-500 underline uppercase tracking-widest font-bold transition-colors"
                  >
                    Host is idle? Claim Host
                  </button>
                </div>
              )}
              
              <button 
                onClick={leaveRoom}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black rounded-lg transition-all"
              >
                LEAVE ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Countdown */}
      {currentRoom && lobbyState === 'racing' && countdown !== null && (
        <div
          key={`cd-${countdown}`}
          style={{
            position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 30, pointerEvents: 'none',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <div style={{
            fontSize: countdown === 0 ? '9rem' : '13rem',
            fontWeight: 900,
            fontFamily: '"Impact","Arial Black",sans-serif',
            color: countdown === 0 ? '#00ff88' : '#ffdd00',
            textShadow: countdown === 0
              ? '0 0 40px #00ff88, 0 0 80px #00cc66'
              : '0 0 40px #ffdd00, 0 0 80px #ff8800',
            lineHeight: 1, userSelect: 'none',
            animation: 'countPop 0.25s ease-out',
          }}>
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {boostFlash && (
        <div style={{
          position: 'fixed', top: '32%', left: '50%', transform: 'translateX(-50%)',
          color: '#ff8800', fontSize: '2.6rem', fontWeight: 900, letterSpacing: 5,
          textShadow: '0 0 20px #ff8800, 0 0 50px #ff4400',
          zIndex: 25, pointerEvents: 'none',
          fontFamily: '"Impact","Arial Black",sans-serif',
          animation: 'boostFlash 0.9s ease-out forwards',
        }}>
          ⚡ SPEED BOOST!
        </div>
      )}

      {!connected && (
        <div style={{
          position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)', border: '1px solid #554422',
          borderRadius: 6, padding: '4px 16px',
          color: '#aa8855', fontSize: '0.7rem', letterSpacing: '0.15em',
          zIndex: 20, pointerEvents: 'none',
        }}>
          CONNECTING TO MULTIPLAYER…
        </div>
      )}
    </div>
  )
}
