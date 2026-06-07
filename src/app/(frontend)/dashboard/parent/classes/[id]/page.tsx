import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { ParentClassDetailsClient } from './class-details-client'

export const metadata = {
  title: 'Class Details | Parent Dashboard',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ParentClassDetailsPage(props: PageProps) {
  const params = await props.params
  const { id } = params

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user || user.accountType !== 'parent') {
    redirect('/auth/login')
  }

  // Fetch Class details
  const cls = await payload.findByID({
    collection: 'classes',
    id,
    depth: 2, // load tutor details, subject info
  })

  if (!cls) {
    notFound()
  }

  // Verify parent has access to this class
  const classParents = (cls.parents || []).map((p: any) => typeof p === 'object' ? p.id : p)
  if (!classParents.includes(user.id)) {
    redirect('/dashboard/parent/classes')
  }

  // Fetch all parent's children student profiles
  const childrenRes = await payload.find({
    collection: 'students',
    where: { parent: { equals: user.id } },
    depth: 1, // Load linked user
    limit: 50,
  })

  // Group children into Enrolled vs Unenrolled
  const currentEnrolledStudentIds = (cls.students || []).map((s: any) => typeof s === 'object' ? String(s.id) : String(s))

  const enrolledChildren: any[] = []
  const unenrolledChildren: any[] = []

  childrenRes.docs.forEach((childDoc: any) => {
    const childUserId = typeof childDoc.user === 'object' ? String(childDoc.user?.id) : String(childDoc.user)
    const formattedChild = {
      id: childDoc.id,
      firstName: childDoc.firstName,
      lastName: childDoc.lastName,
      email: childDoc.generatedEmail || '',
      gradeLevel: childDoc.gradeLevel || 'N/A',
      userId: childUserId,
    }

    if (childUserId && currentEnrolledStudentIds.includes(childUserId)) {
      enrolledChildren.push(formattedChild)
    } else {
      unenrolledChildren.push(formattedChild)
    }
  })

  const tutorDoc = cls.tutor as any
  const tutorName = tutorDoc ? `${tutorDoc.firstName} ${tutorDoc.lastName}` : 'Tutor'
  const subjectName = typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')

  return (
    <ParentClassDetailsClient
      classId={String(cls.id)}
      classTitle={cls.title || 'Live Class'}
      classDescription={cls.description || ''}
      classSchedule={cls.schedule || []}
      classStartDate={cls.startDate ? new Date(cls.startDate).toLocaleDateString() : ''}
      classEndDate={cls.endDate ? new Date(cls.endDate).toLocaleDateString() : ''}
      classStatus={cls.status}
      classType={cls.classType}
      maxStudents={cls.maxStudents || 0}
      enrolledStudentsCount={currentEnrolledStudentIds.length}
      subjectName={String(subjectName)}
      tutorName={tutorName}
      tutorEmail={tutorDoc?.email || ''}
      enrolledChildren={enrolledChildren}
      unenrolledChildren={unenrolledChildren}
    />
  )
}
