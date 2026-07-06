import { headers as getHeaders } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can remove students.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 })
  }

  try {
    const classDoc = await payload.findByID({
      collection: 'classes',
      id,
      depth: 0,
    })

    if (!classDoc) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId = typeof classDoc.tutor === 'object' ? (classDoc.tutor as any).id : classDoc.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this class.' }, { status: 403 })
    }

    const newStudents = (classDoc.students || [])
      .map((s: any) => (typeof s === 'object' ? s.id : s))
      .filter((sid: any) => String(sid) !== String(studentId))

    await payload.update({
      collection: 'classes',
      id,
      data: { students: newStudents } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
