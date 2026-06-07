import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineChevronRight,
  HiOutlineUsers,
  HiOutlineBookOpen,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'My Classes | Parent Dashboard',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export default async function ParentClassesPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  // 1. Fetch parent's children student profiles
  const childrenRes = await payload.find({
    collection: 'students',
    where: { parent: { equals: user!.id } },
    depth: 1, // Load linked user details
    limit: 50,
  })
  
  const studentUserIds = childrenRes.docs
    .map(c => typeof c.user === 'object' ? (c.user as any)?.id : c.user)
    .filter(Boolean)

  const childMap = new Map<string, string>() // studentUserId -> student name
  childrenRes.docs.forEach(c => {
    const sUserId = typeof c.user === 'object' ? (c.user as any)?.id : c.user
    if (sUserId) {
      childMap.set(String(sUserId), `${c.firstName} ${c.lastName}`)
    }
  })

  // 2. Fetch classes that contain the parent
  const classesRes = await payload.find({
    collection: 'classes',
    where: { parents: { equals: user!.id } },
    sort: 'startDate',
    limit: 100,
    depth: 2, // load subject and tutor info
  })

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-tutor-purple-600">Parent Dashboard</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">My Classes</h1>
          <p className="text-sm text-muted-foreground">
            Manage your enrolled classes, schedules, and student assignments.
          </p>
        </div>
      </div>

      {classesRes.docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-600">
            <HiOutlineAcademicCap className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No Classes Found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            You are not currently invited to or enrolled in any classes. When a tutor invites you to a class, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classesRes.docs.map((cls: any) => {
            const tutorName = cls.tutor ? `${cls.tutor.firstName} ${cls.tutor.lastName}` : 'Tutor'
            const subjectName = typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')
            
            // Find parent's children enrolled in this class
            const enrolledClassStudents = (cls.students || []).map((s: any) => typeof s === 'object' ? String(s.id) : String(s))
            const enrolledChildrenNames = studentUserIds
              .filter(sUserId => enrolledClassStudents.includes(String(sUserId)))
              .map(sUserId => childMap.get(String(sUserId)))
              .filter(Boolean)

            return (
              <Card key={cls.id} className="flex flex-col border border-border bg-card shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden py-0">
                <div className="h-1.5 bg-gradient-to-r from-tutor-purple-500 to-tutor-purple-600" />
                <CardHeader className="space-y-3 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`capitalize font-semibold border ${STATUS_COLORS[cls.status] || 'bg-secondary text-secondary-foreground border-border'}`}>
                      {cls.status}
                    </Badge>
                    <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider">
                      {cls.classType === 'one-on-one' ? '1-on-1' : 'Group'}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground line-clamp-1">{cls.title}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground flex items-center mt-1">
                      <HiOutlineBookOpen className="mr-1 h-3.5 w-3.5 text-tutor-purple-500" /> {subjectName}
                    </CardDescription>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-4 pb-6">
                  {/* Tutor info */}
                  <div className="flex items-center gap-2.5 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-xs border border-border">
                      {tutorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-xs leading-none">Tutor</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tutorName}</p>
                    </div>
                  </div>

                  {/* Schedule preview */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <HiOutlineCalendarDays className="h-4 w-4 shrink-0 text-tutor-purple-500" />
                      <span>Starts: {new Date(cls.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-muted-foreground mt-1">
                      <HiOutlineClock className="h-4 w-4 shrink-0 text-tutor-purple-500 mt-0.5" />
                      <div className="space-y-0.5">
                        {cls.schedule?.map((item: any, idx: number) => (
                          <div key={idx} className="capitalize">
                            {item.day}s @ {item.startTime} - {item.endTime}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Enrolled children */}
                  <div className="border-t pt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <HiOutlineUsers className="h-3.5 w-3.5 text-tutor-purple-500" /> Enrolled Children
                    </p>
                    {enrolledChildrenNames.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 font-medium w-fit">
                        No child enrolled yet
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {enrolledChildrenNames.map((name, idx) => (
                          <span key={idx} className="inline-flex items-center rounded-full bg-tutor-purple-50 px-2 py-0.5 text-[10px] font-semibold text-tutor-purple-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>

                <div className="border-t p-4 bg-muted/20">
                  <Button asChild className="w-full bg-secondary hover:bg-secondary/95 text-secondary-foreground text-xs font-semibold h-9 shadow-sm cursor-pointer border-0">
                    <Link href={`/dashboard/parent/classes/${cls.id}`} className="flex items-center justify-center gap-1">
                      Show More <HiOutlineChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
