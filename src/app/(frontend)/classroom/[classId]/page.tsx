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

    // Verify user is either the tutor or an enrolled student
    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor.id : cls.tutor
    const studentIds = cls.students
      ? cls.students.map((s: any) => (typeof s === 'object' && s ? s.id : s))
      : []

    const isTutor = user.id === tutorId
    const isStudent = studentIds.includes(user.id)

    if (!isTutor && !isStudent) {
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
      sort: '-startedAt',
      limit: 1,
      depth: 0,
    })
    let activeSession = liveSessionsRes.docs[0] || null

    // Only honor an explicit ?sessionId when nothing is live AND it's still live.
    if (!activeSession && sessionId) {
      const numericSessionId = /^\d+$/.test(sessionId) ? Number(sessionId) : sessionId
      try {
        const requested = await payload.findByID({
          collection: 'live-sessions',
          id: numericSessionId,
          depth: 0,
        })
        if (requested && requested.status === 'live') activeSession = requested
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
        videoSdkToken={generateVideoSdkToken(3600 * 2, isTutor ? 'tutor' : 'student')}
      />
    )
  } catch (err) {
    console.error('Error opening classroom:', err)
    return notFound()
  }
}
