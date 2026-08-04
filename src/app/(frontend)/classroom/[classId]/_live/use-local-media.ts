'use client'

import * as React from 'react'

// Real device media for the local user. This is fully client-side (getUserMedia
// / enumerateDevices / Web Audio) so it works on Vercel with no backend — it's
// what powers the live self-preview, the permission prompt, the device picker,
// and the mic level meter. When the SFU lands, this same MediaStream is what we
// publish to Cloudflare Realtime.

export type MediaPermission = 'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported'

export interface DeviceOption {
  deviceId: string
  label: string
}

export interface LocalMedia {
  stream: MediaStream | null
  permission: MediaPermission
  error: string | null
  micOn: boolean
  camOn: boolean
  /** 0..1 smoothed microphone level for the meter. */
  level: number
  cameras: DeviceOption[]
  mics: DeviceOption[]
  speakers: DeviceOption[]
  cameraId?: string
  micId?: string
  speakerId?: string
  ensureAccess: () => Promise<void>
  toggleMic: () => void
  toggleCam: () => void
  selectDevice: (kind: 'camera' | 'mic' | 'speaker', deviceId: string) => void
  stop: () => void
}

function humanizeError(e: unknown): string {
  const err = e as DOMException
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera and microphone access was blocked. Allow it in your browser to join with video.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera or microphone was found on this device.'
    case 'NotReadableError':
      return 'Your camera or mic is being used by another app. Close it and try again.'
    default:
      return 'Could not access your camera and microphone.'
  }
}

export function useLocalMedia(): LocalMedia {
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const [permission, setPermission] = React.useState<MediaPermission>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [micOn, setMicOn] = React.useState(true)
  const [camOn, setCamOn] = React.useState(true)
  const [level, setLevel] = React.useState(0)
  const [cameras, setCameras] = React.useState<DeviceOption[]>([])
  const [mics, setMics] = React.useState<DeviceOption[]>([])
  const [speakers, setSpeakers] = React.useState<DeviceOption[]>([])
  const [cameraId, setCameraId] = React.useState<string>()
  const [micId, setMicId] = React.useState<string>()
  const [speakerId, setSpeakerId] = React.useState<string>()

  const streamRef = React.useRef<MediaStream | null>(null)
  const acRef = React.useRef<AudioContext | null>(null)
  const rafRef = React.useRef<number>(0)
  // mirror toggle state into refs so re-acquiring a stream applies them
  const micOnRef = React.useRef(micOn)
  const camOnRef = React.useRef(camOn)
  micOnRef.current = micOn
  camOnRef.current = camOn

  const stopMeter = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    acRef.current?.close().catch(() => {})
    acRef.current = null
  }, [])

  const startMeter = React.useCallback(
    (s: MediaStream) => {
      stopMeter()
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AC || s.getAudioTracks().length === 0) return
      const ac = new AC()
      acRef.current = ac
      const src = ac.createMediaStreamSource(s)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let smooth = 0
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        smooth = smooth * 0.8 + rms * 0.2
        setLevel(micOnRef.current ? Math.min(1, smooth * 3.2) : 0)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [stopMeter],
  )

  const refreshDevices = React.useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      const map = (d: MediaDeviceInfo, fallback: string, i: number): DeviceOption => ({
        deviceId: d.deviceId,
        label: d.label || `${fallback} ${i + 1}`,
      })
      setCameras(list.filter((d) => d.kind === 'videoinput').map((d, i) => map(d, 'Camera', i)))
      setMics(list.filter((d) => d.kind === 'audioinput').map((d, i) => map(d, 'Microphone', i)))
      setSpeakers(list.filter((d) => d.kind === 'audiooutput').map((d, i) => map(d, 'Speaker', i)))
    } catch {
      /* ignore */
    }
  }, [])

  const acquire = React.useCallback(
    async (overrides?: { cameraId?: string; micId?: string }) => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setPermission('unsupported')
        setError('This browser does not support camera and microphone access.')
        return
      }
      setPermission((p) => (p === 'granted' ? p : 'prompting'))
      const camWanted = overrides?.cameraId ?? cameraId
      const micWanted = overrides?.micId ?? micId
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: camWanted ? { exact: camWanted } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            deviceId: micWanted ? { exact: micWanted } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
          },
        })
        // stop any previous stream before swapping
        streamRef.current?.getTracks().forEach((t) => t.stop())
        next.getAudioTracks().forEach((t) => (t.enabled = micOnRef.current))
        next.getVideoTracks().forEach((t) => (t.enabled = camOnRef.current))
        streamRef.current = next
        setStream(next)
        setPermission('granted')
        setError(null)
        const v = next.getVideoTracks()[0]?.getSettings().deviceId
        const a = next.getAudioTracks()[0]?.getSettings().deviceId
        if (v) setCameraId(v)
        if (a) setMicId(a)
        startMeter(next)
        refreshDevices()
      } catch (e) {
        setPermission('denied')
        setError(humanizeError(e))
      }
    },
    [cameraId, micId, startMeter, refreshDevices],
  )

  const ensureAccess = React.useCallback(async () => {
    if (streamRef.current) return
    await acquire()
  }, [acquire])

  const toggleMic = React.useCallback(() => {
    setMicOn((v) => {
      const next = !v
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
      if (!next) setLevel(0)
      return next
    })
  }, [])

  const toggleCam = React.useCallback(() => {
    setCamOn((v) => {
      const next = !v
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
      return next
    })
  }, [])

  const selectDevice = React.useCallback(
    (kind: 'camera' | 'mic' | 'speaker', deviceId: string) => {
      if (kind === 'speaker') {
        setSpeakerId(deviceId)
        return
      }
      if (kind === 'camera') {
        setCameraId(deviceId)
        acquire({ cameraId: deviceId })
      } else {
        setMicId(deviceId)
        acquire({ micId: deviceId })
      }
    },
    [acquire],
  )

  const stop = React.useCallback(() => {
    stopMeter()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [stopMeter])

  // Cleanup on unmount.
  React.useEffect(() => {
    return () => {
      stopMeter()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [stopMeter])

  // Keep the device list fresh when hardware changes.
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return
    const handler = () => refreshDevices()
    navigator.mediaDevices.addEventListener?.('devicechange', handler)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', handler)
  }, [refreshDevices])

  return {
    stream,
    permission,
    error,
    micOn,
    camOn,
    level,
    cameras,
    mics,
    speakers,
    cameraId,
    micId,
    speakerId,
    ensureAccess,
    toggleMic,
    toggleCam,
    selectDevice,
    stop,
  }
}
