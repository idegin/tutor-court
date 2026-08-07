import Link from 'next/link'
import {
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
  HiOutlineSignal,
  HiArrowLeft,
} from 'react-icons/hi2'

export type UnavailableReason =
  | 'not_configured'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'

const COPY: Record<UnavailableReason, { icon: React.ReactNode; title: string; body: string }> = {
  not_configured: {
    icon: <HiOutlineSignal />,
    title: 'Live classes are temporarily unavailable',
    body: "We're bringing the live-class service online. Please try again shortly — you have not been charged.",
  },
  unauthenticated: {
    icon: <HiOutlineLockClosed />,
    title: 'Please sign in to join this class',
    body: 'You need to be signed in to your account to enter the live classroom.',
  },
  forbidden: {
    icon: <HiOutlineLockClosed />,
    title: "You're not part of this class",
    body: 'Only the class tutor, an enrolled student, or a linked parent can join this live session.',
  },
  not_found: {
    icon: <HiOutlineExclamationTriangle />,
    title: 'Class not found',
    body: 'This class no longer exists or the link is incorrect.',
  },
}

/**
 * Shown instead of the room when it can't be entered. Critically, when the
 * backend keys are missing we surface THIS (a clear, honest "unavailable"
 * state) rather than a simulated room — no real user ever sees fake data.
 */
export function ClassroomUnavailable({
  reason,
  classId,
}: {
  reason: UnavailableReason
  classId?: string
}) {
  const { icon, title, body } = COPY[reason]
  const href =
    reason === 'unauthenticated'
      ? `/login${classId ? `?redirect=${encodeURIComponent(`/classroom/${classId}`)}` : ''}`
      : '/dashboard'
  const cta = reason === 'unauthenticated' ? 'Sign in' : 'Back to dashboard'

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-neutral-950 px-4 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-amber-300 [&_svg]:size-8">
          {icon}
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{body}</p>
        <Link
          href={href}
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
        >
          <HiArrowLeft className="size-4" />
          {cta}
        </Link>
      </div>
    </main>
  )
}
