import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  HiOutlineChevronLeft,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineClipboardDocumentCheck,
  HiOutlineUserCircle,
  HiOutlineEye,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StudentDetailClient } from './student-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Student Details | Parent Dashboard',
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

  try {
    // 1. Fetch student document from students collection
    const student = await payload.findByID({
      collection: 'students',
      id,
      depth: 0,
    })

    if (!student || student.parent !== parentUser.id) {
      return notFound()
    }

    // 2. Fetch student user account for details and classes relation
    const studentUserId = typeof student.user === 'object' ? student.user?.id : student.user

    // 3. Fetch all classes student is enrolled in
    const classesRes = await payload.find({
      collection: 'classes',
      where: {
        students: { equals: studentUserId },
      },
      sort: 'startDate',
      limit: 100,
      depth: 2,
    })

    // 4. Fetch attendance records for this student
    const attendanceRes = await payload.find({
      collection: 'attendance',
      where: {
        student: { equals: studentUserId },
      },
      sort: '-joinedAt',
      limit: 100,
      depth: 2,
    })

    const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6 lg:px-8">
        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/parent/students" className="flex items-center gap-1">
              <HiOutlineChevronLeft className="h-4 w-4" />
              Back to Students
            </Link>
          </Button>
        </div>

        {/* Profile Card Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-tutor-purple-100">
              <AvatarFallback className="bg-tutor-purple-50 text-tutor-purple-700 text-xl font-bold">
                {studentInitials || 'S'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {student.firstName} {student.lastName}
              </h1>
              <p className="text-sm text-muted-foreground capitalize">
                Grade: {student.gradeLevel?.replace('-', ' ') || 'Not Set'}
              </p>
            </div>
          </div>
          <div>
            <Badge className="bg-tutor-purple-50 text-tutor-purple-700 hover:bg-tutor-purple-100 border-tutor-purple-200 capitalize font-semibold shadow-none">
              Student Account
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Sidebar: Details/Credentials */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Login Credentials</CardTitle>
                <CardDescription>Use these details to log your child in.</CardDescription>
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
                <CardHeader>
                  <CardTitle className="text-base">Special Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-dashed font-sans">
                    {student.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content: Classes and Attendance */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Classes */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Enrolled Classes</CardTitle>
                  <CardDescription>Classes this student is currently participating in.</CardDescription>
                </div>
                <HiOutlineCalendar className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {classesRes.docs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    No classes enrolled yet. Have a tutor invite you or check pending invites.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {classesRes.docs.map((cls: any) => {
                      const tutorName =
                        typeof cls.tutor === 'object'
                          ? `${cls.tutor.firstName} ${cls.tutor.lastName}`
                          : 'Tutor'
                      return (
                        <div
                          key={cls.id}
                          className="flex flex-col gap-2 rounded-lg border bg-background p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/10 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-sm">{cls.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Subject: {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')} · with {tutorName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={cls.status === 'active' ? 'default' : 'secondary'} className="capitalize shadow-none text-xs">
                              {cls.status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base">Attendance Log</CardTitle>
                  <CardDescription>Track attendance status for each live session.</CardDescription>
                </div>
                <HiOutlineClipboardDocumentCheck className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {attendanceRes.docs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
                    No attendance logs recorded yet. Logs will be generated as classes are attended.
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Joined At</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRes.docs.map((att: any) => {
                          const classTitle = typeof att.class === 'object' ? att.class?.title : 'Class'
                          const statusColor =
                            att.status === 'present'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : att.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          return (
                            <TableRow key={att.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">
                                {classTitle}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {format(new Date(att.joinedAt), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                {att.durationMinutes || 0} mins
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`capitalize shadow-none text-[10px] sm:text-xs font-semibold ${statusColor}`}>
                                  {att.status?.replace('-', ' ')}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  } catch (err) {
    console.error('Error loading student details:', err)
    return notFound()
  }
}
