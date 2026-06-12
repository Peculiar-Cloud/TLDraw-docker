import { readFile } from 'node:fs/promises'
import type { FastifyRequest } from 'fastify'
import type { AppConfig } from './config.js'
import { buildAssetPath, writeLimitedStream } from './storage.js'

export async function storeAsset(config: AppConfig, assetId: string, request: FastifyRequest) {
  const contentLength = Number.parseInt(String(request.headers['content-length'] ?? '0'), 10)
  if (Number.isFinite(contentLength) && contentLength > config.maxUploadBytes) {
    throw new Error(`Upload exceeds ${config.maxUploadBytes} bytes.`)
  }

  await writeLimitedStream(
    buildAssetPath(config.dataDir, assetId),
    request.raw,
    config.maxUploadBytes
  )
}

export async function loadAsset(config: AppConfig, assetId: string) {
  return readFile(buildAssetPath(config.dataDir, assetId))
}
