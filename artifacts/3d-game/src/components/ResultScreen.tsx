import { useEffect, useState } from 'react'

interface LeaderboardEntry {
  id: string
  name: string
  color: string
  progress: number
  finished: boolean
  finishTime?: number
  health: number
}

function formatTime(seconds: number): string {
  if (!seconds) return '--:--.--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

export default function ResultScreen({ results, onRestart }: { results: LeaderboardEntry[]; onRestart: () => void }) {
  const winner = results[0]

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[100]"
      style={{
        background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)',
        fontFamily: '"Impact", "Arial Black", sans-serif',
      }}
    >
      <div className="relative z-10 text-center px-8 max-w-2xl w-full">
        <div style={{ color: '#ffd700', fontSize: '1rem', letterSpacing: '0.5em', marginBottom: 12, fontWeight: 'bold' }}>
          GRAND PRIX RESULTS
        </div>

        <h1
          style={{
            fontSize: '5rem',
            fontWeight: 900,
            color: '#fff',
            textShadow: '0 0 20px rgba(255,255,255,0.3)',
            marginBottom: 24,
            fontStyle: 'italic',
            lineHeight: 1
          }}
        >
          FINAL STANDINGS
        </h1>

        {/* Podium / Trophy area */}
        <div className="mb-12 flex flex-col items-center">
           <div style={{ fontSize: '5rem', marginBottom: -10, filter: 'drop-shadow(0 0 15px #ffd700)' }}>🏆</div>
           <div style={{ color: '#ffd700', fontSize: '2.5rem', fontWeight: 900, textShadow: '0 0 10px #b8860b' }}>
             {winner?.name.toUpperCase()}
           </div>
           <div style={{ color: '#a0a0a0', fontSize: '0.8rem', letterSpacing: '0.2em' }}>CHAMPION</div>
        </div>

        {/* Results table */}
        <div
          className="mb-8 rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {results.slice(0, 10).map((r, i) => (
            <div
              key={r.id}
              className="flex items-center p-4 gap-6"
              style={{ 
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                borderBottom: i === results.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                color: i === 0 ? '#ffd700' : '#fff'
              }}
            >
              <span style={{ fontSize: '1.4rem', fontWeight: 900, width: 30 }}>{i + 1}</span>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color }} />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', flex: 1, textAlign: 'left' }}>
                {r.name.toUpperCase()}
                {r.id === 'local' && <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 10 }}>(YOU)</span>}
              </span>
              <span style={{ fontSize: '1rem', color: r.health <= 0 ? '#ff4444' : '#888', fontWeight: 'bold' }}>
                {r.health <= 0 ? 'RETIRED' : 'FINISHED'}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onRestart}
          className="w-full py-5 font-bold rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #ffd700, #b8860b)',
            color: '#000',
            border: 'none',
            letterSpacing: '0.2em',
            fontSize: '1.2rem',
            boxShadow: '0 0 30px rgba(184,134,11,0.4)'
          }}
        >
          CONTINUE TO LOBBY
        </button>
      </div>
    </div>
  )
}
