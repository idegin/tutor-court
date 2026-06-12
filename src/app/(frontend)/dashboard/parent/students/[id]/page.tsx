import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import {
  HiOutlineChevronLeft,
  HiOutlineCalendar,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineAcademicCap,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUserPlus,
  HiOutlineUserMinus,
  HiOutlineVideoCamera,
  HiOutlineBookOpen,
  HiOutlineTrophy,
  HiOutlineClock,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StudentDetailClient } from './student-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Student Details | Parent Dashboard',
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  assessment_assigned: <HiOutlineClipboardDocumentList className="h-4 w-4" />,
  assessment_completed: <HiOutlineCheckCircle className="h-4 w-4" />,
  class_joined: <HiOutlineUserPlus className="h-4 w-4" />,
  class_left: <HiOutlineUserMinus className="h-4 w-4" />,
  class_ended: <HiOutlineVideoCamera className="h-4 w-4" />,
}

const ACTIVITY_TINT: Record<string, string> = {
  assessment_assigned: 'bg-blue-50 text-blue-700 border-blue-100',
  assessment_completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  class_joined: 'bg-tutor-purple-50 text-tutor-purple-700 border-tutor-purple-100',
  class_left: 'bg-slate-50 text-slate-700 border-slate-100',
  class_ended: 'bg-amber-50 text-amber-700 border-amber-100',
}

const ATTENDANCE_TINT: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
  'left-early': 'bg-orange-50 text-orange-700 border-orange-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
}

const ENGAGEMENT_TINT: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-700',
  partial: 'bg-amber-50 text-amber-700',
  poor: 'bg-red-50 text-red-700',
  absent: 'bg-slate-50 text-slate-700',
  unknown: 'bg-slate-50 text-slate-500',
}

export default async function ParentStudentDetailPage(props: PageProps) {
  const params = await props.params
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user: parentUser } = await payload.auth({ headers })

  if (!parentUser || parentUser.accountType !== 'parent') {
    redirect('/auth/login')
  }

  const { id } = params

  let student: any
  try {
    student = await payload.findByID({ collection: 'students', id, depth: 0 })
  } catch {
    return notFound()
  }

  if (!student || String(student.parent) !== String(parentUser.id)) {
    return notFound()
  }

  const studentUserId =
    typeof student.user === 'object' ? student.user?.id : student.user

  const [
    classesRes,
    attendanceRes,
    tutorAssessmentsRes,
    assessmentResultsRes,
    activityLogsRes,
  ] = await Promise.all([
    payload.find({
      collection: 'classes',
      where: { students: { equals: studentUserId } },
      sort: 'startDate',
      limit: 50,
      depth: 2,
    }),
    payload.find({
      collection: 'attendance',
      where: { student: { equals: studentUserId } },
      sort: '-joinedAt',
      limit: 50,
      depth: 2,
    }),
    payload.find({
      collection: 'tutor-assessments',
      where: { student: { equals: studentUserId } },
      sort: '-createdAt',
      limit: 50,
      depth: 2,
    }),
    payload.find({
      collection: 'assessment-results',
      where: { student: { equals: studentUserId } },
      sort: '-submittedAt',
      limit: 50,
      depth: 0,
    }),
    payload.find({
      collection: 'activity-logs',
      where: { subject: { equals: studentUserId } },
      sort: '-createdAt',
      limit: 30,
      depth: 1,
    }),
  ])

  const tutorAssessments = tutorAssessmentsRes.docs as any[]
  const assessmentResults = assessmentResultsRes.docs as any[]
  const attendance = attendanceRes.docs as any[]
  const classes = classesRes.docs as any[]
  const activityLogs = activityLogsRes.docs as any[]

  const resultByTaId = new Map<string, any>()
  for (const r of assessmentResults) {
    if (!r.submittedAt) continue
    const taId = typeof r.tutorAssessment === 'object' ? r.tutorAssessment?.id : r.tutorAssessment
    if (taId) resultByTaId.set(String(taId), r)
  }

  const submittedResults = assessmentResults.filter((r) => r.submittedAt)
  const avgScore = submittedResults.length
    ? Math.round(submittedResults.reduce((acc, r) => acc + (r.score || 0), 0) / submittedResults.length)
    : 0

  const onTimeAttendance = attendance.filter((a) => a.status === 'present').length
  const onTimePct =
    attendance.length === 0 ? null : Math.round((onTimeAttendance / attendance.length) * 100)

  const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()
  const childName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 md:px-6 lg:px-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link href="/dashboard/parent/students" className="flex items-center gap-1">
            <HiOutlineChevronLeft className="h-4 w-4" />
            Back to students
          </Link>
        </Button>
      </div>

      {/* Hero */}
      <div className="rounded-3xl border bg-gradient-to-br from-tutor-purple-50 via-white to-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
              <AvatarFallback className="bg-tutor-purple-100 text-tutor-purple-700 text-2xl font-bold">
                {studentInitials || 'S'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1.5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{childName}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <HiOutlineAcademicCap className="h-4 w-4" />
                  {student.gradeLevel?.replace(/_/g, ' ').replace(/-/g, ' ') || 'Grade not set'}
                </span>
                <span className="text-muted-foreground/50">·</span>
                <Badge className="bg-white text-tutor-purple-700 hover:bg-white border border-tutor-purple-200 capitalize font-semibold shadow-none">
                  Managed account
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat
            icon={<HiOutlineBookOpen className="h-4 w-4" />}
            label="Classes"
            value={classes.length.toString()}
          />
          <HeroStat
            icon={<HiOutlineClipboardDocumentList className="h-4 w-4" />}
            label="Assessments"
            value={`${submittedResults.length}/${tutorAssessments.length}`}
            sub="completed"
          />
          <HeroStat
            icon={<HiOutlineTrophy className="h-4 w-4" />}
            label="Avg score"
            value={submittedResults.length ? `${avgScore}%` : '—'}
          />
          <HeroStat
            icon={<HiOutlineClock className="h-4 w-4" />}
            label="On-time"
            value={onTimePct === null ? '—' : `${onTimePct}%`}
            sub={onTimePct === null ? undefined : `${attendance.length} session${attendance.length === 1 ? '' : 's'}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Login credentials</CardTitle>
              <CardDescription>Share these with {student.firstName || 'your child'} to sign in.</CardDescription>
            </CardHeader>
            <CardContent>
              <StudentDetailClient
                generatedEmail={student.generatedEmail}
                generatedPassword={student.generatedPassword}
              />
            </CardContent>
          </Card>

          {student.notes && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                  {student.notes}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">Recent activity</CardTitle>
                <CardDescription>What {student.firstName || 'they'}&apos;ve been up to.</CardDescription>
              </div>
              <HiOutlineSparkles className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <EmptyHint text="No activity recorded yet." />
              ) : (
                <ul className="space-y-3">
                  {activityLogs.slice(0, 12).map((log) => (
                    <li key={log.id} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                          ACTIVITY_TINT[log.type] || 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}
                      >
                        {ACTIVITY_ICON[log.type] || <HiOutlineSparkles className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground leading-snug">{log.title}</p>
                        {log.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{log.description}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          {/* Assessments */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">Assessments</CardTitle>
                <CardDescription>Quizzes and homework assigned to {student.firstName || 'them'}.</CardDescription>
              </div>
              <HiOutlineClipboardDocumentList className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {tutorAssessments.length === 0 ? (
                <EmptyHint text="No assessments assigned yet." />
              ) : (
                <ul className="space-y-3">
                  {tutorAssessments.map((ta) => {
                    const assessment =
                      typeof ta.assessment === 'object' ? ta.assessment : null
                    const title = assessment?.title || 'Assessment'
                    const subject =
                      typeof assessment?.subject === 'object' ? assessment.subject?.name : null
                    const result = resultByTaId.get(String(ta.id))
                    const isCompleted = ta.status === 'completed' && result
                    return (
                      <li key={ta.id}>
                        <Link
                          href={`/dashboard/parent/students/${id}/assessments/${ta.id}`}
                          className="group flex flex-col gap-3 rounded-xl border bg-card p-4 transition-all hover:border-tutor-purple-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-700">
                              <HiOutlineClipboardDocumentList className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {subject && (
                                  <>
                                    {subject}
                                    <span className="mx-1.5">·</span>
                                  </>
                                )}
                                {ta.dueDate
                                  ? `Due ${format(new Date(ta.dueDate), 'MMM d, yyyy')}`
                                  : 'No due date'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isCompleted ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  {result.passed ? (
                                    <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <HiOutlineXCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span className="text-sm font-bold">{Math.round(result.score || 0)}%</span>
                                </div>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 capitalize">
                                  Completed
                                </Badge>
                              </>
                            ) : (
                              <Badge
                                variant="outline"
                                className={`capitalize ${
                                  ta.status === 'expired'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : ta.status === 'in_progress'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {ta.status === 'in_progress' ? 'In progress' : ta.status}
                              </Badge>
                            )}
                            <HiOutlineArrowRight className="hidden h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Classes */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">Enrolled classes</CardTitle>
                <CardDescription>Current class enrollments and tutors.</CardDescription>
              </div>
              <HiOutlineCalendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <EmptyHint text="Not enrolled in any classes yet." />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {classes.map((cls) => {
                    const tutor = typeof cls.tutor === 'object' ? cls.tutor : null
                    const tutorName = tutor ? `${tutor.firstName} ${tutor.lastName}` : 'Tutor'
                    const subjectName =
                      typeof cls.subject === 'object' && cls.subject
                        ? cls.subject.name
                        : cls.subject || null
                    return (
                      <div
                        key={cls.id}
                        className="rounded-xl border bg-card p-4 transition-all hover:border-tutor-purple-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-tight">{cls.title}</p>
                          <Badge
                            variant="outline"
                            className={`capitalize text-[10px] ${
                              cls.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {cls.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {subjectName ? `${subjectName} · ` : ''}with {tutorName}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-3 space-y-0">
              <div>
                <CardTitle className="text-base">Attendance log</CardTitle>
                <CardDescription>Per-session attendance, lateness, and engagement.</CardDescription>
              </div>
              <HiOutlineClipboardDocumentCheck className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <EmptyHint text="No attendance records yet — logs appear after each live class." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-3 font-semibold">Class</th>
                        <th className="py-2 pr-3 font-semibold">Joined</th>
                        <th className="py-2 pr-3 font-semibold">Duration</th>
                        <th className="py-2 pr-3 font-semibold">Lateness</th>
                        <th className="py-2 pr-3 font-semibold">Status</th>
                        <th className="py-2 pr-2 font-semibold">Engagement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {attendance.slice(0, 25).map((att: any) => {
                        const classTitle =
                          typeof att.class === 'object' ? att.class?.title : 'Class'
                        return (
                          <tr key={att.id} className="hover:bg-muted/20">
                            <td className="py-3 pr-3 font-medium">{classTitle}</td>
                            <td className="py-3 pr-3 text-xs text-muted-foreground">
                              {format(new Date(att.joinedAt), 'MMM d, h:mm a')}
                            </td>
                            <td className="py-3 pr-3 text-xs">
                              {att.durationMinutes ? `${att.durationMinutes} min` : '—'}
                            </td>
                            <td className="py-3 pr-3 text-xs">
                              {att.latenessMinutes
                                ? `${att.latenessMinutes} min`
                                : att.status === 'present'
                                  ? 'On time'
                                  : '—'}
                            </td>
                            <td className="py-3 pr-3">
                              <Badge
                                variant="outline"
                                className={`capitalize text-[10px] font-semibold ${
                                  ATTENDANCE_TINT[att.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {att.status?.replace('-', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 pr-2">
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  ENGAGEMENT_TINT[att.engagementFlag || 'unknown']
                                }`}
                              >
                                {att.engagementFlag === 'unknown' || !att.engagementFlag
                                  ? 'Pending'
                                  : att.engagementFlag}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function HeroStat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
