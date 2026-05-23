import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineDocumentText,
    HiOutlineClock,
    HiOutlineCalendar,
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
    answers?: {
        question: AssessmentDetailQuestion | string
        selectedOptions: { optionIndex: number }[]
        isCorrect: boolean
        pointsEarned: number
    }[]
}

export interface AssessmentDetailProps {
    tutorAssessment: AssessmentDetailTutorAssessment
    result?: AssessmentDetailResult
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export function AssessmentDetail({ tutorAssessment, result }: AssessmentDetailProps) {
    const { assessment, student, status, dueDate, instructions, createdAt } = tutorAssessment

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
                        <CardTitle className="text-base">Result Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                        {result.feedback && (
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
                        return (
                            <Card
                                key={idx}
                                className={`border ${answer.isCorrect ? 'border-emerald-100' : 'border-red-100'}`}
                            >
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2 flex-1">
                                            {answer.isCorrect ? (
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
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {question?.questionText || '(Question details not available)'}
                                                </p>
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
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p
                                                className={`text-sm font-bold ${answer.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}
                                            >
                                                {answer.pointsEarned}/{question?.points ?? 0} pts
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
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
