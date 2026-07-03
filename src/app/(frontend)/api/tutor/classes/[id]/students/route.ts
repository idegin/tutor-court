import { headers as getHeaders } from 'next/headers'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

// DELETE /api/tutor/classes/:id/students?studentId=<userId>
// Removes an enrolled student from a class. Enrollment used to be one-way
// (invite/accept/enroll only ever appended to `students`); this gives tutors the
// missing ability to take a student back out.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  const { id } = await params

  if (!user || user.accountType !== 'tutor') {
    return NextResponse.json({ error: 'Only tutors can remove students.' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId.' }, { status: 400 })
  }

  try {
    const existingClass = await payload.findByID({ collection: 'classes', id, depth: 0 })
    if (!existingClass) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const tutorId =
      typeof existingClass.tutor === 'object' ? (existingClass.tutor as any).id : existingClass.tutor
    if (tutorId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this class.' }, { status: 403 })
    }

    const currentStudentIds = (existingClass.students || []).map((s: any) =>
      typeof s === 'object' ? s.id : s,
    )
    if (!currentStudentIds.some((s: any) => String(s) === String(studentId))) {
      return NextResponse.json({ error: 'Student is not enrolled in this class.' }, { status: 404 })
    }

    const newStudentIds = currentStudentIds.filter((s: any) => String(s) !== String(studentId))

    // If the removed student's parent has no other child left in this class,
    // drop that parent from the class too so a stale parent link doesn't linger.
    let newParentIds = (existingClass.parents || []).map((p: any) =>
      typeof p === 'object' ? p.id : p,
    )
    if (newParentIds.length > 0) {
      const remainingStudents =
        newStudentIds.length > 0
          ? await payload.find({
              collection: 'students',
              where: { user: { in: newStudentIds } },
              limit: 1000,
              depth: 0,
            })
          : { docs: [] as any[] }
      const remainingParentUserIds = new Set(
        (remainingStudents.docs as any[]).map((doc) =>
          typeof doc.parent === 'object' ? doc.parent?.id : doc.parent,
        ),
      )
      newParentIds = newParentIds.filter((p: any) => remainingParentUserIds.has(p))
    }

    await payload.update({
      collection: 'classes',
      id,
      data: { students: newStudentIds, parents: newParentIds } as any,
      overrideAccess: true,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[classes/students/delete] error:', error)
    return NextResponse.json({ error: error.message || 'Failed to remove student.' }, { status: 500 })
  }
}
