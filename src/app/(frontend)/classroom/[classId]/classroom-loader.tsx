'use client'

import dynamic from 'next/dynamic'

// The classroom imports @videosdk.live/react-sdk, which references the browser
// global `self` at module load. Loading it with ssr:false keeps it out of the
// server render, fixing the intermittent "ReferenceError: self is not defined"
// 500 on /classroom/[classId]. (ssr:false is only allowed inside a Client
// Component — hence this thin wrapper.)
const ClassroomClient = dynamic(
  () => import('./classroom-client').then((m) => ({ default: m.ClassroomClient })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-muted/10">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-tutor-purple-500 border-t-transparent" />
          <p className="text-sm font-medium">Connecting to the live classroom…</p>
        </div>
      </div>
    ),
  },
)

type ClassroomLoaderProps = {
  cls: any
  currentUser: any
  initialSession: any
  initialWhiteboards: any[]
  videoSdkToken: string
}

export function ClassroomLoader(props: ClassroomLoaderProps) {
  return <ClassroomClient {...props} />
}
