import { useState, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Game from './components/Game'
import Menu from './components/Menu'

const queryClient = new QueryClient()

export default function App() {
  const [racing,     setRacing]     = useState(false)
  const [playerName, setPlayerName] = useState('')

  const handleStart = useCallback((name: string) => {
    setPlayerName(name)
    setRacing(true)
  }, [])

  const handleLeave = useCallback(() => {
    setRacing(false)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {!racing && <Menu onStart={handleStart} />}
      {racing  && <Game playerName={playerName} onLeave={handleLeave} />}
    </QueryClientProvider>
  )
}
