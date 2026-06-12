import { getAssetUrlsByMetaUrl } from '@tldraw/assets/urls'
import { useSync } from '@tldraw/sync'
import { useEffect, useMemo, useState } from 'react'
import {
  AssetRecordType,
  getHashForString,
  type TLAssetStore,
  type TLBookmarkAsset,
  Tldraw,
  uniqueId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './styles.css'

interface ClientConfig {
  appName: string
  enableUnfurl: boolean
  licenseKey: string | null
  maxUploadBytes: number
}

const assetUrls = getAssetUrlsByMetaUrl()
const defaultConfig: ClientConfig = {
  appName: 'TLDraw Docker',
  enableUnfurl: false,
  licenseKey: null,
  maxUploadBytes: 52_428_800,
}

function getHttpOrigin() {
  const configured = import.meta.env.VITE_SERVER_ORIGIN as string | undefined
  return configured ?? window.location.origin
}

function getWsOrigin() {
  const origin = getHttpOrigin()
  if (origin.startsWith('https://')) return origin.replace('https://', 'wss://')
  if (origin.startsWith('http://')) return origin.replace('http://', 'ws://')
  return origin
}

function getInitialRoomId() {
  const pathRoomId = decodeURIComponent(window.location.pathname.replace(/^\/+/, '')).trim()
  if (pathRoomId) return pathRoomId

  const storedRoomId = window.localStorage.getItem('tldraw-room-id')
  if (storedRoomId) {
    window.history.replaceState(null, '', `/${encodeURIComponent(storedRoomId)}`)
    return storedRoomId
  }

  const roomId = `room-${uniqueId()}`
  window.localStorage.setItem('tldraw-room-id', roomId)
  window.history.replaceState(null, '', `/${encodeURIComponent(roomId)}`)
  return roomId
}

async function loadConfig(): Promise<ClientConfig> {
  const response = await fetch(`${getHttpOrigin()}/api/config`)
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status}`)
  }

  return { ...defaultConfig, ...(await response.json()) }
}

export function App() {
  const [roomId, setRoomId] = useState(getInitialRoomId)
  const [config, setConfig] = useState<ClientConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Failed to load configuration')
      })
  }, [])

  const roomUrl = useMemo(() => {
    return `${getWsOrigin()}/api/connect/${encodeURIComponent(roomId)}`
  }, [roomId])

  if (error) {
    return <StatusScreen title="Configuration Error" message={error} />
  }

  if (!config) {
    return <StatusScreen title="Loading" message="Starting the canvas." />
  }

  return (
    <RoomCanvas
      config={config}
      roomId={roomId}
      roomUrl={roomUrl}
      onNewRoom={() => {
        const nextRoomId = `room-${uniqueId()}`
        window.localStorage.setItem('tldraw-room-id', nextRoomId)
        window.history.pushState(null, '', `/${encodeURIComponent(nextRoomId)}`)
        setRoomId(nextRoomId)
      }}
    />
  )
}

function RoomCanvas({
  config,
  roomId,
  roomUrl,
  onNewRoom,
}: {
  config: ClientConfig
  roomId: string
  roomUrl: string
  onNewRoom: () => void
}) {
  const store = useSync({
    uri: roomUrl,
    assets: createAssetStore(config),
  })

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">T</span>
          <span>{config.appName}</span>
        </div>
        <div className="room-pill" title={roomId}>
          {roomId}
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(window.location.href)}
          >
            Copy link
          </button>
          <button type="button" onClick={onNewRoom}>
            New room
          </button>
        </div>
      </header>
      <main className="canvas">
        <Tldraw
          store={store}
          assetUrls={assetUrls}
          deepLinks
          licenseKey={config.licenseKey ?? undefined}
          onMount={(editor) => {
            if (config.enableUnfurl) {
              editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
            }
          }}
        />
      </main>
    </div>
  )
}

function createAssetStore(config: ClientConfig): TLAssetStore {
  return {
    async upload(_asset, file) {
      if (file.size > config.maxUploadBytes) {
        throw new Error(`Upload exceeds the configured ${config.maxUploadBytes} byte limit.`)
      }

      const extension = file.name.includes('.') ? `.${file.name.split('.').pop()}` : ''
      const assetId = `${uniqueId()}${extension.replace(/[^a-zA-Z0-9.]/g, '')}`
      const url = `${getHttpOrigin()}/api/uploads/${encodeURIComponent(assetId)}`
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload asset: ${response.status}`)
      }

      return { src: url }
    },
    resolve(asset) {
      return asset.props.src
    },
  }
}

async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: 'asset',
    type: 'bookmark',
    meta: {},
    props: {
      src: url,
      description: '',
      image: '',
      favicon: '',
      title: '',
    },
  }

  try {
    const response = await fetch(`${getHttpOrigin()}/api/unfurl?url=${encodeURIComponent(url)}`)
    if (!response.ok) return asset

    const data = await response.json()
    asset.props.description = data?.description ?? ''
    asset.props.image = data?.image ?? ''
    asset.props.favicon = data?.favicon ?? ''
    asset.props.title = data?.title ?? ''
  } catch (cause) {
    console.error(cause)
  }

  return asset
}

function StatusScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="status-screen">
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  )
}
