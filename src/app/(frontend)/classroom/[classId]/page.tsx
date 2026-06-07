import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { ClassroomClient } from './classroom-client'
import { LiveClassUnavailable } from './live-class-unavailable'
import { generateVideoSdkToken, isVideoSdkAvailable } from '@/lib/videosdk'

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

  if (!isVideoSdkAvailable()) {
    return <LiveClassUnavailable accountType={user.accountType} />
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

    // Resolve active live session
    let activeSession = null
    if (sessionId) {
      const numericSessionId = /^\d+$/.test(sessionId) ? Number(sessionId) : sessionId
      try {
        activeSession = await payload.findByID({
          collection: 'live-sessions',
          id: numericSessionId,
          depth: 0,
        })
      } catch (err) {
        console.warn(`Could not find live-session with ID ${sessionId}:`, err)
      }
    }

    if (!activeSession) {
      // Find active live session as fallback
      const activeSessionsRes = await payload.find({
        collection: 'live-sessions',
        where: {
          and: [{ class: { equals: numericClassId } }, { status: { equals: 'live' } }],
        },
        limit: 1,
        depth: 0,
      })
      activeSession = activeSessionsRes.docs[0] || null
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

    // If no whiteboards exist, create a default one
    if (whiteboardsWithSlides.length === 0) {
      const newWb = await payload.create({
        collection: 'whiteboards',
        data: {
          title: 'Main Board',
          owner: tutorId,
          class: numericClassId,
          liveSession: activeSession?.id || undefined,
          isPublic: false,
          shareToken: crypto.randomBytes(16).toString('hex'),
        } as any,
      })

      // Create slide 1
      const defaultSlide = await payload.create({
        collection: 'whiteboard-slides',
        data: {
          whiteboard: newWb.id,
          order: 0,
          title: 'Slide 1',
          data: { lines: [] },
        } as any,
      })

      whiteboardsWithSlides.push({
        ...newWb,
        slides: [defaultSlide],
      })
    }

    return (
      <ClassroomClient
        cls={cls}
        currentUser={user}
        initialSession={activeSession}
        initialWhiteboards={whiteboardsWithSlides}
        videoSdkToken={generateVideoSdkToken()}
      />
    )
  } catch (err) {
    console.error('Error opening classroom:', err)
    return notFound()
  }
}
