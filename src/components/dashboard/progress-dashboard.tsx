'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  HiOutlineClipboardDocumentCheck,
  HiOutlineChartBar,
  HiOutlineCheckBadge,
  HiOutlineTrophy,
  HiOutlineArrowRight,
} from 'react-icons/hi2'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Role = 'tutor' | 'student' | 'parent'

interface ProgressSummary {
  totalAssessments: number
  averageScore: number
  passRate: number
  bestScore: number
  latestScore: number
}

interface TrendPoint {
  date: string | null
  score: number
  title: string
}

interface SubjectBreakdown {
  subject: string
  averageScore: number
  count: number
}

interface ResultRow {
  id: string
  title: string
  subject: string
  studentName: string
  studentId: string | null
  className: string | null
  score: number
  passed: boolean
  pending?: boolean
  passingScore: number
  attempt: number
  submittedAt: string | null
  tutorAssessmentId: string | null
}

interface StudentOption {
  id: string
  name: string
}

interface ProgressPayload {
  summary: ProgressSummary
  trend: TrendPoint[]
  bySubject: SubjectBreakdown[]
  results: ResultRow[]
  students: StudentOption[]
}

interface ProgressDashboardProps {
  role: Role
  /** Optional pre-supplied student list for the filter (tutor/parent). */
  students?: StudentOption[]
}

const scoreColor = (score: number) =>
  score >= 90
    ? 'bg-emerald-500'
    : score >= 80
      ? 'bg-blue-500'
      : score >= 70
        ? 'bg-orange-500'
        : 'bg-red-500'

/** Build the per-assessment deep-link for the current role. */
function detailHref(role: Role, row: ResultRow): string | null {
  if (!row.tutorAssessmentId) return null
  if (role === 'student') return `/dashboard/student/assessments/${row.tutorAssessmentId}`
  if (role === 'tutor') return `/dashboard/tutor/assessments/${row.tutorAssessmentId}`
  // parent — needs the child user id in the path
  if (!row.studentId) return null
  return `/dashboard/parent/students/${row.studentId}/assessments/${row.tutorAssessmentId}`
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <Card className="shadow-none border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function TrendChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((p, i) => ({
    name: p.date
      ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : `#${i + 1}`,
    score: p.score,
    title: p.title,
  }))

  return (
    <div className="h-[250px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: 'none' }}
            itemStyle={{ color: '#111827', fontWeight: 600 }}
            formatter={(value: any) => [`${value}%`, 'Score']}
            labelFormatter={(_label: any, payload: any) =>
              payload && payload[0] ? payload[0].payload.title : ''
            }
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#0ea5e9"
            strokeWidth={2}
            activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
            dot={{ r: 3, fill: '#0ea5e9' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

export function ProgressDashboard({ role, students: initialStudents }: ProgressDashboardProps) {
  const [data, setData] = useState<ProgressPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<string>('all')

  const fetchProgress = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (selectedStudent !== 'all') params.set('studentId', selectedStudent)
      const qs = params.toString()
      const res = await fetch(`/api/assessments/progress${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('Failed to load progress.')
      const json = (await res.json()) as ProgressPayload
      setData(json)
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedStudent])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Prefer server-supplied students; fall back to whatever the API returns.
  const studentOptions = useMemo<StudentOption[]>(() => {
    if (initialStudents && initialStudents.length > 0) return initialStudents
    return data?.students || []
  }, [initialStudents, data])

  const showStudentFilter = role !== 'student' && studentOptions.length > 1

  if (isLoading && !data) return <LoadingSkeleton />

  const summary = data?.summary
  const hasData = (summary?.totalAssessments || 0) > 0

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Progress</h1>
          <p className="text-muted-foreground mt-1">
            {role === 'student'
              ? 'Your consolidated assessment performance across all subjects.'
              : role === 'parent'
                ? "Track your children's assessment performance in one place."
                : 'A consolidated view of your students’ assessment performance.'}
          </p>
        </div>
        {showStudentFilter && (
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {role === 'parent' ? 'All children' : 'All students'}
              </SelectItem>
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {error && (
        <Card className="border-destructive/40 shadow-none">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {!hasData ? (
        <Card className="shadow-none border-border">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <HiOutlineChartBar className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">No assessments completed yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {role === 'student'
                ? 'Once you complete assessments, your scores and trends will appear here.'
                : 'Once assessments are completed, scores and trends will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total assessments"
              value={String(summary!.totalAssessments)}
              hint="Completed submissions"
              icon={<HiOutlineClipboardDocumentCheck className="h-4 w-4 text-blue-600" />}
              accent="bg-blue-100"
            />
            <StatCard
              label="Average score"
              value={`${summary!.averageScore}%`}
              hint={`Latest: ${summary!.latestScore}%`}
              icon={<HiOutlineChartBar className="h-4 w-4 text-emerald-600" />}
              accent="bg-emerald-100"
            />
            <StatCard
              label="Pass rate"
              value={`${summary!.passRate}%`}
              hint="Across all attempts"
              icon={<HiOutlineCheckBadge className="h-4 w-4 text-purple-600" />}
              accent="bg-purple-100"
            />
            <StatCard
              label="Best score"
              value={`${summary!.bestScore}%`}
              hint="Highest single result"
              icon={<HiOutlineTrophy className="h-4 w-4 text-orange-600" />}
              accent="bg-orange-100"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Trend chart */}
            <Card className="shadow-none border-border lg:col-span-2">
              <CardHeader>
                <CardTitle>Score Trend</CardTitle>
                <CardDescription>Performance across completed assessments over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart data={data!.trend} />
              </CardContent>
            </Card>

            {/* Per-subject breakdown */}
            <Card className="shadow-none border-border">
              <CardHeader>
                <CardTitle>By Subject</CardTitle>
                <CardDescription>Average score per subject.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {data!.bySubject.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No subject data.</p>
                ) : (
                  data!.bySubject.map((s) => (
                    <div key={s.subject} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.subject}</span>
                        <span className="text-muted-foreground">
                          {s.averageScore}%{' '}
                          <span className="text-xs">
                            ({s.count} {s.count === 1 ? 'result' : 'results'})
                          </span>
                        </span>
                      </div>
                      <Progress
                        value={s.averageScore}
                        className="h-2"
                        indicatorClassName={scoreColor(s.averageScore)}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results table */}
          <Card className="shadow-none border-border">
            <CardHeader>
              <CardTitle>Assessment Results</CardTitle>
              <CardDescription>Every completed attempt, most recent first.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Assessment</TableHead>
                      <TableHead>Subject</TableHead>
                      {role !== 'student' && <TableHead>Student</TableHead>}
                      <TableHead>Score</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data!.results.map((row) => {
                      const href = detailHref(role, row)
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.title}
                            {row.attempt > 1 && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (attempt {row.attempt})
                              </span>
                            )}
                            {row.className && (
                              <div className="text-xs text-muted-foreground">{row.className}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal rounded-md shadow-none">
                              {row.subject}
                            </Badge>
                          </TableCell>
                          {role !== 'student' && (
                            <TableCell className="text-sm">{row.studentName}</TableCell>
                          )}
                          <TableCell>
                            {row.pending ? (
                              <span className="text-sm text-muted-foreground">—</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="w-9 text-sm font-medium">{row.score}%</span>
                                <Progress
                                  value={row.score}
                                  className="h-1.5 w-[60px]"
                                  indicatorClassName={scoreColor(row.score)}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.pending ? (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                Pending review
                              </Badge>
                            ) : (
                              <Badge
                                variant={row.passed ? 'default' : 'destructive'}
                                className={row.passed ? 'bg-emerald-500 text-white' : ''}
                              >
                                {row.passed ? 'Passed' : 'Failed'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.submittedAt
                              ? new Date(row.submittedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {href ? (
                              <Link
                                href={href}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
                              >
                                View <HiOutlineArrowRight className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
