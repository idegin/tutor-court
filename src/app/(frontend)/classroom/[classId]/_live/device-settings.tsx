'use client'

import * as React from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  HiOutlineCog6Tooth,
  HiMiniVideoCamera,
  HiMiniMicrophone,
  HiOutlineSpeakerWave,
} from 'react-icons/hi2'
import type { LocalMedia } from './use-local-media'

/**
 * Device picker behind the lobby "Settings" button. Lists the real cameras,
 * mics and speakers from enumerateDevices and switches the live stream when a
 * different one is chosen. (Speaker labels/selection only appear where the
 * browser exposes audiooutput devices.)
 */
export function DeviceSettings({ media }: { media: LocalMedia }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
        >
          <HiOutlineCog6Tooth className="size-4" /> Settings
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 border-white/10 bg-neutral-900 text-white"
      >
        <p className="mb-3 text-sm font-semibold">Devices</p>
        <div className="space-y-3">
          <DeviceSelect
            icon={<HiMiniVideoCamera />}
            label="Camera"
            value={media.cameraId}
            options={media.cameras}
            disabled={media.permission !== 'granted' || media.cameras.length === 0}
            onChange={(id) => media.selectDevice('camera', id)}
          />
          <DeviceSelect
            icon={<HiMiniMicrophone />}
            label="Microphone"
            value={media.micId}
            options={media.mics}
            disabled={media.permission !== 'granted' || media.mics.length === 0}
            onChange={(id) => media.selectDevice('mic', id)}
          />
          <DeviceSelect
            icon={<HiOutlineSpeakerWave />}
            label="Speaker"
            value={media.speakerId}
            options={media.speakers}
            disabled={media.speakers.length === 0}
            onChange={(id) => media.selectDevice('speaker', id)}
          />
        </div>
        {media.permission !== 'granted' && (
          <p className="mt-3 text-xs text-white/40">
            Allow camera &amp; microphone access to choose devices.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

function DeviceSelect({
  icon,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  options: { deviceId: string; label: string }[]
  disabled?: boolean
  onChange: (id: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/60 [&_svg]:size-3.5">
        {icon} {label}
      </span>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50 [&>option]:bg-neutral-900"
      >
        {options.length === 0 && <option value="">Default</option>}
        {options.map((o) => (
          <option key={o.deviceId} value={o.deviceId}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
