'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { QuestionRenderer } from './question-renderer'
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiMiniArrowPath,
} from 'react-icons/hi2'

export type FlashCard = {
  id: string
  front: string
  back: string
}

export type FlashcardPlayerProps = {
  tutorAssessmentId: string
  assessmentTitle: string
  assessmentDescription?: string
  cards: FlashCard[]
}

type Rating = 'got_it' | 'almost' | 'no'

type RatingSummary = {
  got_it: number
  almost: number
  no: number
}

export function FlashcardPlayer({
  tutorAssessmentId,
  assessmentTitle,
  assessmentDescription,
  cards,
}: FlashcardPlayerProps) {
  const router = useRouter()

  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [flipped, setFlipped] = React.useState(false)
  const [ratings, setRatings] = React.useState<Record<string, Rating>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [mastery, setMastery] = React.useState<number | null>(null)
  const [summary, setSummary] = React.useState<RatingSummary | null>(null)

  const card = cards[currentIndex]
  const totalCards = cards.length

  const handleFlip = () => setFlipped((f) => !f)

  const handleRate = async (rating: Rating) => {
    if (!card || isSubmitting) return

    const newRatings = { ...ratings, [card.id]: rating }
    setRatings(newRatings)

    const isLast = currentIndex === totalCards - 1

    if (isLast) {
      setIsSubmitting(true)
      try {
        const selfRatings = Object.entries(newRatings).map(([questionId, r]) => ({
          questionId,
          rating: r,
        }))
        const res = await fetch('/api/assessments/results/flashcard-study', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tutorAssessmentId, selfRatings }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Could not submit.')

        const got_it = selfRatings.filter((r) => r.rating === 'got_it').length
        const almost = selfRatings.filter((r) => r.rating === 'almost').length
        const no = selfRatings.filter((r) => r.rating === 'no').length
        setMastery(data.mastery ?? 0)
        setSummary({ got_it, almost, no })
      } catch (err: any) {
        toast.error(err?.message || 'Failed to submit results.')
        setIsSubmitting(false)
      }
      return
    }

    // Move to next card
    setFlipped(false)
    // Small delay lets the flip-back animation start before switching content
    setTimeout(() => setCurrentIndex((i) => i + 1), 180)
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  if (mastery !== null && summary) {
    const masteryColor =
      mastery >= 80 ? 'text-emerald-600' : mastery >= 50 ? 'text-amber-600' : 'text-red-500'
    const masteryBg =
      mastery >= 80 ? 'bg-emerald-50' : mastery >= 50 ? 'bg-amber-50' : 'bg-red-50'
    const masteryBorder =
      mastery >= 80 ? 'border-emerald-100' : mastery >= 50 ? 'border-amber-100' : 'border-red-100'

    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center space-y-1">
          <HiOutlineSparkles className="h-8 w-8 text-tutor-purple-500 mx-auto" />
          <h2 className="text-xl font-bold">{assessmentTitle}</h2>
          <p className="text-sm text-muted-foreground">Session complete</p>
        </div>

        <div
          className={`rounded-2xl border p-8 text-center ${masteryBg} ${masteryBorder}`}
        >
          <p className={`text-7xl font-black tracking-tight leading-none ${masteryColor}`}>
            {mastery}%
          </p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Mastery
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-2xl font-black text-emerald-600">{summary.got_it}</p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">Got it</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-2xl font-black text-amber-600">{summary.almost}</p>
            <p className="text-xs text-amber-700 mt-1 font-medium">Almost</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-2xl font-black text-red-500">{summary.no}</p>
            <p className="text-xs text-red-600 mt-1 font-medium">Not yet</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => router.refresh()}
            className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
          >
            <HiOutlineCheckCircle className="h-4 w-4 mr-2" />
            View result
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/student/assessments')}
            className="w-full"
          >
            Back to assessments
          </Button>
        </div>
      </div>
    )
  }

  // ── Submitting overlay ──────────────────────────────────────────────────────
  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <HiMiniArrowPath className="h-8 w-8 animate-spin text-tutor-purple-500" />
        <p className="text-sm text-muted-foreground">Saving your results…</p>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (totalCards === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
        <HiOutlineSparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold text-sm">No flashcards yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your tutor hasn&apos;t added any cards to this set. Check back later.
        </p>
      </div>
    )
  }

  // ── Flashcard player ────────────────────────────────────────────────────────
  const progress = Math.round(((currentIndex) / totalCards) * 100)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="font-bold text-base">{assessmentTitle}</h2>
        {assessmentDescription && (
          <p className="text-xs text-muted-foreground">{assessmentDescription}</p>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Card {currentIndex + 1} of {totalCards}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="flex gap-1">
          {cards.map((c, i) => {
            const rated = ratings[c.id]
            return (
              <div
                key={c.id}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  rated === 'got_it'
                    ? 'bg-emerald-400'
                    : rated === 'almost'
                      ? 'bg-amber-400'
                      : rated === 'no'
                        ? 'bg-red-400'
                        : i === currentIndex
                          ? 'bg-tutor-purple-400'
                          : 'bg-border'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* 3D Flip Card */}
      <div style={{ perspective: '1200px' }}>
        <div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            position: 'relative',
            minHeight: '260px',
          }}
          className="w-full cursor-pointer"
          onClick={!flipped ? handleFlip : undefined}
          role="button"
          aria-label={flipped ? 'Card is showing answer' : 'Click to reveal answer'}
          tabIndex={0}
          onKeyDown={(e) => { if (!flipped && (e.key === 'Enter' || e.key === ' ')) handleFlip() }}
        >
          {/* Front face */}
          <div
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-border bg-card p-8 shadow-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
              Front
            </p>
            <div className="w-full text-center">
              <QuestionRenderer content={card?.front || ''} className="text-base font-medium" />
            </div>
            {!flipped && (
              <p className="absolute bottom-4 text-xs text-muted-foreground/60 select-none">
                Click to reveal
              </p>
            )}
          </div>

          {/* Back face */}
          <div
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-tutor-purple-200 bg-tutor-purple-50/40 p-8 shadow-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-tutor-purple-400 mb-4">
              Answer
            </p>
            <div className="w-full text-center">
              {card?.back?.trim() ? (
                <QuestionRenderer
                  content={card.back}
                  className="text-base text-tutor-purple-900"
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">No answer provided yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        {!flipped ? (
          <Button
            onClick={handleFlip}
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-2"
            size="lg"
          >
            Reveal answer
            <HiOutlineArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground font-medium">
              How well did you know this?
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleRate('no')}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-4 text-red-700 transition hover:bg-red-100 hover:border-red-300 cursor-pointer"
              >
                <span className="text-xl">✗</span>
                <span className="text-xs font-semibold">Not yet</span>
              </button>
              <button
                onClick={() => handleRate('almost')}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-amber-200 bg-amber-50 px-3 py-4 text-amber-700 transition hover:bg-amber-100 hover:border-amber-300 cursor-pointer"
              >
                <span className="text-xl">≈</span>
                <span className="text-xs font-semibold">Almost</span>
              </button>
              <button
                onClick={() => handleRate('got_it')}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-4 text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer"
              >
                <span className="text-xl">✓</span>
                <span className="text-xs font-semibold">Got it</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
