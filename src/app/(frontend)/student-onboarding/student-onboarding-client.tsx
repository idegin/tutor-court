'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineBookOpen,
  HiOutlineEnvelopeOpen,
  HiOutlineCheckCircle,
  HiOutlineAcademicCap,
  HiOutlineArrowRight,
  HiOutlineArrowLeft,
  HiCheckCircle,
  HiOutlineCheck,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NIGERIAN_GRADES } from '@/lib/constants'

type Subject = { id: string; name: string }

type PendingInvitation = {
  id: string
  className: string
  classId: string
  tutorName: string
}

type EnrolledClass = {
  className: string
  tutorName: string
}

type Props = {
  studentName: string
  subjects: Subject[]
  pendingInvitations: PendingInvitation[]
  enrolledClasses: EnrolledClass[]
  initialGradeLevel: string
  initialCountry: string
  initialSubjectIds: string[]
}

type StepId = 'welcome' | 'profile' | 'subjects' | 'invitations' | 'success'

export function StudentOnboardingClient({
  studentName,
  subjects,
  pendingInvitations: initialPending,
  enrolledClasses: initialEnrolled,
  initialGradeLevel,
  initialCountry,
  initialSubjectIds,
}: Props) {
  const router = useRouter()

  const hasInvitations = initialPending.length > 0 || initialEnrolled.length > 0

  const baseSteps: StepId[] = ['welcome', 'profile', 'subjects']
  const steps: StepId[] = hasInvitations
    ? [...baseSteps, 'invitations', 'success']
    : [...baseSteps, 'success']

  const [stepIndex, setStepIndex] = React.useState(0)
  const currentStep = steps[stepIndex]

  const [gradeLevel, setGradeLevel] = React.useState(initialGradeLevel || 'jss_1')
  const [country, setCountry] = React.useState(initialCountry)
  const [learningGoals, setLearningGoals] = React.useState('')

  const [selectedSubjectIds, setSelectedSubjectIds] = React.useState<string[]>(initialSubjectIds)
  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    )
  }

  const [pendingInvitations, setPendingInvitations] = React.useState(initialPending)
  const [acceptingId, setAcceptingId] = React.useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const onAcceptInvitation = async (invitationId: string) => {
    setAcceptingId(invitationId)
    try {
      const res = await fetch('/api/student/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not accept invitation.')
      }
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
      toast.success('Invitation accepted!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAcceptingId(null)
    }
  }

  const handleNextFromProfile = () => {
    if (!gradeLevel.trim()) {
      toast.error('Please enter your grade or year of study.')
      return
    }
    goNext()
  }

  const handleNextFromSubjects = () => {
    if (selectedSubjectIds.length === 0) {
      toast.error('Pick at least one subject you’re interested in.')
      return
    }
    goNext()
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/student/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: gradeLevel.trim(),
          country: country.trim() || undefined,
          learningGoals: learningGoals.trim() || undefined,
          subjectIds: selectedSubjectIds,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not complete onboarding.')
      }
      router.push('/dashboard/student')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setIsSubmitting(false)
    }
  }

  const totalProgressSteps = steps.length - 1
  const progressPct = totalProgressSteps === 0 ? 100 : Math.round((stepIndex / totalProgressSteps) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-tutor-purple-50/30">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Image src="/logo.png" alt="TutorCourt" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-black tracking-tight">TutorCourt</span>
          <span className="ml-3 rounded-full bg-tutor-purple-100 px-2.5 py-0.5 text-xs font-semibold text-tutor-purple-700 animate-pulse">
            Student setup
          </span>
          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <span className="text-xs font-semibold text-muted-foreground">
              Step {Math.min(stepIndex + 1, steps.length)} of {steps.length}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-tutor-purple-600 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        {currentStep === 'welcome' && (
          <WelcomeStep
            studentName={studentName}
            onNext={goNext}
            hasInvitations={hasInvitations}
          />
        )}

        {currentStep === 'profile' && (
          <ProfileStep
            gradeLevel={gradeLevel}
            country={country}
            learningGoals={learningGoals}
            onChangeGrade={setGradeLevel}
            onChangeCountry={setCountry}
            onChangeGoals={setLearningGoals}
            onNext={handleNextFromProfile}
            onBack={goBack}
          />
        )}

        {currentStep === 'subjects' && (
          <SubjectsStep
            subjects={subjects}
            selectedIds={selectedSubjectIds}
            onToggle={toggleSubject}
            onNext={handleNextFromSubjects}
            onBack={goBack}
          />
        )}

        {currentStep === 'invitations' && (
          <InvitationsStep
            pendingInvitations={pendingInvitations}
            enrolledClasses={initialEnrolled}
            acceptingId={acceptingId}
            onAccept={onAcceptInvitation}
            onNext={goNext}
            onBack={goBack}
          />
        )}

        {currentStep === 'success' && (
          <SuccessStep
            studentName={studentName}
            subjectsCount={selectedSubjectIds.length}
            onFinish={handleFinish}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  )
}

function StepCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-10">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tutor-purple-100 text-tutor-purple-700">
          {icon}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  )
}

function StepActions({
  onBack,
  onNext,
  nextLabel = 'Continue',
  isNextLoading,
  hideBack,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  isNextLoading?: boolean
  hideBack?: boolean
}) {
  return (
    <div className="mt-10 flex items-center justify-between gap-3 border-t pt-6">
      {hideBack ? (
        <div />
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={isNextLoading}
          className="cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <HiOutlineArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      )}
      <Button
        type="button"
        onClick={onNext}
        disabled={isNextLoading}
        className="cursor-pointer bg-tutor-purple-600 font-semibold text-white hover:bg-tutor-purple-700"
      >
        {isNextLoading ? 'Saving…' : nextLabel}
        {!isNextLoading && <HiOutlineArrowRight className="ml-1.5 h-4 w-4" />}
      </Button>
    </div>
  )
}

function WelcomeStep({
  studentName,
  onNext,
  hasInvitations,
}: {
  studentName: string
  onNext: () => void
  hasInvitations: boolean
}) {
  const firstName = studentName.split(' ')[0]
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-tutor-purple-100 text-tutor-purple-700 shadow-sm">
          <HiOutlineSparkles className="h-8 w-8" />
        </div>
        <p className="text-sm font-semibold text-tutor-purple-600">Welcome to TutorCourt</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Hi {firstName}, let’s set up your account
        </h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          We’ll ask a couple of quick questions about your learning goals and the subjects
          you’re interested in. {hasInvitations ? 'You also have tutor invitations waiting.' : 'It only takes a minute.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FeatureBullet
          icon={<HiOutlineUserCircle className="h-5 w-5" />}
          title="Tell us about you"
          subtitle="Grade level and where you’re from."
        />
        <FeatureBullet
          icon={<HiOutlineBookOpen className="h-5 w-5" />}
          title="Pick your subjects"
          subtitle="The topics you want to learn."
        />
        <FeatureBullet
          icon={<HiOutlineAcademicCap className="h-5 w-5" />}
          title="Join your classes"
          subtitle="Accept invites from tutors."
        />
      </div>

      <div className="flex justify-center pt-2">
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          className="cursor-pointer bg-tutor-purple-600 px-8 font-semibold text-white hover:bg-tutor-purple-700"
        >
          Get started <HiOutlineArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function FeatureBullet({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
        {icon}
      </div>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function ProfileStep({
  gradeLevel,
  country,
  learningGoals,
  onChangeGrade,
  onChangeCountry,
  onChangeGoals,
  onNext,
  onBack,
}: {
  gradeLevel: string
  country: string
  learningGoals: string
  onChangeGrade: (v: string) => void
  onChangeCountry: (v: string) => void
  onChangeGoals: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <StepCard
      icon={<HiOutlineUserCircle className="h-6 w-6" />}
      title="Tell us about yourself"
      description="This helps tutors get to know you and recommend the right classes."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>
            Grade level <span className="text-tutor-purple-600">*</span>
          </Label>
          <Select value={gradeLevel} onValueChange={onChangeGrade}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {NIGERIAN_GRADES.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (optional)</Label>
          <Input
            id="country"
            value={country}
            onChange={(e) => onChangeCountry(e.target.value)}
            placeholder="Nigeria"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="learningGoals">What do you want to achieve? (optional)</Label>
          <Textarea
            id="learningGoals"
            value={learningGoals}
            onChange={(e) => onChangeGoals(e.target.value)}
            placeholder="Pass my math exam, improve my writing, prepare for SATs…"
            rows={3}
          />
        </div>
      </div>

      <StepActions onBack={onBack} onNext={onNext} />
    </StepCard>
  )
}

function SubjectsStep({
  subjects,
  selectedIds,
  onToggle,
  onNext,
  onBack,
}: {
  subjects: Subject[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <StepCard
      icon={<HiOutlineBookOpen className="h-6 w-6" />}
      title="What subjects are you interested in?"
      description="Pick all that apply. We’ll use this to surface relevant tutors and recommendations."
    >
      {subjects.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No subjects available yet. You can update this later in your profile.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subjects.map((s) => {
            const selected = selectedIds.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggle(s.id)}
                className={`group relative flex items-center justify-between gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  selected
                    ? 'border-tutor-purple-500 bg-tutor-purple-50 shadow-sm ring-2 ring-tutor-purple-200'
                    : 'border-border bg-card hover:border-tutor-purple-300 hover:bg-muted/30'
                }`}
              >
                <span className={`text-sm font-semibold ${selected ? 'text-tutor-purple-700' : 'text-foreground'}`}>
                  {s.name}
                </span>
                {selected ? (
                  <HiCheckCircle className="h-5 w-5 shrink-0 text-tutor-purple-600" />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/30 transition-colors group-hover:border-tutor-purple-400" />
                )}
              </button>
            )
          })}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {selectedIds.length} {selectedIds.length === 1 ? 'subject' : 'subjects'} selected
      </p>

      <StepActions onBack={onBack} onNext={onNext} />
    </StepCard>
  )
}

function InvitationsStep({
  pendingInvitations,
  enrolledClasses,
  acceptingId,
  onAccept,
  onNext,
  onBack,
}: {
  pendingInvitations: PendingInvitation[]
  enrolledClasses: EnrolledClass[]
  acceptingId: string | null
  onAccept: (id: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <StepCard
      icon={<HiOutlineEnvelopeOpen className="h-6 w-6" />}
      title="Tutor invitations"
      description="Accept invitations to join the classes your tutors set up for you."
    >
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pending invitations
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{inv.className}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Invited by {inv.tutorName}
                  </p>
                </div>
                <Button
                  onClick={() => onAccept(inv.id)}
                  disabled={acceptingId === inv.id}
                  className="mt-4 h-8 cursor-pointer bg-tutor-purple-600 text-xs font-semibold text-white hover:bg-tutor-purple-700"
                >
                  {acceptingId === inv.id ? 'Accepting…' : 'Accept invite'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrolledClasses.length > 0 && (
        <div className={`space-y-3 ${pendingInvitations.length > 0 ? 'mt-8' : ''}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            You’re already enrolled in
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {enrolledClasses.map((cls, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50/60 p-4"
              >
                <HiOutlineCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-900">{cls.className}</p>
                  <p className="text-xs text-green-700">Tutor: {cls.tutorName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingInvitations.length === 0 && enrolledClasses.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No invitations right now. You can join classes later when tutors invite you.
        </p>
      )}

      <StepActions onBack={onBack} onNext={onNext} />
    </StepCard>
  )
}

function SuccessStep({
  studentName,
  subjectsCount,
  onFinish,
  isSubmitting,
}: {
  studentName: string
  subjectsCount: number
  onFinish: () => void
  isSubmitting: boolean
}) {
  const firstName = studentName.split(' ')[0]
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 text-green-600 shadow-sm">
        <HiOutlineCheck className="h-10 w-10" strokeWidth={3} />
      </div>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-tutor-purple-600">All set</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          You’re ready to learn, {firstName}!
        </h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          We’ve saved your interests in {subjectsCount}{' '}
          {subjectsCount === 1 ? 'subject' : 'subjects'}. Head to your dashboard to see
          your upcoming classes and assessments.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        onClick={onFinish}
        disabled={isSubmitting}
        className="cursor-pointer bg-tutor-purple-600 px-8 font-semibold text-white hover:bg-tutor-purple-700"
      >
        {isSubmitting ? 'Finishing up…' : 'Go to my dashboard'}
        {!isSubmitting && <HiOutlineArrowRight className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  )
}
