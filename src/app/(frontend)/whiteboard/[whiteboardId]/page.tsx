import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { WhiteboardCanvas } from '@/app/(frontend)/classroom/[classId]/whiteboard-canvas'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { HiOutlineArrowLeft } from 'react-icons/hi2'

export default async function StandaloneWhiteboardPage({
  params,
}: {
  params: Promise<{ whiteboardId: string }>
}) {
  const { whiteboardId } = await params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect(`/auth/login?redirect=/whiteboard/${whiteboardId}`)
  }

  // Fetch whiteboard
  let wb: any
  try {
    wb = await payload.findByID({
      collection: 'whiteboards',
      id: whiteboardId,
      depth: 1,
    })
  } catch (error) {
    console.error('Error fetching whiteboard:', error)
    notFound()
  }

  if (!wb) {
    notFound()
  }

  // Fetch slides
  const slidesRes = await payload.find({
    collection: 'whiteboard-slides',
    where: { whiteboard: { equals: wb.id } },
    sort: 'order',
    limit: 100,
    depth: 0,
  })
  const initialSlides = slidesRes.docs

  // Check access authorization: user must be tutor, parent, or student of the class
  const classDoc = wb.class as any
  if (!classDoc) {
    notFound()
  }

  const isTutor = user.accountType === 'tutor'
  const tutorId = typeof classDoc.tutor === 'object' ? classDoc.tutor?.id : classDoc.tutor
  const students = classDoc.students || []
  const parents = classDoc.parents || []

  const isTutorMember = user.accountType === 'tutor' && tutorId === user.id
  const isStudentMember = students.some((s: any) => (typeof s === 'object' ? s.id : s) === user.id)
  const isParentMember = parents.some((p: any) => (typeof p === 'object' ? p.id : p) === user.id)
  const wbOwnerId = typeof wb.owner === 'object' ? wb.owner?.id : wb.owner
  const isOwner = wbOwnerId === user.id
  const canEdit = isOwner || user.accountType === 'admin'

  if (!isTutorMember && !isStudentMember && !isParentMember && user.accountType !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background text-foreground">
        <h1 className="text-xl font-bold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You are not authorized to view this whiteboard.</p>
        <Link href="/dashboard" className="mt-4 text-secondary hover:underline">Go to Dashboard</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Header bar */}
      <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href={isTutor ? `/dashboard/tutor/classes/${classDoc.id}` : `/dashboard/${user.accountType}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg cursor-pointer">
              <HiOutlineArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold leading-none">{wb.title}</h1>
            <span className="text-[10px] text-muted-foreground mt-1">Class: {classDoc.title}</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Mode: {canEdit ? 'Tutor Editor' : 'Standalone Viewer'}
        </div>
      </header>

      {/* Standalone Whiteboard Canvas */}
      <div className="flex-1 min-h-0 p-4">
        <WhiteboardCanvas
          whiteboardId={wb.id}
          isTutor={canEdit}
          initialSlides={initialSlides}
        />
      </div>
    </div>
  )
}
