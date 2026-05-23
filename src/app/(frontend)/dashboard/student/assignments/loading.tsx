import { Skeleton } from '@/components/ui/skeleton'

export default function StudentAssignmentsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}
