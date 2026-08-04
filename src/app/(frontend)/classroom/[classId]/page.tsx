import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ClassroomExperience, type RealtimeProps } from './_live/experience'
import { isLiveClassroomReady } from '@/lib/live/config'

// Live Classroom v2.
//
// The UI is mock-first: without a resolved real live session (or without the
// realtime keys) it runs on simulated data ("Demo mode"). When the tutor has
// started a session AND the Cloudflare Realtime + Ably keys are configured, this
// server component hands the client real identity + the live session id, and the
// experience switches to real Ably presence + SFU media.
//
// Dev preview of the flow (no auth needed): /classroom/<id>?as=tutor|student

interface PageProps {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ as?: string }>
}

const idOf = (v: any) => (v && typeof v === 'object' ? v.id : v)

export default async function ClassroomPage({ params, searchParams }: PageProps) {
  const { classId } = await params
  const { as } = await searchParams

  let realtime: RealtimeProps | undefined
  let role: 'tutor' | 'student' = as === 'student' ? 'student' : 'tutor'

  try {
    // Only bother resolving a real session when the backend is actually configured.
    if (isLiveClassroomReady()) {
      const payload = await getPayload({ config })
      const headers = await getHeaders()
      const { user } = await payload.auth({ headers })
      const numericClassId = /^\d+$/.test(classId) ? Number(classId) : classId

      if (user) {
        const cls = await payload
          .findByID({ collection: 'classes', id: numericClassId, depth: 0 })
          .catch(() => null)
        const live = await payload
          .find({
            collection: 'live-sessions',
            where: { and: [{ class: { equals: numericClassId } }, { status: { equals: 'live' } }] },
            sort: ['-startedAt', '-id'],
            limit: 1,
            depth: 0,
          })
          .catch(() => null)
        const session = live?.docs?.[0]

        if (cls && session) {
          const isTutor = String(idOf(cls.tutor)) === String(user.id)
          const isStudent = (cls.students ?? []).some((s: any) => String(idOf(s)) === String(user.id))
          role = isTutor ? 'tutor' : 'student'
          realtime = {
            liveSessionId: session.id,
            user: {
              id: String(user.id),
              name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
              accountType: (user.accountType as any) === 'tutor' ? 'tutor' : isStudent ? 'student' : 'parent',
              role: isTutor ? 'host' : 'viewer',
            },
            // Tutor + enrolled students publish; parents observe only.
            canPublish: isTutor || isStudent,
          }
        }
      }
    }
  } catch {
    // Any resolution failure → fall back to mock preview.
  }

  return <ClassroomExperience as={role} realtime={realtime} />
}
