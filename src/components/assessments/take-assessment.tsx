'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlinePaperAirplane,
  HiOutlinePlay,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type TakeQuestion = {
  id: string
  questionText: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  points: number
  options: { optionText: string }[]
}

const TEXT_TYPES = ['short_answer', 'essay']

export type TakeAssessmentProps = {
  tutorAssessmentId: string
  assessmentTitle: string
  assessmentDescription?: string
  instructions?: string
  timeLimitMinutes?: number
  passingScore?: number
  status: 'pending' | 'in_progress' | 'completed' | 'expired'
  questions: TakeQuestion[]
  startedAt?: string | null
}

type Answers = Record<string, number[]>

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function TakeAssessment(props: TakeAssessmentProps) {
  const router = useRouter()
  const {
    tutorAssessmentId,
    assessmentTitle,
    assessmentDescription,
    instructions,
    timeLimitMinutes,
    passingScore,
    questions,
    status: initialStatus,
    startedAt: initialStartedAt,
  } = props

  const [hasStarted, setHasStarted] = React.useState(
    initialStatus === 'in_progress' && Boolean(initialStartedAt),
  )
  const [startedAt, setStartedAt] = React.useState<string | null>(initialStartedAt || null)
  const [answers, setAnswers] = React.useState<Answers>({})
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>({})
  const [isStarting, setIsStarting] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [remainingSeconds, setRemainingSeconds] = React.useState<number | null>(null)

  const limitSeconds = timeLimitMinutes && timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0

  React.useEffect(() => {
    if (!hasStarted || !startedAt || limitSeconds === 0) {
      setRemainingSeconds(null)
      return
    }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      setRemainingSeconds(Math.max(0, limitSeconds - elapsed))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [hasStarted, startedAt, limitSeconds])

  const handleStart = async () => {
    setIsStarting(true)
    try {
      const res = await fetch('/api/assessments/results/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorAssessmentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Could not start the assessment.')
      setHasStarted(true)
      setStartedAt(data.startedAt || new Date().toISOString())
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start.')
    } finally {
      setIsStarting(false)
    }
  }

  const handleSubmit = React.useCallback(
    async (auto = false) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      try {
        const payload = {
          tutorAssessmentId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedOptionIndices: TEXT_TYPES.includes(q.type) ? [] : answers[q.id] || [],
            textAnswer: TEXT_TYPES.includes(q.type) ? (textAnswers[q.id] || '').trim() : undefined,
          })),
        }
        const res = await fetch('/api/assessments/results/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Could not submit.')
        toast.success(
          auto
            ? 'Time is up. Your answers were submitted.'
            : `Submitted! You scored ${data?.result?.score ?? 0}%.`,
        )
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Failed to submit.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [answers, textAnswers, isSubmitting, questions, router, tutorAssessmentId],
  )

  React.useEffect(() => {
    if (remainingSeconds === 0 && hasStarted && !isSubmitting) {
      handleSubmit(true)
    }
  }, [remainingSeconds, hasStarted, isSubmitting, handleSubmit])

  const setSingle = (questionId: string, idx: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: [idx] }))
  }

  const toggleMulti = (questionId: string, idx: number) => {
    setAnswers((prev) => {
      const current = new Set(prev[questionId] || [])
      if (current.has(idx)) current.delete(idx)
      else current.add(idx)
      return { ...prev, [questionId]: [...current].sort((a, b) => a - b) }
    })
  }

  const setText = (questionId: string, value: string) => {
    setTextAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const isAnswered = (q: TakeQuestion) =>
    TEXT_TYPES.includes(q.type)
      ? Boolean((textAnswers[q.id] || '').trim())
      : Boolean(answers[q.id] && answers[q.id].length > 0)

  const unansweredCount = questions.filter((q) => !isAnswered(q)).length

  if (questions.length === 0) {
    return (
      <Card className="border border-dashed">
        <CardContent className="py-10 text-center">
          <HiOutlineExclamationTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-sm">No questions in this assessment yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your tutor hasn&apos;t added questions. Please check back later.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!hasStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <HiOutlineClipboardDocumentList className="h-5 w-5 text-tutor-purple-600" />
            {assessmentTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessmentDescription && (
            <p className="text-sm text-muted-foreground">{assessmentDescription}</p>
          )}
          {instructions && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <span className="font-semibold">Instructions: </span>
              {instructions}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Questions</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-2xl font-bold">
                {timeLimitMinutes && timeLimitMinutes > 0 ? `${timeLimitMinutes}m` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Time limit</p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-2xl font-bold">{passingScore ?? 70}%</p>
              <p className="text-xs text-muted-foreground mt-1">Passing</p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleStart}
            disabled={isStarting}
            className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
          >
            <HiOutlinePlay className="h-4 w-4 mr-1.5" />
            {isStarting ? 'Starting…' : 'Start assessment'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-xl">{assessmentTitle}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {questions.length} question{questions.length === 1 ? '' : 's'} ·{' '}
                {unansweredCount} unanswered
              </p>
            </div>
            {remainingSeconds !== null && (
              <div
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${
                  remainingSeconds <= 60
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-border bg-muted/40 text-foreground'
                }`}
              >
                <HiOutlineClock className="h-4 w-4" />
                {formatRemaining(remainingSeconds)}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {questions.map((q, idx) => {
        const isMulti = q.type === 'multiple_choice'
        const isText = TEXT_TYPES.includes(q.type)
        const selected = answers[q.id] || []
        return (
          <Card key={q.id}>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    Question {idx + 1}
                  </p>
                  <p className="text-sm font-medium mt-1 whitespace-pre-wrap">{q.questionText}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {q.points} {q.points === 1 ? 'pt' : 'pts'}
                </span>
              </div>

              {isText ? (
                <div className="space-y-1.5">
                  {q.type === 'short_answer' ? (
                    <Input
                      value={textAnswers[q.id] || ''}
                      onChange={(e) => setText(q.id, e.target.value)}
                      placeholder="Type your answer…"
                      className="text-sm"
                    />
                  ) : (
                    <Textarea
                      value={textAnswers[q.id] || ''}
                      onChange={(e) => setText(q.id, e.target.value)}
                      placeholder="Write your response…"
                      rows={6}
                      className="text-sm resize-y"
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    This answer will be graded by your tutor.
                  </p>
                </div>
              ) : isMulti ? (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const checked = selected.includes(oi)
                    const id = `q-${q.id}-${oi}`
                    return (
                      <label
                        key={oi}
                        htmlFor={id}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                          checked
                            ? 'border-tutor-purple-300 bg-tutor-purple-50/50'
                            : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() => toggleMulti(q.id, oi)}
                        />
                        <span className="text-sm">{opt.optionText}</span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={selected[0] !== undefined ? String(selected[0]) : ''}
                  onValueChange={(value) => setSingle(q.id, Number(value))}
                  className="space-y-2"
                >
                  {q.options.map((opt, oi) => {
                    const id = `q-${q.id}-${oi}`
                    const checked = selected[0] === oi
                    return (
                      <Label
                        key={oi}
                        htmlFor={id}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition font-normal ${
                          checked
                            ? 'border-tutor-purple-300 bg-tutor-purple-50/50'
                            : 'border-border hover:bg-muted/30'
                        }`}
                      >
                        <RadioGroupItem value={String(oi)} id={id} />
                        <span className="text-sm">{opt.optionText}</span>
                      </Label>
                    )
                  })}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        )
      })}

      <Card className="sticky bottom-4 z-10">
        <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {unansweredCount === 0 ? (
              <>
                <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
                All questions answered.
              </>
            ) : (
              <>
                <HiOutlineExclamationTriangle className="h-4 w-4 text-amber-600" />
                {unansweredCount} unanswered
              </>
            )}
          </div>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
          >
            <HiOutlinePaperAirplane className="h-4 w-4 mr-1.5" />
            {isSubmitting ? 'Submitting…' : 'Submit answers'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
