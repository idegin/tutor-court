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

    // Coerce a numeric-string studentId to a number so relationship comparisons
    // and Postgres integer ids line up (the array stores integer ids).
    const numericStudentId = /^\d+$/.test(String(studentId))
      ? Number(studentId)
      : studentId

    const currentStudents = (classDoc.students || []).map((s: any) =>
      typeof s === 'object' ? s.id : s,
    )

    const newStudents = currentStudents.filter(
      (sid: any) => String(sid) !== String(studentId),
    )

    // If nothing changed, the student was never enrolled.
    if (newStudents.length === currentStudents.length) {
      return NextResponse.json(
        { error: 'Student is not enrolled in this class.' },
        { status: 404 },
      )
    }

    // Dangling-parent cleanup: if the removed student's parent has no other
    // child left in the class, drop that parent too (so they lose live-room
    // access). Resolve the removed student's parent id first.
    const currentParents = (classDoc.parents || []).map((p: any) =>
      typeof p === 'object' ? p.id : p,
    )
    let newParents = currentParents
    try {
      const removedStudent: any = await payload.findByID({
        collection: 'users',
        id: numericStudentId,
        depth: 0,
      })
      const removedParentId =
        removedStudent?.parent && typeof removedStudent.parent === 'object'
          ? removedStudent.parent.id
          : removedStudent?.parent
      if (removedParentId != null) {
        let parentStillHasChild = false
        if (newStudents.length > 0) {
          const remaining = await payload.find({
            collection: 'users',
            where: { id: { in: newStudents } },
            limit: 1000,
            depth: 0,
            overrideAccess: true,
          })
          parentStillHasChild = remaining.docs.some((u: any) => {
            const pid = u?.parent && typeof u.parent === 'object' ? u.parent.id : u?.parent
            return String(pid) === String(removedParentId)
          })
        }
        if (!parentStillHasChild) {
          newParents = currentParents.filter(
            (pid: any) => String(pid) !== String(removedParentId),
          )
        }
      }
    } catch (err: any) {
      console.error('[remove-student] parent cleanup failed:', err?.message || err)
    }

    await payload.update({
      collection: 'classes',
      id,
      data: { students: newStudents, parents: newParents } as any,
      overrideAccess: true,
    })

    // Revoke assessment access: delete the removed student's non-completed
    // tutor-assessments for this class.
    try {
      await payload.delete({
        collection: 'tutor-assessments',
        where: {
          and: [
            { class: { equals: id } },
            { student: { equals: numericStudentId } },
            { status: { not_equals: 'completed' } },
          ],
        },
        overrideAccess: true,
      })
    } catch (err: any) {
      console.error('[remove-student] assessment cleanup failed:', err?.message || err)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
