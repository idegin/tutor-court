'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  HiOutlineCheck,
  HiOutlineArrowRight,
  HiOutlineUserPlus,
  HiOutlineExclamationTriangle,
  HiOutlineAcademicCap,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NIGERIAN_GRADES } from '@/lib/constants'

type Child = {
  id: string
  firstName: string
  lastName: string
}

type Props = {
  token: string
  invitationId: string
  classId: string
  inviteeEmail: string
  inviteeType: 'parent' | 'student'
  classTitle: string
  classDescription: string
  classSchedule: Array<{
    day: string
    startTime: string
    endTime: string
  }>
  classStartDate: string
  tutorName: string
  currentUser: any
  initialChildren: Child[]
}

export function ClassInviteClient({
  token,
  invitationId,
  classId,
  inviteeEmail,
  inviteeType,
  classTitle,
  classDescription,
  classSchedule,
  classStartDate,
  tutorName,
  currentUser,
  initialChildren,
}: Props) {
  const router = useRouter()
  
  const [children, setChildren] = useState<Child[]>(initialChildren)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [isAccepting, setIsAccepting] = useState(false)
  
  // Quick Add Child states
  const [showAddForm, setShowAddForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('grade_7')
  const [isAddingChild, setIsAddingChild] = useState(false)
  
  // Credentials modal for newly added child
  const [newChildCredentials, setNewChildCredentials] = useState<{
    firstName: string
    email: string
    password: string
  } | null>(null)

  const isEmailMatching = currentUser && currentUser.email.toLowerCase() === inviteeEmail.toLowerCase()
  const isRoleMatching = currentUser && currentUser.accountType === inviteeType

  const handleAuthRedirect = (action: 'login' | 'register') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('invite_token', token)
      localStorage.setItem('post_login_redirect', `/class-invite/${token}`)
    }
    if (action === 'login') {
      router.push(`/auth/login?redirect=/class-invite/${token}`)
    } else {
      router.push(`/auth/register?token=${token}&email=${encodeURIComponent(inviteeEmail)}&role=${inviteeType}`)
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/users/logout', { method: 'POST' })
      if (res.ok) {
        toast.success('Logged out successfully.')
        window.location.reload()
      } else {
        throw new Error('Failed to log out.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Logout failed.')
    }
  }

  const handleStudentAccept = async () => {
    setIsAccepting(true)
    try {
      const res = await fetch('/api/student/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to accept invitation.')
      }
      
      toast.success('Welcome to the class! Redirecting to dashboard...')
      router.push('/dashboard/student')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setIsAccepting(false)
    }
  }

  const handleParentAccept = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a child to enroll in the class.')
      return
    }
    
    setIsAccepting(true)
    try {
      // Accept + enroll in a single atomic request — the invitation is only
      // marked accepted once the child is successfully enrolled, so a capacity
      // failure leaves it retryable rather than consumed.
      const res = await fetch('/api/parent/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId, studentId: selectedStudentId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to accept invitation.')
      }

      toast.success('Invitation accepted! Child enrolled successfully.')
      router.push('/dashboard/parent')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setIsAccepting(false)
    }
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First name and last name are required.')
      return
    }
    
    setIsAddingChild(true)
    try {
      const res = await fetch('/api/parent/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gradeLevel: gradeLevel.trim() || undefined,
          passwordMode: 'auto',
        }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create child profile.')
      }
      
      const data = await res.json()
      const newChild: Child = {
        id: String(data.student.id),
        firstName: data.student.firstName,
        lastName: data.student.lastName,
      }
      
      setChildren(prev => [...prev, newChild])
      setSelectedStudentId(newChild.id)
      
      // Save credentials for presentation
      setNewChildCredentials({
        firstName: data.student.firstName,
        email: data.student.generatedEmail,
        password: data.student.generatedPassword,
      })
      
      setFirstName('')
      setLastName('')
      setGradeLevel('grade_7')
      setShowAddForm(false)
      toast.success('Child profile created successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsAddingChild(false)
    }
  }

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy automatically. Please copy manually.')
    }
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-16">
      {/* Premium Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TutorCourt" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-black tracking-tight text-foreground">TutorCourt</span>
          </div>
          {currentUser && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Logged in as <strong>{currentUser.email}</strong></span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <HiOutlineArrowLeftOnRectangle className="h-4 w-4" /> Log Out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-10 sm:px-6 md:pt-14">
        {/* Outer Invite Card */}
        <Card className="border border-border shadow-xl overflow-hidden rounded-2xl">
          <div className="h-2 bg-gradient-to-r from-tutor-purple-600 via-tutor-purple-500 to-tutor-purple-700" />
          
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-tutor-purple-50 px-2.5 py-0.5 text-xs font-semibold text-tutor-purple-700">
                <HiOutlineAcademicCap className="h-3.5 w-3.5" /> Class Invitation
              </span>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                Join {classTitle}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base text-muted-foreground">
                Tutor <strong>{tutorName}</strong> has invited you to join this live class.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {/* Class info box */}
            <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
              <h3 className="font-semibold text-foreground text-sm">Class Information</h3>
              {classDescription && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {classDescription}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <HiOutlineCalendarDays className="h-4 w-4 text-tutor-purple-600 shrink-0" />
                  <span>Starts: <strong>{classStartDate}</strong></span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <HiOutlineClock className="h-4 w-4 text-tutor-purple-600 shrink-0" />
                    Weekly Schedule
                  </span>
                  <div className="space-y-1 pl-6 text-xs text-muted-foreground">
                    {classSchedule.map((s, idx) => (
                      <div key={idx} className="capitalize">
                        {s.day}s @ {s.startTime} - {s.endTime}
                      </div>
                    ))}
                    {classSchedule.length === 0 && <div>Flexible hours / Scheduled as needed</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Guards / Step-by-Step acceptances */}
            {!currentUser ? (
              /* Scenario 1: Guest User */
              <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3 text-amber-800">
                  <HiOutlineExclamationTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Account registration required</p>
                    <p className="text-xs text-amber-700">
                      This invitation was sent to <strong className="text-amber-900">{inviteeEmail}</strong>. Please log in or sign up to accept this invitation.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button onClick={() => handleAuthRedirect('register')} className="flex-1 bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 font-semibold cursor-pointer">
                    Sign Up to Join <HiOutlineArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                  <Button onClick={() => handleAuthRedirect('login')} variant="outline" className="flex-1 border-border text-foreground hover:bg-muted font-semibold cursor-pointer">
                    Log In
                  </Button>
                </div>
              </div>
            ) : !isEmailMatching ? (
              /* Scenario 2: Logged in but emails mismatch */
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3 text-red-800">
                  <HiOutlineExclamationTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Email Mismatch</p>
                    <p className="text-xs text-red-700">
                      This invitation was sent to <strong className="text-red-900">{inviteeEmail}</strong>, but you are currently signed in as <strong className="text-red-900">{currentUser.email}</strong>.
                    </p>
                  </div>
                </div>
                <Button onClick={handleLogout} variant="destructive" className="w-full font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0">
                  Log Out & Switch Accounts
                </Button>
              </div>
            ) : !isRoleMatching ? (
              /* Scenario 3: Logged in with correct email but incorrect role (rare) */
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3 text-red-800">
                  <HiOutlineExclamationTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Account Role Mismatch</p>
                    <p className="text-xs text-red-700">
                      This invitation is for a <strong className="capitalize">{inviteeType}</strong>, but your current account is a <strong className="capitalize">{currentUser.accountType}</strong>.
                    </p>
                  </div>
                </div>
                <Button onClick={handleLogout} variant="destructive" className="w-full font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0">
                  Log Out & Switch Accounts
                </Button>
              </div>
            ) : inviteeType === 'student' ? (
              /* Scenario 4: Student User logged in correctly */
              <div className="space-y-4 pt-4">
                <Button
                  onClick={handleStudentAccept}
                  disabled={isAccepting}
                  className="w-full bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 font-semibold cursor-pointer h-12 text-base"
                >
                  {isAccepting ? 'Enrolling...' : 'Accept Invitation & Join Class'}
                  <HiOutlineCheck className="ml-2 h-5 w-5" />
                </Button>
              </div>
            ) : (
              /* Scenario 5: Parent User logged in correctly */
              <div className="space-y-6 pt-4 border-t">
                <div>
                  <h3 className="font-bold text-foreground text-base">Select Student Profile</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Which child will be attending this class?
                  </p>
                </div>

                {children.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No children added to your account yet. Please add a child profile below to enroll them.
                  </div>
                ) : (
                  <RadioGroup value={selectedStudentId} onValueChange={setSelectedStudentId} className="grid grid-cols-1 gap-3">
                    {children.map((child) => (
                      <label
                        key={child.id}
                        className={`flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedStudentId === child.id
                            ? 'bg-tutor-purple-50/40 border-tutor-purple-300 ring-1 ring-tutor-purple-300'
                            : 'bg-card border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={child.id} id={child.id} className="accent-tutor-purple-600" />
                          <span className="font-semibold text-sm text-foreground">
                            {child.firstName} {child.lastName}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Student</span>
                      </label>
                    ))}
                  </RadioGroup>
                )}

                {/* Add Child Toggler */}
                <div className="pt-2">
                  {!showAddForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="border-dashed border-2 hover:bg-muted/40 text-tutor-purple-600 border-tutor-purple-200 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <HiOutlineUserPlus className="h-4 w-4" /> Add a child profile
                    </Button>
                  ) : (
                    <form onSubmit={handleAddChild} className="border border-tutor-purple-100 bg-tutor-purple-50/10 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-sm font-bold text-tutor-purple-700 flex items-center gap-1">
                          <HiOutlineUserPlus className="h-4 w-4" /> Create Child Profile
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="text-xs text-muted-foreground hover:text-foreground">
                          Cancel
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName" className="text-xs">First name</Label>
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. Samuel"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName" className="text-xs">Last name</Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Okafor"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Grade level</Label>
                          <Select value={gradeLevel} onValueChange={setGradeLevel}>
                            <SelectTrigger className="bg-card border-border">
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
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isAddingChild} className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 text-xs font-semibold cursor-pointer">
                          {isAddingChild ? 'Creating...' : 'Create Child'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Confirm Assign Button */}
                <Button
                  onClick={handleParentAccept}
                  disabled={isAccepting || !selectedStudentId}
                  className="w-full bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 font-semibold cursor-pointer h-12 text-base mt-6"
                >
                  {isAccepting ? 'Enrolling Child...' : 'Enroll Child & Accept Invite'}
                  <HiOutlineCheck className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Save Child Credentials Dialog */}
      <Dialog
        open={newChildCredentials !== null}
        onOpenChange={(open) => {
          if (!open) setNewChildCredentials(null)
        }}
      >
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Save child credentials</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Please share these credentials with {newChildCredentials?.firstName} so they can log in to their student account.
              We will not display this password again, but you can copy it here.
            </DialogDescription>
          </DialogHeader>
          
          {newChildCredentials && (
            <div className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Login email</Label>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                  <span className="truncate">{newChildCredentials.email}</span>
                  <button
                    type="button"
                    onClick={() => copy(newChildCredentials.email, 'Email')}
                    className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <HiOutlineDocumentDuplicate className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground">
                  <span className="truncate">{newChildCredentials.password}</span>
                  <button
                    type="button"
                    onClick={() => copy(newChildCredentials.password, 'Password')}
                    className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <HiOutlineDocumentDuplicate className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              onClick={() => setNewChildCredentials(null)}
              className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 font-semibold cursor-pointer text-xs"
            >
              I&apos;ve saved them
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
