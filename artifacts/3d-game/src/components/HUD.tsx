import { useEffect, useState } from 'react'

interface HUDProps {
  speed:       number
  nitro:       number
  health:      number
  lap:         number
  lapTimes:    number[]
  lapStart:    number
  position:    number
  totalRacers: number
  boosting:    boolean
  onlineCount: number
  myName:      string
  onLeave:     () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

const POS_SUFFIX = ['', 'ST', 'ND', 'RD', 'TH']

export function HUD({ speed, nitro, health, lap, lapTimes, lapStart, position, totalRacers, boosting, onlineCount, myName, onLeave }: HUDProps) {
  const [elapsed, setElapsed] = useState(0)
  const kmh     = Math.round(Math.abs(speed) * 5.8)
  const bestLap = lapTimes.length > 0 ? Math.min(...lapTimes) : null

  useEffect(() => {
    const id = setInterval(() => setElapsed((Date.now() - lapStart) / 1000), 80)
    return () => clearInterval(id)
  }, [lapStart])

  const posLabel = position <= 4 ? `${position}${POS_SUFFIX[position]}` : `${position}TH`

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10" style={{ fontFamily: 'Georgia, serif' }}>

      {/* === TOP BAR === */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 gap-4">

        {/* Lap times - left */}
        <div style={{ background: 'rgba(20,10,0,0.72)', border: '1px solid #8a6030', borderRadius: 8, padding: '10px 14px', minWidth: 130 }}>
          <div style={{ color: '#a08050', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: 4 }}>LAP TIMES</div>
          {lapTimes.slice(-5).map((t, i) => (
            <div key={i} style={{ color: t === Math.min(...lapTimes) ? '#f1c40f' : '#d4b896', fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: t === Math.min(...lapTimes) ? 'bold' : 'normal' }}>
              L{lapTimes.length - lapTimes.slice(-5).length + i + 1}: {formatTime(t)}
            </div>
          ))}
          {lapTimes.length === 0 && <div style={{ color: '#5a4020', fontSize: '0.75rem' }}>—</div>}
        </div>

        {/* Center */}
        <div className="text-center flex-1">
          <div style={{ background: 'rgba(20,10,0,0.75)', border: '2px solid #a0793a', borderRadius: 8, padding: '6px 24px', display: 'inline-block', marginBottom: 4 }}>
            <div style={{ color: '#f5deb3', fontSize: '1.4rem', fontWeight: 'bold' }}>
              LAP {lap}
            </div>
            <div style={{ color: '#a0793a', fontSize: '0.65rem', letterSpacing: '0.3em' }}>SAVANNA RALLY</div>
          </div>
          {/* Position */}
          <div style={{ marginBottom: 4 }}>
            <span style={{
              background: position === 1 ? '#b8860b' : 'rgba(20,10,0,0.7)',
              border: `2px solid ${position === 1 ? '#ffd700' : '#6a4a20'}`,
              borderRadius: 6, padding: '2px 14px',
              color: position === 1 ? '#ffd700' : '#d4b896',
              fontSize: '1.1rem', fontWeight: 'bold',
            }}>
              {posLabel} / {totalRacers}
            </span>
          </div>
          {/* Online indicator */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,60,20,0.7)', border: '1px solid #22aa55', borderRadius: 20, padding: '2px 10px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: onlineCount > 0 ? '#44ff88' : '#888', boxShadow: onlineCount > 0 ? '0 0 6px #44ff88' : 'none', flexShrink: 0 }} />
            <span style={{ color: '#88ffaa', fontSize: '0.65rem', letterSpacing: '0.1em', fontWeight: 'bold' }}>
              {onlineCount} ONLINE
            </span>
          </div>
        </div>

        {/* Timer + Leave - right */}
        <div style={{ background: 'rgba(20,10,0,0.72)', border: '1px solid #8a6030', borderRadius: 8, padding: '10px 14px', minWidth: 130, textAlign: 'right' }}>
          <div style={{ color: '#a08050', fontSize: '0.65rem', letterSpacing: '0.15em', marginBottom: 2 }}>CURRENT LAP</div>
          <div style={{ color: '#fff8dc', fontSize: '1.3rem', fontFamily: 'monospace' }}>{formatTime(elapsed)}</div>
          {bestLap !== null && (
            <>
              <div style={{ color: '#a08050', fontSize: '0.65rem', letterSpacing: '0.15em', marginTop: 6, marginBottom: 2 }}>BEST LAP</div>
              <div style={{ color: '#f1c40f', fontSize: '1.1rem', fontFamily: 'monospace' }}>{formatTime(bestLap)}</div>
            </>
          )}
          {/* Driver name */}
          <div style={{ color: '#6a4a20', fontSize: '0.62rem', marginTop: 8, letterSpacing: '0.1em' }}>{myName}</div>
          {/* Leave button */}
          <button
            onClick={onLeave}
            className="pointer-events-auto"
            style={{ marginTop: 8, background: 'rgba(80,20,20,0.6)', border: '1px solid #662222', borderRadius: 4, color: '#ff8888', fontSize: '0.65rem', letterSpacing: '0.1em', padding: '3px 8px', cursor: 'pointer' }}
          >
            LEAVE RACE
          </button>
        </div>
      </div>

      {/* === BOTTOM RIGHT — Speedometer === */}
      <div className="absolute bottom-8 right-8 text-right">
        <div style={{ fontSize: '4.5rem', fontWeight: 900, lineHeight: 1, color: boosting ? '#1a8aff' : '#ffffff', textShadow: boosting ? '0 0 20px #0055ff, 0 3px 0 #003388' : '0 3px 0 #5a3010, 0 1px 6px rgba(0,0,0,0.8)', transition: 'color 0.2s' }}>
          {kmh}
        </div>
        <div style={{ color: '#d4b896', fontSize: '0.8rem', letterSpacing: '0.25em', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>KM/H</div>
        {boosting && <div style={{ color: '#66aaff', fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '0.2em', textShadow: '0 0 8px #0044ff', marginTop: 2 }}>NITRO!</div>}
      </div>

      {/* === BOTTOM LEFT — Nitro + Health === */}
      <div className="absolute bottom-8 left-8" style={{ background: 'rgba(20,10,0,0.75)', border: '1px solid #5a4020', borderRadius: 10, padding: '12px 16px', minWidth: 160 }}>
        <div style={{ marginBottom: 10 }}>
          <div className="flex justify-between" style={{ marginBottom: 4 }}>
            <span style={{ color: '#6699ff', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.2em' }}>NITRO</span>
            <span style={{ color: '#6699ff', fontSize: '0.7rem' }}>{Math.round(nitro)}%</span>
          </div>
          <div style={{ height: 10, background: 'rgba(0,0,80,0.5)', borderRadius: 5, overflow: 'hidden', border: '1px solid #223366' }}>
            <div style={{ height: '100%', width: `${nitro}%`, background: nitro > 60 ? 'linear-gradient(90deg,#0044cc,#4499ff)' : nitro > 25 ? 'linear-gradient(90deg,#002288,#2266cc)' : 'linear-gradient(90deg,#001155,#113399)', transition: 'width 0.1s', boxShadow: nitro > 0 ? '0 0 6px #0055ff' : 'none' }} />
          </div>
          <div style={{ color: '#4477aa', fontSize: '0.62rem', marginTop: 3 }}>PRESS [SPACE] TO USE</div>
        </div>
        <div>
          <div style={{ color: '#dd4444', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.2em', marginBottom: 4 }}>HEALTH</div>
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 28, height: 22, borderRadius: 4, background: i < health ? '#cc2222' : 'rgba(80,20,20,0.4)', border: `1px solid ${i < health ? '#ff4444' : '#441111'}`, transition: 'all 0.3s', boxShadow: i < health ? '0 0 6px #ff2222' : 'none' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-2 text-center" style={{ color: 'rgba(180,140,80,0.55)', fontSize: '0.65rem', letterSpacing: '0.15em' }}>
        W/↑ GAS · S/↓ BRAKE · A/← D/→ STEER · SPACE NITRO
      </div>

      {/* Speed bar */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: 4, background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (kmh / 400) * 100)}%`, background: boosting ? 'linear-gradient(90deg,#0033cc,#4499ff)' : 'linear-gradient(90deg,#8a2020,#cc3333)', transition: 'width 0.08s' }} />
      </div>

      <style>{`@keyframes hudPulse { from{opacity:.75} to{opacity:1} }`}</style>
    </div>
  )
}
