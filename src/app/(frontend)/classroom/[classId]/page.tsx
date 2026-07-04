import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { ClassroomLoader } from './classroom-loader'
import { LiveClassUnavailable } from './live-class-unavailable'
import { generateVideoSdkToken, validateVideoSdkConfig } from '@/lib/videosdk'

interface PageProps {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ sessionId?: string }>
}

export default async function ClassroomPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/auth/login')
  }

  const { classId } = params
  const numericClassId = /^\d+$/.test(classId) ? Number(classId) : classId
  const sessionId = searchParams.sessionId

  // Block entering the class unless the video server is fully configured AND its
  // credentials are actually valid — so nobody (tutor or student) lands in a
  // silently-broken room. Shows a "poorly configured" message otherwise.
  const videoConfig = await validateVideoSdkConfig()
  if (!videoConfig.ok) {
    return <LiveClassUnavailable accountType={user.accountType} reason="misconfigured" />
  }

  try {
    const cls = await payload.findByID({
      collection: 'classes',
      id: numericClassId,
      depth: 2,
    })

    if (!cls) {
      return notFound()
    }

    // Verify user is the tutor, an enrolled student, or a linked parent — the
    // same audience the live-session join/status/chat routes authorize, so a
    // parent allowed by those APIs isn't bounced at the page.
    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor.id : cls.tutor
    const studentIds = cls.students
      ? cls.students.map((s: any) => (typeof s === 'object' && s ? s.id : s))
      : []
    const parentIds = ((cls as any).parents || []).map((p: any) =>
      typeof p === 'object' && p ? p.id : p,
    )

    const isTutor = user.id === tutorId
    const isStudent = studentIds.includes(user.id)
    const isParent = parentIds.includes(user.id)

    if (!isTutor && !isStudent && !isParent) {
      return redirect('/dashboard')
    }

    // Always resolve to the class's CURRENT live session so the tutor and every
    // student join the SAME VideoSDK room. A stale ?sessionId (e.g. an ended
    // session) must never drop someone into a dead/different room — that's what
    // makes each participant end up alone.
    const liveSessionsRes = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [{ class: { equals: numericClassId } }, { status: { equals: 'live' } }],
      },
      // Deterministic: if more than one live session somehow exists, everyone
      // (this page, the status route, the start route) picks the SAME most-recent
      // one, so tutor and students never split across different roomIds.
      sort: ['-startedAt', '-id'],
      limit: 1,
      depth: 0,
    })
    let activeSession = liveSessionsRes.docs[0] || null

    // Only honor an explicit ?sessionId when nothing is live, it's still live,
    // AND it belongs to THIS class. Without the class check, a user enrolled in
    // class A could pass another class's sessionId and (with the room-agnostic
    // client token) join a classroom they were never authorized for.
    if (!activeSession && sessionId) {
      const numericSessionId = /^\d+$/.test(sessionId) ? Number(sessionId) : sessionId
      try {
        const requested = await payload.findByID({
          collection: 'live-sessions',
          id: numericSessionId,
          depth: 0,
        })
        const requestedClassId =
          requested && (typeof requested.class === 'object' && requested.class
            ? (requested.class as any).id
            : requested.class)
        if (
          requested &&
          requested.status === 'live' &&
          String(requestedClassId) === String(numericClassId)
        ) {
          activeSession = requested
        }
      } catch (err) {
        console.warn(`Could not find live-session with ID ${sessionId}:`, err)
      }
    }

    // Fetch existing whiteboards
    const whiteboardsRes = await payload.find({
      collection: 'whiteboards',
      where: { class: { equals: numericClassId } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })

    const whiteboardsWithSlides: any[] = []
    for (const wb of whiteboardsRes.docs) {
      const slidesRes = await payload.find({
        collection: 'whiteboard-slides',
        where: { whiteboard: { equals: wb.id } },
        sort: 'order',
        limit: 100,
        depth: 0,
      })
      whiteboardsWithSlides.push({
        ...wb,
        slides: slidesRes.docs,
      })
    }


    return (
      <ClassroomLoader
        cls={cls}
        currentUser={user}
        initialSession={activeSession}
        initialWhiteboards={whiteboardsWithSlides}
        // Fallback token only: the client mints a fresh one via
        // /api/live-sessions/token when the class actually goes live. Long TTL
        // so the fallback still works after a long waiting-room wait.
        videoSdkToken={generateVideoSdkToken(3600 * 6, isTutor ? 'tutor' : 'student')}
      />
    )
  } catch (err) {
    // redirect()/notFound() work by THROWING control-flow errors — swallowing
    // them here turned the "not enrolled → back to dashboard" redirect into a
    // confusing 404. Let Next.js handle its own signals.
    const digest = (err as any)?.digest
    if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')) {
      throw err
    }
    console.error('Error opening classroom:', err)
    return notFound()
  }
}
