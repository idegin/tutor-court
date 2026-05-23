import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { ClassDetailsClient } from './class-details-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TutorClassDetailPage(props: PageProps) {
  const params = await props.params;
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'tutor') {
    redirect('/auth/login')
  }

  const { id } = params

  try {
    const cls = await payload.findByID({
      collection: 'classes',
      id,
      depth: 2,
    })

    if (!cls) {
      return notFound()
    }

    // Verify ownership
    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor.id : cls.tutor
    if (tutorId !== user.id) {
      return redirect('/dashboard/tutor/classes')
    }

    // Fetch whiteboards for this class
    const whiteboardsRes = await payload.find({
      collection: 'whiteboards',
      where: { class: { equals: id } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })

    return <ClassDetailsClient cls={cls} initialWhiteboards={whiteboardsRes.docs} />
  } catch (err) {
    console.error('Error loading class details:', err)
    return notFound()
  }
}
