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
} from 'react-icons/hi2'
import { LuMicOff } from 'react-icons/lu'
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
  handRaised,
  unreadChat,
  onToggleMic,
  onToggleCam,
  onToggleHand,
  onReact,
  onToggleChat,
  onLeave,
}: {
  micOn: boolean
  camOn: boolean
  handRaised: boolean
  unreadChat: number
  onToggleMic: () => void
  onToggleCam: () => void
  onToggleHand: () => void
  onReact: (e: ReactionEmoji) => void
  onToggleChat: () => void
  onLeave: () => void
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)

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
      <CtrlButton
        label={handRaised ? 'Lower hand' : 'Raise hand'}
        caption={handRaised ? 'Lower hand' : 'Raise hand'}
        icon={<HiOutlineHandRaised />}
        tone={handRaised ? 'active' : 'default'}
        onClick={onToggleHand}
      />

      <div className="relative">
        <ReactionPicker open={pickerOpen} onPick={(e) => { onReact(e); setPickerOpen(false) }} />
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
        label="Leave class"
        caption="Leave"
        icon={<HiOutlinePhoneXMark />}
        tone="danger"
        onClick={onLeave}
      />
    </div>
    </TooltipProvider>
  )
}
