import { access, constants } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import websocketPlugin from '@fastify/websocket'
import fastify, { type FastifyRequest } from 'fastify'
import { loadAsset, storeAsset } from './assets.js'
import { isOriginAllowed, loadConfig } from './config.js'
import { RoomManager } from './rooms.js'
import { unfurlBookmark } from './unfurl.js'

const config = loadConfig()
const roomManager = new RoomManager(config)
const app = fastify({ logger: true, bodyLimit: config.maxUploadBytes })

await roomManager.ensureStorage()

app.register(websocketPlugin)
app.register(cors, {
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin, config.trustedOrigins))
  },
})

app.addContentTypeParser('*', (_request, _payload, done) => {
  done(null)
})

app.get('/healthz', async () => ({ ok: true }))

app.get('/readyz', async (_request, reply) => {
  try {
    await access(config.dataDir, constants.R_OK | constants.W_OK)
    return { ok: true }
  } catch {
    return reply.code(503).send({ ok: false })
  }
})

app.get('/api/config', async () => ({
  appName: config.appName,
  enableUnfurl: config.enableUnfurl,
  licenseKey: config.licenseKey,
  maxUploadBytes: config.maxUploadBytes,
}))

app.get('/api/connect/:roomId', { websocket: true }, async (socket, request) => {
  if (!isOriginAllowed(request.headers.origin, config.trustedOrigins)) {
    socket.close(1008, 'Origin is not allowed.')
    return
  }

  const roomId = readRouteParam(request, 'roomId')
  const sessionId = readQueryValue(request, 'sessionId') || crypto.randomUUID()
  const caught = roomManager.collectMessages(socket)

  const room = await roomManager.makeOrLoadRoom(roomId)
  if (!room) {
    socket.close(1011, 'Room could not be loaded.')
    return
  }

  room.handleSocketConnect({ sessionId, socket })
  socket.off('message', caught.listener)

  for (const message of caught.messages) {
    socket.emit('message', message)
  }
})

app.put('/api/uploads/:assetId', async (request, reply) => {
  try {
    await storeAsset(config, readRouteParam(request, 'assetId'), request)
    return { ok: true }
  } catch (error) {
    request.log.warn({ error }, 'asset upload failed')
    return reply.code(400).send({ ok: false })
  }
})

app.get('/api/uploads/:assetId', async (request, reply) => {
  try {
    const data = await loadAsset(config, readRouteParam(request, 'assetId'))
    return reply.send(data)
  } catch {
    return reply.code(404).send({ ok: false })
  }
})

app.get('/api/unfurl', async (request, reply) => {
  if (!config.enableUnfurl) {
    return reply.code(404).send({ ok: false })
  }

  const url = readQueryValue(request, 'url')
  if (!url) {
    return reply.code(400).send({ ok: false })
  }

  try {
    return await unfurlBookmark(url)
  } catch (error) {
    request.log.warn({ error }, 'unfurl failed')
    return reply.code(400).send({ ok: false })
  }
})

if (process.env.NODE_ENV === 'production') {
  const serverDir = dirname(fileURLToPath(import.meta.url))
  const clientDir = resolve(serverDir, '..', 'client')

  app.register(staticPlugin, {
    root: clientDir,
    prefix: '/',
  })

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) {
      return reply.sendFile('index.html')
    }

    return reply.code(404).send({ ok: false })
  })
}

const persistInterval = setInterval(() => {
  roomManager.flushDirtyRooms().catch((error: unknown) => {
    app.log.error({ error }, 'failed to persist rooms')
  })
}, 2000)

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

await app.listen({ host: '0.0.0.0', port: config.port })

async function shutdown(signal: string) {
  app.log.info({ signal }, 'shutting down')
  clearInterval(persistInterval)
  await roomManager.flushDirtyRooms()
  await app.close()
  process.exit(0)
}

function readRouteParam(request: FastifyRequest, key: string) {
  const value = (request.params as Record<string, string | undefined>)[key]
  if (!value) throw new Error(`Missing route parameter: ${key}`)
  return value
}

function readQueryValue(request: FastifyRequest, key: string) {
  const value = (request.query as Record<string, string | undefined>)[key]
  return typeof value === 'string' ? value : undefined
}
