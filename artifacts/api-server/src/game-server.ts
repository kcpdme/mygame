import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import { logger } from './lib/logger'

interface PlayerState {
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

interface ConnectedPlayer {
  ws:    WebSocket
  state: PlayerState
  roomId: string | null
}

interface Room {
  id:         string
  name:       string
  hostId:     string
  lobbyState: 'lobby' | 'racing'
  players:    Map<string, ConnectedPlayer>
}

const COLORS = [
  '#ff4455', '#44aaff', '#44ff88', '#ffaa22',
  '#ff44ee', '#22ffee', '#ffff33', '#ff8844',
  '#88ff44', '#aa44ff', '#ff6622', '#22ffbb',
]

const ADJECTIVES = ['Fast', 'Wild', 'Swift', 'Turbo', 'Crazy', 'Neon', 'Drift', 'Blaze', 'Storm', 'Rogue', 'Hyper', 'Sonic', 'Ghost', 'Savage']
const NOUNS = ['Lion', 'Eagle', 'Wolf', 'Tiger', 'Hawk', 'Bear', 'Fox', 'Cobra', 'Shark', 'Falcon', 'Viper', 'Puma', 'Rhino', 'Bison']

function randomName(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  const num  = Math.floor(Math.random() * 99) + 1
  return `${adj}${noun}${num}`
}

function pickColor(usedColors: string[]): string {
  const available = COLORS.filter(c => !usedColors.includes(c))
  const pool = available.length > 0 ? available : COLORS
  return pool[Math.floor(Math.random() * pool.length)]
}

const rooms = new Map<string, Room>()
const globalPlayers = new Map<string, ConnectedPlayer>()

function broadcastToRoom(roomId: string, data: unknown): void {
  const room = rooms.get(roomId)
  if (!room) return
  const msg = JSON.stringify(data)
  for (const { ws } of room.players.values()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg)
  }
}

function broadcastToRoomExcept(roomId: string, data: unknown, excludeId: string): void {
  const room = rooms.get(roomId)
  if (!room) return
  const msg = JSON.stringify(data)
  for (const [id, { ws }] of room.players.entries()) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) ws.send(msg)
  }
}

function getRoomList() {
  return Array.from(rooms.values()).map(r => ({
    id: r.id,
    name: r.name,
    playerCount: r.players.size,
    lobbyState: r.lobbyState
  }))
}

function sendRoomList(ws: WebSocket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'room_list', rooms: getRoomList() }))
  }
}

function broadcastRoomList() {
  const list = getRoomList()
  const msg = JSON.stringify({ type: 'room_list', rooms: list })
  for (const p of globalPlayers.values()) {
    if (!p.roomId && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg)
    }
  }
}

export function attachGameServer(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/api/ws' })

  // Periodic broadcast of player states within rooms
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.players.size > 0) {
        const states = Array.from(room.players.values()).map(p => p.state)
        broadcastToRoom(room.id, { type: 'players', players: states })
      }
    }
  }, 50)

  wss.on('connection', (ws: WebSocket) => {
    const id = crypto.randomUUID()
    const player: ConnectedPlayer = {
      ws,
      roomId: null,
      state: {
        id,
        name: randomName(),
        color: '#ff4455',
        x: 0, y: 0.55, z: 0,
        angle: 0, speed: 0, laps: 0, health: 3
      }
    }
    
    globalPlayers.set(id, player)
    logger.info({ id }, 'Client connected to server')

    // Initial room list
    sendRoomList(ws)

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())

        if (msg.type === 'create_room') {
          const roomId = crypto.randomUUID()
          const roomName = typeof msg.name === 'string' ? msg.name.trim().slice(0, 20) : `${player.state.name}'s Room`
          
          const newRoom: Room = {
            id: roomId,
            name: roomName || 'New Race',
            hostId: id,
            lobbyState: 'lobby',
            players: new Map()
          }
          
          rooms.set(roomId, newRoom)
          logger.info({ roomId, host: player.state.name }, 'Room created')
          
          // Auto-join the creator
          joinRoom(id, roomId)
          broadcastRoomList()
        }

        if (msg.type === 'join_room') {
          joinRoom(id, msg.roomId)
          broadcastRoomList()
        }

        if (msg.type === 'leave_room') {
          leaveRoom(id)
          broadcastRoomList()
          sendRoomList(ws)
        }

        if (msg.type === 'start_race') {
          if (player.roomId) {
            const room = rooms.get(player.roomId)
            if (room && room.hostId === id) {
              room.lobbyState = 'racing'
              broadcastToRoom(room.id, { type: 'start_race' })
              broadcastRoomList()
            }
          }
        }

        if (msg.type === 'claim_host') {
          if (player.roomId) {
            const room = rooms.get(player.roomId)
            if (room) {
              room.hostId = id
              broadcastToRoom(room.id, { type: 'host_assigned', hostId: id })
            }
          }
        }

        if (msg.type === 'update' && player.roomId) {
          const s = player.state
          if (typeof msg.x === 'number') s.x = msg.x
          if (typeof msg.y === 'number') s.y = msg.y
          if (typeof msg.z === 'number') s.z = msg.z
          if (typeof msg.angle === 'number') s.angle = msg.angle
          if (typeof msg.speed === 'number') s.speed = msg.speed
          if (typeof msg.laps === 'number') s.laps = msg.laps
          if (typeof msg.health === 'number') s.health = msg.health
        }

        if (msg.type === 'join' && typeof msg.name === 'string') {
          const trimmed = msg.name.trim().slice(0, 18)
          if (trimmed.length > 0) player.state.name = trimmed
        }

      } catch (err) {
        logger.error({ err }, 'Error handling message')
      }
    })

    ws.on('close', () => {
      leaveRoom(id)
      globalPlayers.delete(id)
      broadcastRoomList()
    })

    function joinRoom(playerId: string, roomId: string) {
      const p = globalPlayers.get(playerId)
      const room = rooms.get(roomId)
      if (!p || !room) return

      leaveRoom(playerId) // Leave current room if any

      const usedColors = Array.from(room.players.values()).map(rp => rp.state.color)
      p.state.color = pickColor(usedColors)
      p.roomId = roomId
      room.players.set(playerId, p)

      ws.send(JSON.stringify({
        type: 'welcome',
        id: p.state.id,
        name: p.state.name,
        color: p.state.color,
        isHost: room.hostId === playerId,
        lobbyState: room.lobbyState,
        roomId: room.id,
        roomName: room.name,
        players: Array.from(room.players.values()).map(rp => rp.state)
      }))

      broadcastToRoomExcept(roomId, { type: 'player_joined', player: p.state }, playerId)
    }

    function leaveRoom(playerId: string) {
      const p = globalPlayers.get(playerId)
      if (!p || !p.roomId) return

      const room = rooms.get(p.roomId)
      if (room) {
        room.players.delete(playerId)
        broadcastToRoom(room.id, { type: 'player_left', id: playerId })

        if (room.players.size === 0) {
          rooms.delete(room.id)
        } else if (room.hostId === playerId) {
          // Assign new host
          const nextHostId = room.players.keys().next().value
          room.hostId = nextHostId
          const nextHost = room.players.get(nextHostId)
          if (nextHost) {
            nextHost.ws.send(JSON.stringify({ type: 'host_assigned', hostId: nextHostId }))
          }
        }
      }
      p.roomId = null
    }
  })

  logger.info('Multi-Room Game Server Ready')
}
