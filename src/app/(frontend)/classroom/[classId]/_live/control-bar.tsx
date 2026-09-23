'use client'

import * as React from 'react'
import {
  HiMiniMicrophone,
  HiMiniVideoCamera,
  HiOutlineVideoCameraSlash,
  HiOutlineHandRaised,
  HiOutlineFaceSmile,
  HiOutlineChatBubbleOvalLeft,
  HiOutlinePhoneXMark,
  HiOutlineComputerDesktop,
} from 'react-icons/hi2'
import { LuMicOff, LuScreenShareOff } from 'react-icons/lu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CtrlButton } from './ui'
import { ReactionPicker } from './reactions'
import type { ReactionEmoji } from './types'

/**
 * The bottom media control bar (mobile-first). Core meeting actions live here;
 * people/whiteboard/credit live in the top bar so this row never overflows on a
 * 360px phone. Leave is isolated on the right with a red tone.
 */
export function ControlBar({
  micOn,
  camOn,
  screenOn,
  canShareScreen,
  isTutor,
  handRaised,
  unreadChat,
  onToggleMic,
  onToggleCam,
  onToggleScreen,
  onToggleHand,
  onReact,
  onToggleChat,
  onLeave,
}: {
  micOn: boolean
  camOn: boolean
  screenOn: boolean
  canShareScreen: boolean
  isTutor: boolean
  handRaised: boolean
  unreadChat: number
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleScreen: () => void
  onToggleHand: () => void
  onReact: (e: ReactionEmoji) => void
  onToggleChat: () => void
  onLeave: () => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const reactRef = React.useRef<HTMLDivElement>(null)

  // Close the reaction picker on an outside click or Escape — but NOT when a
  // reaction inside it is clicked, so the tutor can fire several in a row.
  React.useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!reactRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pickerOpen])

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      <CtrlButton
        label={micOn ? 'Mute' : 'Unmute'}
        caption={micOn ? 'Mute mic' : 'Unmute mic'}
        icon={micOn ? <HiMiniMicrophone /> : <LuMicOff />}
        tone={micOn ? 'default' : 'muted'}
        onClick={onToggleMic}
      />
      <CtrlButton
        label={camOn ? 'Turn camera off' : 'Turn camera on'}
        caption={camOn ? 'Stop video' : 'Start video'}
        icon={camOn ? <HiMiniVideoCamera /> : <HiOutlineVideoCameraSlash />}
        tone={camOn ? 'default' : 'muted'}
        onClick={onToggleCam}
      />

      {canShareScreen && (
        <CtrlButton
          label={screenOn ? 'Stop sharing' : 'Share screen'}
          caption={screenOn ? 'Stop sharing' : 'Share your screen'}
          icon={screenOn ? <LuScreenShareOff /> : <HiOutlineComputerDesktop />}
          tone={screenOn ? 'active' : 'default'}
          onClick={onToggleScreen}
        />
      )}

      <CtrlButton
        label={handRaised ? 'Lower hand' : 'Raise hand'}
        caption={handRaised ? 'Lower hand' : 'Raise hand'}
        icon={<HiOutlineHandRaised />}
        tone={handRaised ? 'active' : 'default'}
        onClick={onToggleHand}
      />

      <div className="relative" ref={reactRef}>
        <ReactionPicker open={pickerOpen} onPick={onReact} />
        <CtrlButton
          label="React"
          caption="Send a reaction"
          icon={<HiOutlineFaceSmile />}
          tone={pickerOpen ? 'active' : 'default'}
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((v) => !v)}
        />
      </div>

      <CtrlButton
        label="Chat"
        caption="Open chat"
        icon={<HiOutlineChatBubbleOvalLeft />}
        badge={unreadChat > 0 ? (unreadChat > 9 ? '9+' : unreadChat) : undefined}
        onClick={onToggleChat}
      />

      <CtrlButton
        label={isTutor ? 'End class' : 'Leave class'}
        caption={isTutor ? 'End class for everyone' : 'Leave'}
        icon={<HiOutlinePhoneXMark />}
        tone="danger"
        onClick={onLeave}
      />
    </div>
    </TooltipProvider>
  )
}
