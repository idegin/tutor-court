import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { Server } from 'socket.io'
import { verifySocketToken } from '@/lib/live/socket-auth'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
  PresenceData,
  RoomParticipant,
  SocketTokenClaims,
  WhiteboardMessage,
} from '@/lib/live/socket-types'

// Custom Next.js server that also hosts the live-classroom realtime plane over
// Socket.IO — the replacement for Ably (data) + the Cloudflare SFU (media). Media
// is peer-to-peer (this server only relays WebRTC signalling); presence, chat,
// reactions, moderation control, and whiteboard ops ride Socket.IO events.
//
// Authorization is delegated to the Next API route /api/live/socket-token, which
// runs the full Payload membership check and hands the client a signed token; we
// only verify the signature here. Room state is in-memory (ephemeral), which
// matches the previous behaviour (Ably rewind for chat/whiteboard, presence as
// live-only). Durable state (whiteboard boards + stroke snapshots, billing,
// attendance, notifications) is untouched — it flows through the existing HTTP
// routes and Payload collections.

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Mesh WebRTC gets heavy beyond ~12–16 peers; guard the room instead of melting.
// Tutoring is overwhelmingly 1-on-1 / small groups, so this is a generous cap.
const MAX_PEERS = 16
const MAX_CHAT_BUFFER = 100 // recent messages replayed to a late joiner
const MAX_WB_BUFFER = 2000 // recent whiteboard ops replayed to a late joiner

interface Member {
  socketId: string
  userId: string
  isHost: boolean
  canPublish: boolean
  presence: PresenceData
}

interface Room {
  members: Map<string, Member> // keyed by userId (one connection per user)
  chat: ChatMessagePayload[]
  whiteboard: WhiteboardMessage[]
  whiteboardWritable: boolean
}

const rooms = new Map<string, Room>()

function getRoom(id: string): Room {
  let room = rooms.get(id)
  if (!room) {
    room = { members: new Map(), chat: [], whiteboard: [], whiteboardWritable: false }
    rooms.set(id, room)
  }
  return room
}

function rosterOf(room: Room): RoomParticipant[] {
  return [...room.members.values()].map((m) => ({ id: m.userId, isLocal: false, ...m.presence }))
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    // Health / keep-awake endpoint for Fly health checks.
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
      res.end('ok')
      return
    }
    handle(req, res, parse(req.url || '/', true))
  })

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    maxHttpBufferSize: 2e6,
    // Behind Fly's proxy; WebSocket first, long-polling fallback.
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket) => {
    let sessionId: string | null = null
    let claims: SocketTokenClaims | null = null

    const room = () => (sessionId ? rooms.get(sessionId) : undefined)
    const self = () => {
      const r = room()
      return r && claims ? r.members.get(claims.sub) : undefined
    }

    socket.on('join', ({ token }) => {
      const verified = verifySocketToken(token)
      if (!verified) {
        socket.emit('denied', { message: 'Your session token is invalid or expired.' })
        socket.disconnect(true)
        return
      }
      claims = verified
      sessionId = verified.sid
      const r = getRoom(sessionId)

      // Evict any stale connection from the same user (a reconnect after a
      // network blip re-joins with a new socket id; without this the ghost would
      // linger in presence and count against MAX_PEERS).
      const stale = r.members.get(verified.sub)
      if (stale && stale.socketId !== socket.id) {
        io.sockets.sockets.get(stale.socketId)?.disconnect(true)
        r.members.delete(verified.sub)
      }

      if (r.members.size >= MAX_PEERS && !r.members.has(verified.sub)) {
        console.warn(`[live-socket] room ${sessionId} full (${MAX_PEERS}) — refusing ${verified.sub}`)
        socket.emit('denied', { message: 'This class has reached the maximum number of participants.' })
        socket.disconnect(true)
        return
      }

      // The host's token reflects the session's writable state at mint time; seed
      // the room from the first member to arrive, then it's driven live below.
      if (r.members.size === 0) r.whiteboardWritable = verified.whiteboardWritable

      socket.join(sessionId)
      const member: Member = {
        socketId: socket.id,
        userId: verified.sub,
        isHost: verified.isHost,
        canPublish: verified.canPublish,
        presence: {
          name: verified.name,
          accountType: verified.accountType,
          role: verified.role,
          micOn: true,
          camOn: true,
          handRaisedAt: null,
        },
      }
      const peers = rosterOf(r)
      r.members.set(verified.sub, member)

      // Snapshot to the newcomer, then announce the new roster to everyone.
      socket.emit('joined', {
        self: { id: member.userId, isLocal: true, ...member.presence },
        peers,
        chat: r.chat,
        whiteboard: r.whiteboard,
        whiteboardWritable: r.whiteboardWritable,
      })
      io.to(sessionId).emit('roster', rosterOf(r))
    })

    // Relay WebRTC signalling to the target user's socket (media is P2P).
    socket.on('signal', ({ to, data }) => {
      const r = room()
      if (!r || !claims) return
      const target = r.members.get(to)
      if (!target) return
      io.to(target.socketId).emit('signal', { from: claims.sub, data })
    })

    socket.on('presence', (patch) => {
      const me = self()
      const r = room()
      if (!me || !r || !sessionId) return
      // Only these fields are self-updatable; identity/role come from the token.
      if (typeof patch.micOn === 'boolean') me.presence.micOn = patch.micOn
      if (typeof patch.camOn === 'boolean') me.presence.camOn = patch.camOn
      if ('handRaisedAt' in patch) me.presence.handRaisedAt = patch.handRaisedAt ?? null
      io.to(sessionId).emit('roster', rosterOf(r))
    })

    socket.on('chat', (msg) => {
      const me = self()
      const r = room()
      if (!me || !r || !sessionId) return
      const body = String(msg?.body ?? '').trim().slice(0, 2000)
      if (!body) return
      // Trust the sender identity from the token, not the payload.
      const message: ChatMessagePayload = {
        id: String(msg.id || `${claims!.sub}-${Date.now()}`),
        senderId: claims!.sub,
        senderName: me.presence.name,
        senderAccountType: me.presence.accountType,
        body,
        sentAt: Number(msg.sentAt) || Date.now(),
      }
      r.chat.push(message)
      if (r.chat.length > MAX_CHAT_BUFFER) r.chat.shift()
      io.to(sessionId).emit('chat', message)
    })

    socket.on('reaction', ({ emoji }) => {
      const me = self()
      if (!me || !sessionId) return
      const e = String(emoji ?? '').slice(0, 8)
      if (!e) return
      io.to(sessionId).emit('reaction', { emoji: e, from: claims!.sub })
    })

    // Host-only moderation control (mute / remove / promote / demote). The
    // authoritative DB write happens in /api/live/moderate; this is the instant
    // signal to clients. For 'remove' we also force-disconnect the target.
    socket.on('control', ({ action, data }) => {
      const me = self()
      const r = room()
      if (!me || !r || !sessionId || !me.isHost) return
      io.to(sessionId).emit('control', { action, data, from: claims!.sub })
      if (action === 'remove' && data?.targetId) {
        const target = r.members.get(String(data.targetId))
        if (target) io.sockets.sockets.get(target.socketId)?.disconnect(true)
      }
    })

    socket.on('whiteboard', ({ op }) => {
      const me = self()
      const r = room()
      if (!me || !r || !sessionId || !op) return
      const kind = op.kind

      // Presentation controls (show/active/writable/create) are host-only. A
      // stroke ('op'): host always draws; a non-host draws only while the host
      // has enabled writable AND they're a publisher (not an observing parent).
      if (kind !== 'op') {
        if (!me.isHost) return
        if (kind === 'writable') r.whiteboardWritable = Boolean(op.on)
      } else {
        const mayDraw = me.isHost || (me.canPublish && r.whiteboardWritable)
        if (!mayDraw) return
      }

      // Buffer EVERY accepted message (strokes + show/active/create) so a late
      // joiner replays the current board state — mirrors the old Ably rewind.
      r.whiteboard.push(op)
      if (r.whiteboard.length > MAX_WB_BUFFER) r.whiteboard.shift()
      io.to(sessionId).emit('whiteboard', { op, from: claims!.sub })
    })

    socket.on('disconnect', () => {
      const r = room()
      if (!r || !claims || !sessionId) return
      const me = r.members.get(claims.sub)
      // Only clear if THIS socket is still the current one (a fast reconnect may
      // have already replaced us with a new socket).
      if (me && me.socketId === socket.id) {
        r.members.delete(claims.sub)
        io.to(sessionId).emit('roster', rosterOf(r))
      }
      if (r.members.size === 0) rooms.delete(sessionId)
    })
  })

  httpServer.listen(port, hostname, () => {
    console.log(`▶ Tutor Court ready on http://${hostname}:${port}  (${dev ? 'dev' : 'production'})`)
  })
})
