import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'

export const metadata = {
  title: 'Assignments | Student Dashboard',
}

export default async function StudentAssignmentsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Assignments</h1>
        <p className="text-sm text-muted-foreground">
          Homework and tasks set by your tutors.
        </p>
      </div>

      <div className="rounded-2xl border border-dashed bg-card p-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <HiOutlineClipboardDocumentList className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium">No assignments yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When your tutor sets an assignment, it will appear here.
        </p>
      </div>
    </div>
  )
}
