'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentText,
    HiOutlineClock,
    HiOutlineCalendar,
    HiOutlinePencilSquare,
} from 'react-icons/hi2'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssessmentDetailQuestion {
    id: string
    questionText: string
    type: string
    points: number
    options: { optionText: string; isCorrect: boolean }[]
}

export interface AssessmentDetailTutorAssessment {
    id: string
    assessment: {
        id: string
        title: string
        description?: string
        type: string
        timeLimitMinutes?: number
        passingScore?: number
    }
    student: {
        id: string
        firstName: string
        lastName: string
        email: string
    }
    tutor: {
        id: string
        firstName: string
        lastName: string
    }
    class: {
        id: string
        title: string
    }
    status: 'pending' | 'in_progress' | 'completed' | 'expired'
    dueDate?: string
    instructions?: string
    createdAt: string
    selectedQuestions?: AssessmentDetailQuestion[]
}

export interface AssessmentDetailResult {
    id: string
    score: number
    passed: boolean
    totalPoints: number
    earnedPoints: number
    submittedAt?: string
    timeTakenSeconds?: number
    feedback?: string
    pendingManualGrading?: boolean
    answers?: {
        question: AssessmentDetailQuestion | string
        selectedOptions: { optionIndex: number }[]
        textAnswer?: string
        isCorrect: boolean
        pointsEarned: number
    }[]
}

export interface AssessmentDetailProps {
    tutorAssessment: AssessmentDetailTutorAssessment
    result?: AssessmentDetailResult
    /** When true (tutor viewing), inline grading controls are shown for text answers. */
    canGrade?: boolean
}

const MANUAL_TYPES = ['short_answer', 'essay']

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    expired: 'Expired',
}

const STATUS_CLASSES: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    expired: 'bg-red-50 text-red-700 border-red-200',
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
}

type GradeState = Record<string, { pointsEarned: number; isCorrect: boolean }>

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentDetail({ tutorAssessment, result, canGrade = false }: AssessmentDetailProps) {
    const router = useRouter()
    const { assessment, student, status, dueDate, instructions, createdAt } = tutorAssessment

    // Manual (short-answer/essay) answers on this result.
    const manualAnswers = React.useMemo(
        () =>
            (result?.answers || []).filter((a) => {
                const q = typeof a.question === 'object' ? a.question : null
                return q && MANUAL_TYPES.includes(q.type)
            }),
        [result],
    )

    const pending = Boolean(
        result?.pendingManualGrading ??
            (manualAnswers.length > 0 && manualAnswers.every((a) => a.pointsEarned === 0)),
    )

    const [grades, setGrades] = React.useState<GradeState>(() => {
        const init: GradeState = {}
        for (const a of result?.answers || []) {
            const q = typeof a.question === 'object' ? a.question : null
            if (q && MANUAL_TYPES.includes(q.type)) {
                init[String(q.id)] = {
                    pointsEarned: Number(a.pointsEarned ?? 0),
                    isCorrect: Boolean(a.isCorrect),
                }
            }
        }
        return init
    })
    const [feedback, setFeedback] = React.useState(result?.feedback || '')
    const [saving, setSaving] = React.useState(false)

    const showGrading = canGrade && manualAnswers.length > 0

    const setGrade = (questionId: string, patch: Partial<{ pointsEarned: number; isCorrect: boolean }>) => {
        setGrades((prev) => ({
            ...prev,
            [questionId]: { ...prev[questionId], ...patch },
        }))
    }

    const handleSaveGrades = async () => {
        if (!result) return
        setSaving(true)
        try {
            const payload = {
                resultId: result.id,
                feedback,
                grades: manualAnswers.map((a) => {
                    const q = typeof a.question === 'object' ? a.question : null
                    const qid = String(q?.id)
                    const g = grades[qid] || { pointsEarned: 0, isCorrect: false }
                    return {
                        questionId: qid,
                        pointsEarned: g.pointsEarned,
                        isCorrect: g.isCorrect,
                    }
                }),
            }
            const res = await fetch('/api/assessments/results/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data?.error || 'Could not save grades.')
            toast.success('Grades saved')
            router.refresh()
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save grades.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <CardTitle className="text-xl">{assessment.title}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Assigned to:{' '}
                                <span className="font-semibold text-foreground">
                                    {student.firstName} {student.lastName}
                                </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Class:{' '}
                                {typeof tutorAssessment.class === 'object'
                                    ? tutorAssessment.class.title
                                    : '—'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <HiOutlineCalendar className="h-3 w-3" />
                                Assigned {format(new Date(createdAt), 'MMM d, yyyy')}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_CLASSES[status] || ''}`}
                            >
                                {STATUS_LABELS[status] || status}
                            </span>
                            {dueDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HiOutlineClock className="h-3 w-3" />
                                    Due {format(new Date(dueDate), 'MMM d, yyyy')}
                                </span>
                            )}
                        </div>
                    </div>
                </CardHeader>
                {(assessment.description || instructions) && (
                    <CardContent className="pt-0 space-y-2">
                        {assessment.description && (
                            <p className="text-sm text-muted-foreground">{assessment.description}</p>
                        )}
                        {instructions && (
                            <div className="p-3 bg-muted/30 rounded-lg text-xs border border-border">
                                <span className="font-semibold">Instructions: </span>
                                {instructions}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Score summary */}
            {result && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <CardTitle className="text-base">Result Summary</CardTitle>
                            {pending && (
                                <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                                >
                                    Pending review
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pending && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                                {canGrade
                                    ? 'This result has short-answer/essay questions awaiting your grading. The score below is provisional until you save grades.'
                                    : 'Some answers are still being reviewed by your tutor. The score below is provisional and may change.'}
                            </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="text-center p-4 rounded-xl bg-muted/20 border border-border">
                                <p className="text-3xl font-black text-foreground">{result.score}%</p>
                                <p className="text-xs text-muted-foreground mt-1">Score</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/20 border border-border">
                                <p className="text-2xl font-bold text-foreground">
                                    {result.earnedPoints}/{result.totalPoints}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">Points</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-muted/20 border border-border">
                                <p
                                    className={`text-xl font-bold ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}
                                >
                                    {result.passed ? 'Passed' : 'Failed'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Passing: {assessment.passingScore ?? 70}%
                                </p>
                            </div>
                            {result.timeTakenSeconds != null && result.timeTakenSeconds > 0 && (
                                <div className="text-center p-4 rounded-xl bg-muted/20 border border-border">
                                    <p className="text-xl font-bold text-foreground">
                                        {formatTime(result.timeTakenSeconds)}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Time Taken</p>
                                </div>
                            )}
                        </div>

                        {result.submittedAt && (
                            <p className="text-xs text-muted-foreground">
                                Submitted {format(new Date(result.submittedAt), 'MMM d, yyyy h:mm a')}
                            </p>
                        )}

                        {result.feedback && !showGrading && (
                            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg text-sm">
                                <span className="font-semibold text-blue-900">Tutor Feedback: </span>
                                <span className="text-blue-800">{result.feedback}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Per-question breakdown */}
            {result?.answers && result.answers.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-bold text-sm text-foreground">Question Breakdown</h3>
                    {result.answers.map((answer, idx) => {
                        const question =
                            typeof answer.question === 'object' ? answer.question : null
                        const isManual = Boolean(question && MANUAL_TYPES.includes(question.type))
                        const isPendingText = isManual && pending
                        return (
                            <Card
                                key={idx}
                                className={`border ${
                                    isPendingText
                                        ? 'border-amber-100'
                                        : answer.isCorrect
                                            ? 'border-emerald-100'
                                            : 'border-red-100'
                                }`}
                            >
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            {isPendingText ? (
                                                <HiOutlineDocumentText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                            ) : answer.isCorrect ? (
                                                <HiOutlineCheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <HiOutlineXCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground font-bold">Q{idx + 1}</span>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                        {question?.type?.replace(/_/g, ' ') || 'question'}
                                                    </Badge>
                                                    {isPendingText && (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0"
                                                        >
                                                            {canGrade ? 'Needs grading' : 'Pending tutor review'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {question?.questionText || '(Question details not available)'}
                                                </p>

                                                {/* Choice options */}
                                                {question?.options && question.options.length > 0 && (
                                                    <div className="space-y-1">
                                                        {question.options.map((opt, oi) => {
                                                            const isSelected = answer.selectedOptions?.some(
                                                                s => s.optionIndex === oi,
                                                            )
                                                            const isCorrect = opt.isCorrect
                                                            return (
                                                                <div
                                                                    key={oi}
                                                                    className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 border ${isCorrect && isSelected
                                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                            : isSelected && !isCorrect
                                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                                : isCorrect
                                                                                    ? 'bg-emerald-50/40 text-emerald-600 border-emerald-100'
                                                                                    : 'bg-muted/20 text-muted-foreground border-border'
                                                                        }`}
                                                                >
                                                                    {isCorrect ? (
                                                                        <HiOutlineCheckCircle className="h-3 w-3 shrink-0" />
                                                                    ) : (
                                                                        <HiOutlineDocumentText className="h-3 w-3 shrink-0" />
                                                                    )}
                                                                    <span className="flex-1">{opt.optionText}</span>
                                                                    {isSelected && (
                                                                        <span className="font-semibold ml-auto shrink-0">
                                                                            (selected)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* Text answer for short-answer/essay */}
                                                {isManual && (
                                                    <div className="space-y-2">
                                                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                                                Student answer
                                                            </p>
                                                            <p className="text-sm whitespace-pre-wrap">
                                                                {answer.textAnswer?.trim()
                                                                    ? answer.textAnswer
                                                                    : <span className="text-muted-foreground italic">No answer provided</span>}
                                                            </p>
                                                        </div>

                                                        {/* Tutor grading controls */}
                                                        {canGrade && question && (
                                                            <div className="flex items-center gap-3 flex-wrap rounded-lg border border-tutor-purple-100 bg-tutor-purple-50/40 p-2.5">
                                                                <HiOutlinePencilSquare className="h-4 w-4 text-tutor-purple-600 shrink-0" />
                                                                <div className="flex items-center gap-1.5">
                                                                    <label className="text-xs font-medium">Points</label>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={question.points}
                                                                        value={grades[String(question.id)]?.pointsEarned ?? 0}
                                                                        onChange={(e) => {
                                                                            const raw = Number(e.target.value)
                                                                            const clamped = Math.max(
                                                                                0,
                                                                                Math.min(question.points, isNaN(raw) ? 0 : raw),
                                                                            )
                                                                            setGrade(String(question.id), {
                                                                                pointsEarned: clamped,
                                                                                isCorrect: clamped >= question.points && question.points > 0,
                                                                            })
                                                                        }}
                                                                        className="h-8 w-20 text-sm"
                                                                    />
                                                                    <span className="text-xs text-muted-foreground">
                                                                        / {question.points}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={grades[String(question.id)]?.isCorrect ? 'default' : 'outline'}
                                                                        onClick={() =>
                                                                            setGrade(String(question.id), { isCorrect: true })
                                                                        }
                                                                        className={`h-8 text-xs cursor-pointer ${
                                                                            grades[String(question.id)]?.isCorrect
                                                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                                                : ''
                                                                        }`}
                                                                    >
                                                                        Correct
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant={!grades[String(question.id)]?.isCorrect ? 'default' : 'outline'}
                                                                        onClick={() =>
                                                                            setGrade(String(question.id), { isCorrect: false })
                                                                        }
                                                                        className={`h-8 text-xs cursor-pointer ${
                                                                            !grades[String(question.id)]?.isCorrect
                                                                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                                                                : ''
                                                                        }`}
                                                                    >
                                                                        Incorrect
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p
                                                className={`text-sm font-bold ${
                                                    isPendingText
                                                        ? 'text-amber-600'
                                                        : answer.isCorrect
                                                            ? 'text-emerald-600'
                                                            : 'text-red-500'
                                                }`}
                                            >
                                                {answer.pointsEarned}/{question?.points ?? 0} pts
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}

                    {/* Grading action panel (tutor only, when there are manual answers) */}
                    {showGrading && (
                        <Card className="border-tutor-purple-100">
                            <CardContent className="pt-4 pb-4 space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold">Feedback (optional)</label>
                                    <Textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        rows={3}
                                        placeholder="Leave overall feedback for the student…"
                                        className="text-sm resize-y"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSaveGrades}
                                        disabled={saving}
                                        className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer"
                                    >
                                        {saving ? 'Saving…' : 'Save grades'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* No result yet */}
            {!result && (
                <Card className="border border-dashed">
                    <CardContent className="py-10 text-center">
                        <HiOutlineDocumentText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="font-semibold text-sm">No submission yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {status === 'pending'
                                ? "The student hasn't started this assessment."
                                : status === 'in_progress'
                                    ? 'The student is currently working on this.'
                                    : status === 'expired'
                                        ? 'This assessment expired without a submission.'
                                        : ''}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
