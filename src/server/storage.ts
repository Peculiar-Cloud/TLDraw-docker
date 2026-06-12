import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve } from 'node:path'
import { Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export function safeStorageName(input: string) {
  const decoded = decodeURIComponent(input)
  const normalized = decoded
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/, '')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 160)

  if (!normalized) {
    throw new Error('Storage name cannot be empty.')
  }

  return normalized
}

export function safeJoin(baseDir: string, unsafeName: string) {
  const base = resolve(baseDir)
  const target = resolve(base, normalize(safeStorageName(unsafeName)))

  if (!target.startsWith(`${base}/`) && target !== base) {
    throw new Error('Resolved path escaped the storage directory.')
  }

  return target
}

export async function readJsonFile<T>(path: string): Promise<T | undefined> {
  try {
    const data = await readFile(path, 'utf8')
    return JSON.parse(data) as T
  } catch {
    return undefined
  }
}

export async function writeJsonFile(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value), 'utf8')
}

export async function writeLimitedStream(
  path: string,
  stream: NodeJS.ReadableStream,
  maxBytes: number
) {
  await mkdir(dirname(path), { recursive: true })

  let bytes = 0
  const limiter = new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
      bytes += chunk.byteLength
      if (bytes > maxBytes) {
        callback(new Error(`Upload exceeds ${maxBytes} bytes.`))
        return
      }
      callback(null, chunk)
    },
  })

  try {
    await pipeline(stream, limiter, createWriteStream(path, { flags: 'wx' }))
  } catch (error) {
    await rm(path, { force: true })
    throw error
  }
}

export function buildRoomPath(dataDir: string, roomId: string) {
  return safeJoin(join(dataDir, 'rooms'), `${roomId}.json`)
}

export function buildAssetPath(dataDir: string, assetId: string) {
  return safeJoin(join(dataDir, 'assets'), assetId)
}
