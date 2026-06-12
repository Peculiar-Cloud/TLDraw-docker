import { resolve } from 'node:path'

export interface AppConfig {
  appName: string
  dataDir: string
  enableUnfurl: boolean
  licenseKey: string | null
  maxUploadBytes: number
  port: number
  trustedOrigins: string[]
}

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    appName: env.APP_NAME?.trim() || 'TLDraw Docker',
    dataDir: resolve(env.DATA_DIR || './data'),
    enableUnfurl: env.ENABLE_UNFURL === 'true',
    licenseKey: env.TLDRAW_LICENSE_KEY?.trim() || null,
    maxUploadBytes: parsePositiveInteger(env.MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
    port: parsePositiveInteger(env.PORT, 5858),
    trustedOrigins: parseTrustedOrigins(env.TRUSTED_ORIGINS || '*'),
  }
}

export function parseTrustedOrigins(value: string) {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback

  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

export function isOriginAllowed(origin: string | undefined, trustedOrigins: string[]) {
  if (trustedOrigins.includes('*')) return true
  if (!origin) return true
  return trustedOrigins.includes(origin)
}
