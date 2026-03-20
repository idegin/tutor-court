import Link from 'next/link';
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
    HiOutlineExclamationCircle
} from 'react-icons/hi2';
import { ScoreChart } from './score-chart';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TutorOverviewPage() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Tutor</h1>
                <p className="text-muted-foreground mt-1">Here is a summary of your students and upcoming classes.</p>
            </div>

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
                        <div className="text-2xl font-bold">24</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-emerald-500 font-medium">+3</span> from last month
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
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Next 7 days
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
                        <div className="text-2xl font-bold">86%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across all students
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
                        <div className="text-2xl font-bold">98%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-emerald-500 font-medium">+1%</span> from last week
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
                            <Button variant="ghost" size="sm" className="text-primary h-8 px-2" asChild>
                                <Link href="/dashboard/tutor/calendar">
                                    View Full Calendar <HiOutlineArrowRight className="ml-1 h-3 w-3" />
                                </Link>
                            </Button>
                        </div>
                        <CardDescription>Your next 3 classes for today and tomorrow.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                        {[
                            { name: "Emma Smith", subject: "Math - Algebra", time: "Today, 3:00 PM - 4:00 PM", status: "Starting soon" },
                            { name: "Liam Johnson", subject: "Physics - Kinematics", time: "Today, 5:30 PM - 6:30 PM", status: "" },
                            { name: "Sophia Davis", subject: "Chemistry - Bonding", time: "Tomorrow, 4:00 PM - 5:00 PM", status: "" }
                        ].map((cls, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg border-border bg-card">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border border-border">
                                        <AvatarFallback className="bg-muted text-muted-foreground font-medium">
                                            {cls.name.split(' ').map(n => n[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h4 className="text-sm font-semibold">{cls.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="font-normal border-none bg-secondary/50 text-secondary-foreground text-[10px] px-1.5 py-0">{cls.subject}</Badge>
                                            <span className="text-xs text-muted-foreground flex items-center">
                                                <HiOutlineClock className="mr-1 h-3 w-3" /> {cls.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button size="sm" variant={i === 0 ? "default" : "outline"} className={`shrink-0 ${i === 0 ? '' : 'shadow-none'}`}>
                                    <HiOutlinePlay className="mr-1.5 h-4 w-4" /> Join
                                </Button>
                            </div>
                        ))}
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
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-red-50 flex items-center justify-center mt-0.5">
                                    <HiOutlineExclamationCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Low Attendance</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Noah Brown missed 2 classes consecutively.</p>
                                    <Link href="#" className="text-xs text-red-600 hover:underline mt-1 inline-block font-medium">Contact Parent</Link>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-orange-50 flex items-center justify-center mt-0.5">
                                    <HiOutlineClock className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Quizzes Pending Review</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">3 students submitted the "Geometry Basics" quiz.</p>
                                    <Link href="#" className="text-xs text-orange-600 hover:underline mt-1 inline-block font-medium">Grade Now</Link>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-blue-50 flex items-center justify-center mt-0.5">
                                    <HiOutlineUsers className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">New Student Invite Accepted</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Oliver's parent accepted your tutor request.</p>
                                    <Link href="#" className="text-xs text-blue-600 hover:underline mt-1 inline-block font-medium">View Profile</Link>
                                </div>
                            </div>
                        </div>
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
                        <ScoreChart />
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-1 shadow-none border-border overflow-hidden flex flex-col">
                    <CardHeader className="pb-3 border-b border-border/40">
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <div className="divide-y divide-border/50">
                            {[
                                { title: "Quiz Completed", desc: "Emma Smith completed Algebra Ch.4 Quiz", time: "2 hours ago", color: "text-emerald-600", bg: "bg-emerald-50", type: "P" },
                                { title: "Class Completed", desc: "Physics 101 with Liam Johnson", time: "Yesterday, 6:30 PM", color: "text-blue-600", bg: "bg-blue-50", type: "C" },
                                { title: "Note Added", desc: "You added a progress note for Sophia", time: "Yesterday, 3:15 PM", color: "text-purple-600", bg: "bg-purple-50", type: "N" },
                                { title: "Homework Submitted", desc: "Noah Brown submitted English Essay", time: "2 days ago", color: "text-orange-600", bg: "bg-orange-50", type: "H" },
                            ].map((activity, i) => (
                                <div key={i} className="flex gap-3 p-4 hover:bg-muted/20 transition-colors">
                                    <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center font-semibold text-xs ${activity.bg} ${activity.color}`}>
                                        {activity.type}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium leading-none mb-1">{activity.title}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1">{activity.desc}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1 opacity-70">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                                {[
                                    { name: "Emma Smith", subject: "Mathematics", score: 92, attendance: 100 },
                                    { name: "Liam Johnson", subject: "Physics", score: 85, attendance: 95 },
                                    { name: "Sophia Davis", subject: "Chemistry", score: 78, attendance: 90 },
                                    { name: "Noah Brown", subject: "English", score: 65, attendance: 75 },
                                    { name: "Oliver Wilson", subject: "Mathematics", score: 88, attendance: 100 },
                                ].map((student, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6 border border-border">
                                                    <AvatarFallback className="text-[10px] bg-muted">
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
                                            <Button variant="ghost" size="sm" className="text-xs h-7 text-primary hover:text-primary/80 px-2">
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}