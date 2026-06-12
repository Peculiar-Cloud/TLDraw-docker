import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type RoomSnapshot, TLSocketRoom } from '@tldraw/sync-core'
import type { TLRecord } from 'tldraw'
import type { RawData } from 'ws'
import type { AppConfig } from './config.js'
import { buildRoomPath, readJsonFile, safeStorageName, writeJsonFile } from './storage.js'

interface RoomState {
  id: string
  needsPersist: boolean
  room: TLSocketRoom<TLRecord, void>
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>()
  private mutex = Promise.resolve<Error | null>(null)

  constructor(private readonly config: AppConfig) {}

  async ensureStorage() {
    await mkdir(join(this.config.dataDir, 'rooms'), { recursive: true })
    await mkdir(join(this.config.dataDir, 'assets'), { recursive: true })
  }

  async makeOrLoadRoom(rawRoomId: string) {
    const roomId = safeStorageName(rawRoomId)

    this.mutex = this.mutex
      .then(async () => {
        const existingRoom = this.rooms.get(roomId)
        if (existingRoom && !existingRoom.room.isClosed()) {
          return null
        }

        const initialSnapshot = await readJsonFile<RoomSnapshot>(
          buildRoomPath(this.config.dataDir, roomId)
        )
        const roomState: RoomState = {
          id: roomId,
          needsPersist: false,
          room: new TLSocketRoom({
            initialSnapshot,
            onDataChange: () => {
              roomState.needsPersist = true
            },
            onSessionRemoved: (room, args) => {
              if (args.numSessionsRemaining === 0) {
                room.close()
              }
            },
          }),
        }

        this.rooms.set(roomId, roomState)
        return null
      })
      .catch((error: Error) => error)

    const error = await this.mutex
    if (error) throw error

    return this.rooms.get(roomId)?.room
  }

  async flushDirtyRooms() {
    const writes: Promise<void>[] = []

    for (const roomState of this.rooms.values()) {
      if (roomState.needsPersist) {
        roomState.needsPersist = false
        writes.push(this.persistRoom(roomState))
      }

      if (roomState.room.isClosed()) {
        this.rooms.delete(roomState.id)
      }
    }

    await Promise.all(writes)
  }

  collectMessages(socket: { on(event: 'message', listener: (message: RawData) => void): void }) {
    const messages: RawData[] = []
    const listener = (message: RawData) => messages.push(message)
    socket.on('message', listener)
    return { messages, listener }
  }

  private persistRoom(roomState: RoomState) {
    return writeJsonFile(
      buildRoomPath(this.config.dataDir, roomState.id),
      roomState.room.getCurrentSnapshot()
    )
  }
}
