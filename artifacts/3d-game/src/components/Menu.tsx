import { useEffect, useRef, useState } from 'react'

const ADJECTIVES = ['Fast', 'Wild', 'Swift', 'Turbo', 'Crazy', 'Neon', 'Drift', 'Blaze', 'Storm', 'Rogue', 'Hyper', 'Sonic']
const NOUNS      = ['Lion', 'Eagle', 'Wolf', 'Tiger', 'Hawk', 'Bear', 'Fox', 'Cobra', 'Shark', 'Falcon', 'Viper', 'Puma']

function pickRandomName() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num  = Math.floor(Math.random() * 99) + 1
  return `${adj}${noun}${num}`
}

export default function Menu({ onStart }: { onStart: (name: string) => void }) {
  const [name, setName] = useState(() => pickRandomName())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.select() }, [])

  const handleJoin = () => {
    const trimmed = name.trim()
    onStart(trimmed.length > 0 ? trimmed : pickRandomName())
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #87CEEB 0%, #a8d5a2 35%, #c8a96e 100%)', fontFamily: 'Georgia, serif' }}
    >
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ height: 100, background: 'linear-gradient(180deg, transparent, #4a7a28)' }} />

      <div className="relative z-10 text-center px-8 max-w-lg w-full">
        <div style={{ display:'inline-block', background:'#c8a96e', border:'3px solid #8B5E2A', borderRadius:4, padding:'4px 20px', color:'#5a3010', fontSize:'0.75rem', letterSpacing:'0.35em', marginBottom:12, fontWeight:'bold' }}>
          OPEN WORLD RACING
        </div>
        <h1 style={{ fontSize:'clamp(2.5rem,8vw,4.5rem)', fontWeight:900, color:'#3d1f00', textShadow:'3px 3px 0 #c8a96e, 0 2px 12px rgba(0,0,0,0.3)', lineHeight:1.05, marginBottom:4 }}>
          SAVANNA<br/>RALLY
        </h1>
        <div style={{ color:'#5a3010', fontSize:'0.9rem', letterSpacing:'0.25em', marginBottom:24 }}>
          MULTIPLAYER · OFFROAD · ENDLESS
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div style={{ flex:1, height:2, background:'#8B5E2A', opacity:0.4 }} />
          <span style={{ fontSize:'1.4rem' }}>🌿</span>
          <div style={{ flex:1, height:2, background:'#8B5E2A', opacity:0.4 }} />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {['MULTIPLAYER', 'ENDLESS RACE', 'NITRO BOOST', 'AI RIVALS', 'ROCK OBSTACLES', 'HEALTH PACKS'].map(f => (
            <span key={f} style={{ background:'rgba(139,94,42,0.18)', border:'1px solid rgba(139,94,42,0.4)', borderRadius:20, padding:'3px 12px', color:'#5a3010', fontSize:'0.72rem', fontWeight:'bold', letterSpacing:'0.1em' }}>
              {f}
            </span>
          ))}
        </div>

        {/* Name entry */}
        <div className="mb-4" style={{ background:'rgba(139,94,42,0.15)', border:'2px solid rgba(139,94,42,0.35)', borderRadius:8, padding:'16px 20px' }}>
          <div style={{ color:'#5a3010', fontSize:'0.75rem', letterSpacing:'0.25em', fontWeight:'bold', marginBottom:8 }}>
            YOUR DRIVER NAME
          </div>
          <input
            ref={inputRef}
            value={name}
            maxLength={18}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(30,15,0,0.65)', border: '2px solid #8B5E2A',
              borderRadius: 6, padding: '10px 14px',
              color: '#fff8dc', fontSize: '1.2rem', fontWeight: 'bold',
              fontFamily: '"Impact","Arial Black",sans-serif',
              letterSpacing: 2, textAlign: 'center', outline: 'none',
            }}
            placeholder="Enter your name"
          />
          <div style={{ color:'#8B5E2A', fontSize:'0.62rem', marginTop:6 }}>
            Other players will see this above your car
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-around mb-5 py-3 px-4 rounded" style={{ background:'rgba(139,94,42,0.15)', border:'2px solid rgba(139,94,42,0.35)' }}>
          {[['W/↑', 'ACCELERATE'], ['S/↓', 'BRAKE'], ['A D / ←→', 'STEER'], ['SPACE', 'NITRO']].map(([k, v]) => (
            <div key={k} className="text-center">
              <div style={{ color:'#3d1f00', fontWeight:'bold', fontSize:'0.9rem' }}>{k}</div>
              <div style={{ color:'#8B5E2A', fontSize:'0.62rem', letterSpacing:'0.08em' }}>{v}</div>
            </div>
          ))}
        </div>

        <button
          onClick={handleJoin}
          className="w-full py-4 font-bold rounded cursor-pointer"
          style={{ background:'linear-gradient(135deg,#c0392b,#e74c3c)', color:'#fff8dc', border:'3px solid #8B0000', boxShadow:'0 6px 0 #5a0000, 0 8px 20px rgba(0,0,0,0.3)', letterSpacing:'0.3em', fontSize:'1.1rem', fontFamily:'Georgia, serif', transition:'all 0.1s' }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform='translateY(3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 3px 0 #5a0000' }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform=''; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 6px 0 #5a0000, 0 8px 20px rgba(0,0,0,0.3)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform=''; (e.currentTarget as HTMLButtonElement).style.boxShadow='0 6px 0 #5a0000, 0 8px 20px rgba(0,0,0,0.3)' }}
        >
          JOIN RACE
        </button>
      </div>
    </div>
  )
}
