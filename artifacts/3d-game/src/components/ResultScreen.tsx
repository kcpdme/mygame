import { useEffect, useState } from 'react'
export interface RaceResult {
  totalTime: number;
  lapTimes: number[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

export default function ResultScreen({ result, onRestart }: { result: RaceResult; onRestart: () => void }) {
  const [scores, setScores] = useState<number[]>([])
  const [rank, setRank] = useState<number | null>(null)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('racerScores') || '[]') as number[]
    setScores(stored.slice(0, 10))
    const r = stored.indexOf(result.totalTime) + 1
    setRank(r > 0 ? r : null)
  }, [result.totalTime])

  const bestLap = Math.min(...result.lapTimes)

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #87CEEB 0%, #a8d5a2 40%, #c8a96e 100%)',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ height: 80, background: 'linear-gradient(180deg, transparent, #5a8a30)' }} />

      <div className="relative z-10 text-center px-8 max-w-md w-full">
        <div style={{ color: '#5a3010', fontSize: '0.8rem', letterSpacing: '0.4em', marginBottom: 8 }}>
          RACE COMPLETE
        </div>

        <h1
          style={{
            fontSize: '3.5rem',
            fontWeight: 900,
            color: '#3d1f00',
            textShadow: '3px 3px 0 #c8a96e',
            marginBottom: 12,
          }}
        >
          FINISH!
        </h1>

        {rank && rank <= 3 && (
          <div
            style={{
              background: 'rgba(192,57,43,0.15)',
              border: '2px solid #c0392b',
              borderRadius: 6,
              padding: '6px 20px',
              color: '#8B0000',
              fontWeight: 'bold',
              letterSpacing: '0.25em',
              marginBottom: 16,
              fontSize: '0.95rem',
            }}
          >
            NEW RECORD #{rank}!
          </div>
        )}

        {/* Results card */}
        <div
          className="mb-5 p-5 rounded text-left"
          style={{ background: 'rgba(139,94,42,0.18)', border: '2px solid rgba(139,94,42,0.4)' }}
        >
          <div className="text-center mb-4">
            <div style={{ color: '#6b3a1f', fontSize: '0.7rem', letterSpacing: '0.2em' }}>TOTAL TIME</div>
            <div style={{ color: '#3d1f00', fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace' }}>
              {formatTime(result.totalTime)}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(139,94,42,0.3)', marginBottom: 14 }} />

          <div className="mb-3">
            <div style={{ color: '#6b3a1f', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: 2 }}>BEST LAP</div>
            <div style={{ color: '#c0392b', fontSize: '1.4rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
              {formatTime(bestLap)}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(139,94,42,0.3)', marginBottom: 10 }} />

          <div style={{ color: '#6b3a1f', fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: 6 }}>LAP BREAKDOWN</div>
          {result.lapTimes.map((t: number, i: number) => (
            <div
              key={i}
              className="flex justify-between items-center py-1"
              style={{ fontFamily: 'monospace', borderBottom: '1px solid rgba(139,94,42,0.15)' }}
            >
              <span style={{ color: '#8B5E2A' }}>LAP {i + 1}</span>
              <span style={{ color: t === bestLap ? '#c0392b' : '#3d1f00', fontWeight: t === bestLap ? 'bold' : 'normal' }}>
                {formatTime(t)}
              </span>
              {t === bestLap && <span style={{ color: '#c0392b', fontSize: '0.65rem', fontFamily: 'Georgia' }}>BEST</span>}
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        {scores.length > 0 && (
          <div
            className="mb-5 p-4 rounded"
            style={{ background: 'rgba(139,94,42,0.15)', border: '2px solid rgba(139,94,42,0.35)' }}
          >
            <div style={{ color: '#5a3010', fontSize: '0.7rem', letterSpacing: '0.3em', marginBottom: 8, fontWeight: 'bold' }}>
              ALL TIME BEST
            </div>
            {scores.slice(0, 5).map((s, i) => (
              <div
                key={i}
                className="flex justify-between py-1"
                style={{
                  color: s === result.totalTime ? '#c0392b' : i === 0 ? '#6b3a1f' : '#8a7060',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: s === result.totalTime ? 'bold' : 'normal',
                  borderBottom: i < 4 ? '1px solid rgba(139,94,42,0.15)' : 'none',
                  background: s === result.totalTime ? 'rgba(192,57,43,0.08)' : 'transparent',
                  padding: '2px 4px',
                  borderRadius: 3,
                }}
              >
                <span>#{i + 1}</span>
                <span>{formatTime(s)}</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onRestart}
          className="w-full py-4 font-bold rounded cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #c0392b, #e74c3c)',
            color: '#fff8dc',
            border: '3px solid #8B0000',
            boxShadow: '0 6px 0 #5a0000',
            letterSpacing: '0.3em',
            fontSize: '1rem',
            fontFamily: 'Georgia, serif',
          }}
        >
          RACE AGAIN
        </button>
      </div>
    </div>
  )
}
