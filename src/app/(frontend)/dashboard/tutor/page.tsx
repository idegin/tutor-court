import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    HiOutlineUsers,
    HiOutlineCalendarDays,
    HiOutlineDocumentCheck,
    HiOutlineCheckBadge,
    HiOutlineBellAlert,
    HiOutlineClock,
    HiOutlinePlay,
    HiOutlineArrowRight,
    HiOutlineExclamationCircle,
    HiOutlineInformationCircle
} from 'react-icons/hi2';
import { ScoreChart } from './score-chart';
import { getServerSideUser } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

// Recurring event generator helper to get actual class session occurrences
function generateRecurringEvents(classes: any[]) {
  const events: any[] = [];
  const dayIndexMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const cls of classes) {
    const start = new Date(cls.startDate);
    const end = new Date(cls.endDate);
    const schedule = cls.schedule || [];

    for (const item of schedule) {
      const targetDay = dayIndexMap[item.day.toLowerCase()];
      if (targetDay === undefined) continue;

      const [startH, startM] = item.startTime.split(':').map(Number);
      const [endH, endM] = item.endTime.split(':').map(Number);

      const current = new Date(start);
      while (current <= end) {
        if (current.getDay() === targetDay) {
          const eventStart = new Date(current);
          eventStart.setHours(startH, startM, 0, 0);

          const eventEnd = new Date(current);
          eventEnd.setHours(endH, endM, 0, 0);

          const studentNames =
            cls.students && cls.students.length > 0
              ? cls.students.map((s: any) => `${s.firstName} ${s.lastName}`).join(', ')
              : 'No students';

          const subjectName = typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject');
          
          let eventTitle = '';
          if (cls.classType === 'one-on-one') {
            const firstStudent = cls.students && cls.students.length > 0 ? `${cls.students[0].firstName} ${cls.students[0].lastName}` : 'No Student';
            eventTitle = `${subjectName} with ${firstStudent}`;
          } else {
            const studentCount = cls.students ? cls.students.length : 0;
            eventTitle = `${subjectName} (Group - ${studentCount} Student${studentCount !== 1 ? 's' : ''})`;
          }

          events.push({
            id: `${cls.id}-${current.toISOString().slice(0, 10)}`,
            classId: cls.id,
            title: eventTitle,
            subject: subjectName,
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            student: studentNames,
            status: cls.status === 'active' ? 'confirmed' : 'pending',
            description: cls.description,
            scheduleText: `${item.day.charAt(0).toUpperCase() + item.day.slice(1)} (${item.startTime} - ${item.endTime})`,
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }
  }

  return events;
}

function formatEventTime(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  let dateStr = '';
  if (start.toDateString() === today.toDateString()) {
    dateStr = 'Today';
  } else if (start.toDateString() === tomorrow.toDateString()) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const timeStr = `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return `${dateStr}, ${timeStr}`;
}

export default async function TutorOverviewPage() {
    const { user, tutorProfile } = await getServerSideUser();

    if (!user || user.accountType !== 'tutor') {
        redirect('/auth/login');
    }

    const payload = await getPayload({ config });

    // 1. Fetch Classes for Tutor
    const classesRes = await payload.find({
        collection: 'classes',
        where: {
            tutor: { equals: user.id },
        },
        limit: 100,
        depth: 2,
    });

    // 2. Active Students count & student user details list
    const studentIds = new Set<string | number>();
    const studentsList: any[] = [];
    for (const cls of classesRes.docs) {
        if (cls.students && Array.isArray(cls.students)) {
            for (const student of cls.students) {
                const sId = typeof student === 'object' ? student.id : student;
                if (!studentIds.has(sId)) {
                    studentIds.add(sId);
                    if (typeof student === 'object') {
                        studentsList.push(student);
                    }
                }
            }
        }
    }
    const activeStudentsCount = studentIds.size;

    // 3. Upcoming Classes (Status is active/scheduled and ends in future)
    const upcomingClasses = classesRes.docs.filter((cls) => {
        return (cls.status === 'active' || cls.status === 'scheduled') && new Date(cls.endDate) >= new Date();
    });
    const upcomingClassesCount = upcomingClasses.length;

    // 4. Avg. Quiz Score
    const assessmentResults = await payload.find({
        collection: 'assessment-results',
        where: {
            and: [
                { tutor: { equals: user.id } },
                { submittedAt: { exists: true } }
            ]
        },
        limit: 100,
        depth: 0,
    });
    let avgQuizScore = 0;
    if (assessmentResults.docs.length > 0) {
        const sum = assessmentResults.docs.reduce((acc, doc) => acc + (doc.score || 0), 0);
        avgQuizScore = Math.round(sum / assessmentResults.docs.length);
    } else {
        avgQuizScore = 0; // Default if no scores
    }

    // 5. Attendance Rate
    const attendanceRecords = await payload.find({
        collection: 'attendance',
        where: {
            tutor: { equals: user.id },
        },
        limit: 100,
        depth: 0,
    });
    let attendanceRate = 100;
    if (attendanceRecords.docs.length > 0) {
        const presentCount = attendanceRecords.docs.filter(
            (rec) => rec.status === 'present' || rec.status === 'late' || rec.status === 'left-early'
        ).length;
        attendanceRate = Math.round((presentCount / attendanceRecords.docs.length) * 100);
    }

    // 6. Upcoming Schedule occurrences (First 3 instances today or tomorrow onwards)
    const upcomingEvents = generateRecurringEvents(classesRes.docs)
        .filter((evt) => new Date(evt.end) >= new Date())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 3);

    // 7. Recent Activity Feed
    const activityLogs = await payload.find({
        collection: 'activity-logs',
        where: {
            subject: { equals: user.id },
        },
        sort: '-createdAt',
        limit: 4,
        depth: 1,
    });

    // 8. Student Performance Table rows
    const studentsStats = await Promise.all(
        studentsList.slice(0, 5).map(async (student) => {
            const quizRes = await payload.find({
                collection: 'assessment-results',
                where: {
                    and: [
                        { tutor: { equals: user.id } },
                        { student: { equals: student.id } },
                        { submittedAt: { exists: true } },
                    ],
                },
                limit: 100,
                depth: 0,
            });
            const avgScore = quizRes.docs.length > 0
                ? Math.round(quizRes.docs.reduce((acc, d) => acc + (d.score || 0), 0) / quizRes.docs.length)
                : 100;

            const attRes = await payload.find({
                collection: 'attendance',
                where: {
                    and: [
                        { tutor: { equals: user.id } },
                        { student: { equals: student.id } },
                    ],
                },
                limit: 100,
                depth: 0,
            });
            const attendanceVal = attRes.docs.length > 0
                ? Math.round((attRes.docs.filter((r) => r.status !== 'absent').length / attRes.docs.length) * 100)
                : 100;

            const studentClasses = classesRes.docs.filter(
                (c) => c.students?.some((s: any) => (typeof s === 'object' ? s.id : s) === student.id)
            );
            const subjectFocus = studentClasses.length > 0 && typeof studentClasses[0].subject === 'object'
                ? (studentClasses[0].subject as any).name
                : 'General';

            return {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                subject: subjectFocus,
                score: avgScore,
                attendance: attendanceVal,
            };
        })
    );

    // 9. Alerts (Quizzes Pending Review, Recent absences)
    const alertItems: any[] = [];
    const pendingQuizzes = await payload.find({
        collection: 'assessment-results',
        where: {
            and: [
                { tutor: { equals: user.id } },
                { submittedAt: { exists: true } },
                { feedback: { exists: false } }
            ]
        },
        limit: 5,
        depth: 1,
    });
    if (pendingQuizzes.totalDocs > 0) {
        alertItems.push({
            type: 'quiz',
            title: 'Quizzes Pending Review',
            desc: `${pendingQuizzes.totalDocs} quiz submissions need your review & feedback.`,
            link: '/dashboard/tutor/classes',
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            icon: HiOutlineClock,
        });
    }

    const recentAbsences = await payload.find({
        collection: 'attendance',
        where: {
            and: [
                { tutor: { equals: user.id } },
                { status: { equals: 'absent' } }
            ]
        },
        limit: 2,
        sort: '-createdAt',
        depth: 1,
    });
    recentAbsences.docs.forEach((abs: any) => {
        const studentName = abs.student && typeof abs.student === 'object' ? `${abs.student.firstName} ${abs.student.lastName}` : 'A student';
        alertItems.push({
            type: 'absence',
            title: 'Student Absence',
            desc: `${studentName} missed a scheduled class session recently.`,
            link: `/dashboard/tutor/classes/${typeof abs.class === 'object' ? abs.class.id : abs.class}`,
            color: 'text-red-600',
            bg: 'bg-red-50',
            icon: HiOutlineExclamationCircle,
        });
    });

    // 10. Chart Trend calculation (Last 8 Weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const chartResults = await payload.find({
        collection: 'assessment-results',
        where: {
            and: [
                { tutor: { equals: user.id } },
                { submittedAt: { exists: true } },
                { submittedAt: { greater_than_equal: eightWeeksAgo.toISOString() } },
            ],
        },
        limit: 100,
        depth: 0,
        sort: 'submittedAt',
    });

    const weekData = Array.from({ length: 8 }).map((_, idx) => {
        const startOfOfWeek = new Date(eightWeeksAgo);
        startOfOfWeek.setDate(startOfOfWeek.getDate() + idx * 7);
        const endOfOfWeek = new Date(startOfOfWeek);
        endOfOfWeek.setDate(endOfOfWeek.getDate() + 7);

        const weeklyDocs = chartResults.docs.filter((doc) => {
            if (!doc.submittedAt) return false;
            const d = new Date(doc.submittedAt);
            return d >= startOfOfWeek && d < endOfOfWeek;
        });

        const avg = weeklyDocs.length > 0
            ? Math.round(weeklyDocs.reduce((acc, d) => acc + (d.score || 0), 0) / weeklyDocs.length)
            : null;

        return {
            name: `Wk ${idx + 1}`,
            score: avg,
        };
    });

    let lastValidScore = 80;
    const finalChartData = weekData.map((d) => {
        if (d.score !== null) {
            lastValidScore = d.score;
        }
        return {
            name: d.name,
            score: d.score !== null ? d.score : lastValidScore,
        };
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, {user.firstName}</h1>
                <p className="text-muted-foreground mt-1">Here is a summary of your students and upcoming classes.</p>
            </div>

            {/* Profile Completion Banner */}
            {tutorProfile && !tutorProfile.onboardingCompleted && (
                <div className="bg-tutor-purple-100 border-2 border-foreground rounded p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 shrink-0 rounded-full border-2 border-foreground bg-white flex items-center justify-center text-tutor-purple-600">
                            <HiOutlineInformationCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Complete Your Tutor Profile</h3>
                            <p className="text-sm font-medium text-foreground/80 mt-1 max-w-xl">
                                Your profile is missing some important details. Completing your profile helps students find you and book your classes more easily.
                            </p>
                        </div>
                    </div>
                    <Button asChild className="shrink-0 bg-tutor-red-500 hover:bg-tutor-red-600 text-white border-2 border-foreground font-bold shadow-none rounded">
                        <Link href="/tutor-onboarding">
                            Complete Profile Now
                        </Link>
                    </Button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <HiOutlineUsers className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeStudentsCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Enrolled across all classes
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Classes</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                            <HiOutlineCalendarDays className="h-4 w-4 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{upcomingClassesCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Scheduled classes remaining
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Quiz Score</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <HiOutlineDocumentCheck className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgQuizScore}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all quiz submissions
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <HiOutlineCheckBadge className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{attendanceRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Average student attendance
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Upcoming Schedule */}
                <Card className="col-span-1 lg:col-span-2 shadow-none border-border flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Upcoming Schedule</CardTitle>
                            <Button variant="ghost" size="sm" className="text-secondary h-8 px-2" asChild>
                                <Link href="/dashboard/tutor/calendar">
                                    View Full Calendar <HiOutlineArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                        <CardDescription>Your next 3 scheduled class sessions.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        {upcomingEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed border-border">
                                <HiOutlineCalendarDays className="h-10 w-10 text-muted-foreground/60 mb-2" />
                                <p className="text-sm font-medium text-muted-foreground">No upcoming classes scheduled</p>
                            </div>
                        ) : (
                            upcomingEvents.map((evt, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg border-border bg-card">
                                    <div className="flex items-center gap-4">
                                        <Link href={`/dashboard/tutor/classes/${evt.classId}`} className="flex items-center gap-4 hover:opacity-85 transition-opacity">
                                            <Avatar className="h-10 w-10 border border-border">
                                                <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                                                    {evt.subject.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h4 className="text-sm font-semibold hover:text-tutor-purple-600 transition-colors">{evt.title}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="font-normal border-none bg-secondary/50 text-secondary-foreground text-[10px] px-1.5 py-0">{evt.subject}</Badge>
                                                    <span className="text-xs text-muted-foreground flex items-center">
                                                        <HiOutlineClock className="mr-1 h-3 w-3" /> {formatEventTime(evt.start, evt.end)}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                    <Button asChild size="sm" variant={i === 0 ? "default" : "outline"} className={`shrink-0 ${i === 0 ? '' : 'shadow-none'}`}>
                                        <Link href={`/classroom/${evt.classId}`}>
                                            <HiOutlinePlay className="mr-1.5 h-4 w-4" /> Join
                                        </Link>
                                    </Button>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Notifications & Alerts */}
                <Card className="col-span-1 shadow-none border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <HiOutlineBellAlert className="mr-2 h-5 w-5 text-muted-foreground" />
                            Action Needed
                        </CardTitle>
                        <CardDescription>Important alerts and notifications</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {alertItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <HiOutlineCheckBadge className="h-10 w-10 text-emerald-500 mb-2" />
                                <p className="text-sm font-semibold text-foreground">You are all caught up!</p>
                                <p className="text-xs text-muted-foreground mt-0.5">No immediate items require your attention.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {alertItems.map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={idx} className="flex gap-3">
                                            <div className={`h-8 w-8 shrink-0 rounded-full ${item.bg} flex items-center justify-center mt-0.5`}>
                                                <Icon className={`h-4 w-4 ${item.color}`} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{item.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                                                <Link href={item.link} className={`text-xs ${item.color} hover:underline mt-1 inline-block font-semibold`}>
                                                    Review Now
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Progress Chart */}
                <Card className="col-span-1 lg:col-span-2 shadow-none border-border">
                    <CardHeader>
                        <CardTitle>Average Score Trends</CardTitle>
                        <CardDescription>Overall performance trajectory over the last 8 weeks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScoreChart data={finalChartData} />
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-1 shadow-none border-border overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {activityLogs.docs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <HiOutlineInformationCircle className="h-10 w-10 text-muted-foreground/60 mb-2" />
                                <p className="text-sm font-medium text-muted-foreground">No recent activity logged</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {activityLogs.docs.map((log: any, i) => {
                                    const timeAgo = formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
                                    const initials = log.actor && typeof log.actor === 'object'
                                        ? `${log.actor.firstName?.[0] || ''}${log.actor.lastName?.[0] || ''}`.toUpperCase()
                                        : 'A';

                                    return (
                                        <div key={i} className="flex gap-3 p-4 hover:bg-muted/20 transition-colors">
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-xs">
                                                {initials}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold leading-none mb-1">{log.title}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{log.description}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{timeAgo}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Student Performance Table */}
            <Card className="shadow-none border-border">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle>Student Performance Overview</CardTitle>
                            <CardDescription>Quick glance at recent progress and engagement.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shadow-none" asChild>
                            <Link href="/dashboard/tutor/classes">Manage Students</Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Student</TableHead>
                                    <TableHead>Subject Focus</TableHead>
                                    <TableHead>Avg Score</TableHead>
                                    <TableHead>Attendance</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentsStats.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            No student records found. Invite parents/students to get started!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    studentsStats.map((student, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6 border border-border">
                                                        <AvatarFallback className="text-[10px] bg-muted font-bold">
                                                            {student.name.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {student.name}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="font-normal rounded-md shadow-none">{student.subject}</Badge></TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-8 text-sm">{student.score}%</span>
                                                    <Progress value={student.score} className="h-1.5 w-[60px]"
                                                        indicatorClassName={
                                                            student.score >= 90 ? 'bg-emerald-500' :
                                                                student.score >= 80 ? 'bg-blue-500' :
                                                                    student.score >= 70 ? 'bg-orange-500' : 'bg-red-500'
                                                        }
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell>{student.attendance}%</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary/80 px-2">
                                                    <Link href={`/dashboard/tutor/classes`}>View</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}