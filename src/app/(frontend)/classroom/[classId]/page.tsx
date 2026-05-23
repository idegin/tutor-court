import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import crypto from 'crypto'
import { ClassroomClient } from './classroom-client'
import { generateVideoSdkToken } from '@/lib/videosdk'

interface PageProps {
  params: Promise<{ classId: string }>
}

export default async function ClassroomPage(props: PageProps) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/auth/login')
  }

  const { classId } = params

  try {
    const cls = await payload.findByID({
      collection: 'classes',
      id: classId,
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

    // Find active live session
    const activeSessionsRes = await payload.find({
      collection: 'live-sessions',
      where: {
        and: [{ class: { equals: classId } }, { status: { equals: 'live' } }],
      },
      limit: 1,
      depth: 0,
    })
    const activeSession = activeSessionsRes.docs[0] || null

    // Fetch existing whiteboards
    const whiteboardsRes = await payload.find({
      collection: 'whiteboards',
      where: { class: { equals: classId } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })

    let whiteboards = whiteboardsRes.docs

    // If no whiteboards exist, create a default one
    if (whiteboards.length === 0) {
      const newWb = await payload.create({
        collection: 'whiteboards',
        data: {
          title: 'Main Board',
          owner: tutorId,
          class: classId,
          liveSession: activeSession?.id || undefined,
          isPublic: false,
          shareToken: crypto.randomBytes(16).toString('hex'),
        } as any,
      })

      // Create slide 1
      await payload.create({
        collection: 'whiteboard-slides',
        data: {
          whiteboard: newWb.id,
          order: 0,
          title: 'Slide 1',
          data: { lines: [] },
        } as any,
      })

      whiteboards = [newWb]
    }

    return (
      <ClassroomClient
        cls={cls}
        currentUser={user}
        initialSession={activeSession}
        initialWhiteboards={whiteboards}
        videoSdkToken={generateVideoSdkToken()}
      />
    )
  } catch (err) {
    console.error('Error opening classroom:', err)
    return notFound()
  }
}
