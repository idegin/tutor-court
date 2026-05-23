'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  HiOutlineUserPlus,
  HiOutlineUsers,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Child = {
  id: string
  firstName: string
  lastName: string
  generatedEmail: string
  generatedPassword: string
  gradeLevel: string | null
}

type Props = {
  parentName: string
  initialChildren: Child[]
}

export function ParentOnboardingClient({ parentName, initialChildren }: Props) {
  const router = useRouter()
  const [children, setChildren] = React.useState<Child[]>(initialChildren)
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [gradeLevel, setGradeLevel] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isFinishing, setIsFinishing] = React.useState(false)
  const [credentialModalChild, setCredentialModalChild] = React.useState<Child | null>(null)
  const [revealedIds, setRevealedIds] = React.useState<Record<string, boolean>>({})

  const onAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please enter both first and last names.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/parent/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gradeLevel: gradeLevel.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not add child.')
      }
      const data = await res.json()
      const newChild: Child = {
        id: String(data.student.id),
        firstName: data.student.firstName,
        lastName: data.student.lastName,
        generatedEmail: data.student.generatedEmail,
        generatedPassword: data.student.generatedPassword,
        gradeLevel: data.student.gradeLevel || null,
      }
      setChildren((prev) => [newChild, ...prev])
      setCredentialModalChild(newChild)
      setFirstName('')
      setLastName('')
      setGradeLevel('')
      setNotes('')
      toast.success(`${newChild.firstName} added successfully.`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const onFinish = async () => {
    if (children.length === 0) {
      toast.error('Add at least one child before continuing.')
      return
    }
    setIsFinishing(true)
    try {
      const res = await fetch('/api/parent/onboarding-complete', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Could not complete onboarding.')
      }
      router.push('/dashboard/parent')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setIsFinishing(false)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy. Please copy manually.')
    }
  }

  const togglePassword = (id: string) =>
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Image src="/logo.png" alt="TutorCourt" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-black tracking-tight">TutorCourt</span>
          <span className="ml-3 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
            Parent setup
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-tutor-purple-600">Welcome, {parentName.split(' ')[0]}</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Let's add your children</h1>
          <p className="max-w-2xl text-muted-foreground">
            Create a learning account for each child. We will generate a login they can use to join classes and view assignments.
            Save the credentials shown after each child is added — you will not see the password in plain text again.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <section className="lg:col-span-3">
            <form
              onSubmit={onAddChild}
              className="rounded-xl border bg-card p-6 md:p-8"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tutor-purple-50 text-tutor-purple-600">
                  <HiOutlineUserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Add a child</h2>
                  <p className="text-sm text-muted-foreground">
                    Their login will be generated automatically.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ada"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Okafor"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradeLevel">Grade level (optional)</Label>
                  <Input
                    id="gradeLevel"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="Grade 7"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything tutors should know about this child."
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  You can add more children later from the Students page.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
                >
                  {isSubmitting ? 'Adding…' : 'Add child'}
                </Button>
              </div>
            </form>
          </section>

          <aside className="lg:col-span-2">
            <div className="rounded-xl border bg-card p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <HiOutlineUsers className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Your children</h2>
                  <p className="text-sm text-muted-foreground">
                    {children.length} added
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {children.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No children yet. Add one to continue.
                  </p>
                ) : (
                  children.map((child) => {
                    const revealed = revealedIds[child.id]
                    return (
                      <div
                        key={child.id}
                        className="rounded-lg border bg-background p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {child.firstName} {child.lastName}
                            </p>
                            {child.gradeLevel ? (
                              <p className="text-xs text-muted-foreground">{child.gradeLevel}</p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                            <span className="truncate font-mono">{child.generatedEmail}</span>
                            <button
                              type="button"
                              onClick={() => copy(child.generatedEmail, 'Email')}
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              aria-label="Copy email"
                            >
                              <HiOutlineDocumentDuplicate className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                            <span className="truncate font-mono">
                              {revealed ? child.generatedPassword : '••••••••'}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => togglePassword(child.id)}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={revealed ? 'Hide password' : 'Show password'}
                              >
                                {revealed ? (
                                  <HiOutlineEyeSlash className="h-4 w-4" />
                                ) : (
                                  <HiOutlineEye className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => copy(child.generatedPassword, 'Password')}
                                className="text-muted-foreground hover:text-foreground"
                                aria-label="Copy password"
                              >
                                <HiOutlineDocumentDuplicate className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-10 flex flex-col-reverse items-stretch justify-between gap-3 rounded-xl border bg-card p-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Done adding children? You can always add more later.
          </p>
          <Button
            onClick={onFinish}
            disabled={isFinishing || children.length === 0}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {isFinishing ? 'Finishing…' : 'Go to my dashboard'}
            <HiOutlineCheck className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>

      <Dialog
        open={credentialModalChild !== null}
        onOpenChange={(open) => {
          if (!open) setCredentialModalChild(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save these credentials</DialogTitle>
            <DialogDescription>
              Share these with {credentialModalChild?.firstName} so they can log in.
              We won't show the password again, but you can copy it from the list anytime.
            </DialogDescription>
          </DialogHeader>
          {credentialModalChild ? (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Login email</Label>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
                  <span className="truncate">{credentialModalChild.generatedEmail}</span>
                  <button
                    type="button"
                    onClick={() => copy(credentialModalChild.generatedEmail, 'Email')}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <HiOutlineDocumentDuplicate className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Password</Label>
                <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
                  <span className="truncate">{credentialModalChild.generatedPassword}</span>
                  <button
                    type="button"
                    onClick={() =>
                      copy(credentialModalChild.generatedPassword, 'Password')
                    }
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <HiOutlineDocumentDuplicate className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              onClick={() => setCredentialModalChild(null)}
              className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700"
            >
              I've saved them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
