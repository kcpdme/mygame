import { useRef, useEffect, useCallback, useState } from 'react'

export interface RemotePlayer {
  id:    string
  name:  string
  color: string
  x: number
  y: number
  z: number
  angle: number
  speed: number
  laps:  number
  health: number
}

export interface RoomInfo {
  id: string
  name: string
  playerCount: number
  lobbyState: 'lobby' | 'racing'
}

interface UseMultiplayerReturn {
  myId:          string | null
  myName:        string
  myColor:       string
  remotePlayers: RemotePlayer[]
  connected:     boolean
  isHost:        boolean
  lobbyState:    'lobby' | 'racing'
  currentRoom:   { id: string; name: string } | null
  rooms:         RoomInfo[]
  startRace:     () => void
  claimHost:     () => void
  createRoom:    (name: string) => void
  joinRoom:      (roomId: string) => void
  leaveRoom:     () => void
  sendUpdate:    (x: number, y: number, z: number, angle: number, speed: number, laps: number, health: number) => void
}

const SEND_INTERVAL_MS = 50

export function useMultiplayer(playerName: string): UseMultiplayerReturn {
  const wsRef       = useRef<WebSocket | null>(null)
  const myIdRef     = useRef<string | null>(null)
  const lastSendRef = useRef(0)
  const nameRef     = useRef(playerName)

  const [myId,          setMyId]          = useState<string | null>(null)
  const [myName,        setMyName]        = useState(playerName)
  const [myColor,       setMyColor]       = useState('#ff4455')
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([])
  const [connected,     setConnected]     = useState(false)
  const [isHost,        setIsHost]        = useState(false)
  const [lobbyState,    setLobbyState]    = useState<'lobby' | 'racing'>('lobby')
  const [currentRoom,   setCurrentRoom]   = useState<{ id: string; name: string } | null>(null)
  const [rooms,         setRooms]         = useState<RoomInfo[]>([])

  useEffect(() => { nameRef.current = playerName }, [playerName])

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws    = new WebSocket(`${proto}//${window.location.host}/api/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ type: 'join', name: nameRef.current }))
    }

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data as string)

      if (msg.type === 'room_list') {
        setRooms(msg.rooms)
      }

      if (msg.type === 'welcome') {
        const { id, name, color, isHost, lobbyState, roomId, roomName, players } = msg
        myIdRef.current = id
        setMyId(id)
        if (!playerName) setMyName(name)
        setMyColor(color)
        setIsHost(!!isHost)
        setLobbyState(lobbyState)
        setCurrentRoom({ id: roomId, name: roomName })
        setRemotePlayers((players as RemotePlayer[]).filter(p => p.id !== id))
      }

      if (msg.type === 'host_assigned') {
        setIsHost(msg.hostId === myIdRef.current)
      }

      if (msg.type === 'start_race') {
        setLobbyState('racing')
      }

      if (msg.type === 'players') {
        const all = (msg.players as RemotePlayer[]) ?? []
        setRemotePlayers(all.filter(p => p.id !== myIdRef.current))
      }

      if (msg.type === 'player_joined') {
        const p = msg.player as RemotePlayer
        if (p.id === myIdRef.current) return
        setRemotePlayers(prev => prev.find(r => r.id === p.id) ? prev : [...prev, p])
      }

      if (msg.type === 'player_left') {
        const leftId = msg.id as string
        setRemotePlayers(prev => prev.filter(p => p.id !== leftId))
      }
    }

    ws.onclose = () => { setConnected(false); setRemotePlayers([]); setCurrentRoom(null) }
    ws.onerror = () => setConnected(false)

    return () => ws.close()
  }, [])

  const sendUpdate = useCallback((x: number, y: number, z: number, angle: number, speed: number, laps: number, health: number) => {
    const now = Date.now()
    if (now - lastSendRef.current < SEND_INTERVAL_MS) return
    lastSendRef.current = now
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'update', x, y, z, angle, speed, laps, health }))
    }
  }, [])

  const createRoom = useCallback((name: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'create_room', name }))
  }, [])

  const joinRoom = useCallback((roomId: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'join_room', roomId }))
  }, [])

  const leaveRoom = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave_room' }))
    setCurrentRoom(null)
    setRemotePlayers([])
  }, [])

  const startRace = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'start_race' }))
  }, [])

  const claimHost = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'claim_host' }))
  }, [])

  return { 
    myId, myName, myColor, remotePlayers, connected, isHost, lobbyState, 
    currentRoom, rooms, startRace, claimHost, createRoom, joinRoom, leaveRoom, sendUpdate 
  }
}
