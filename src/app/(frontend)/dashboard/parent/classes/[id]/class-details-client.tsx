'use client'

import * as React from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  HiOutlineArrowLeft,
  HiOutlineUserPlus,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineAcademicCap,
  HiOutlineEnvelope,
  HiOutlineDocumentDuplicate,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineUsers,
} from 'react-icons/hi2'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  email: string
  gradeLevel: string
  userId: string
}

type Props = {
  classId: string
  classTitle: string
  classDescription: string
  classSchedule: Array<{
    day: string
    startTime: string
    endTime: string
  }>
  classStartDate: string
  classEndDate: string
  classStatus: string
  classType: string
  maxStudents: number
  enrolledStudentsCount: number
  subjectName: string
  tutorName: string
  tutorEmail: string
  enrolledChildren: Child[]
  unenrolledChildren: Child[]
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export function ParentClassDetailsClient({
  classId,
  classTitle,
  classDescription,
  classSchedule,
  classStartDate,
  classEndDate,
  classStatus,
  classType,
  maxStudents,
  enrolledStudentsCount,
  subjectName,
  tutorName,
  tutorEmail,
  enrolledChildren,
  unenrolledChildren,
}: Props) {
  const router = useRouter()
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Add child inline form states
  const [showAddForm, setShowAddForm] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('grade_7')
  const [isAddingChild, setIsAddingChild] = useState(false)

  // New child credentials presentation modal
  const [newChildCredentials, setNewChildCredentials] = useState<{
    firstName: string
    email: string
    password: string
  } | null>(null)

  const handleEnrollStudent = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student to enroll.')
      return
    }

    setIsEnrolling(true)
    try {
      const res = await fetch('/api/parent/classes/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, studentId: selectedStudentId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to enroll student.')
      }

      toast.success('Child enrolled successfully!')
      setSelectedStudentId('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsEnrolling(false)
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
      router.refresh()
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

  // Capacity indicators
  const isFull = maxStudents > 0 && enrolledStudentsCount >= maxStudents
  const isOneOnOneFull = classType === 'one-on-one' && enrolledStudentsCount >= 1

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6 lg:px-8">
      {/* Back to list */}
      <Link
        href="/dashboard/parent/classes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <HiOutlineArrowLeft className="h-4 w-4" /> Back to My Classes
      </Link>

      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`capitalize font-semibold border ${STATUS_COLORS[classStatus] || 'bg-secondary text-secondary-foreground border-border'}`}>
              {classStatus}
            </Badge>
            <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider">
              {classType === 'one-on-one' ? '1-on-1 Class' : 'Group Class'}
            </Badge>
            {maxStudents > 0 && (
              <Badge variant="outline" className="text-[10px] font-medium border-border">
                Cap: {enrolledStudentsCount}/{maxStudents} Students
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            {classTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Subject: <strong>{subjectName}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Columns - Enrollment management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrolled Students Card */}
          <Card className="shadow-none border-border rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600" /> Enrolled Children
              </CardTitle>
              <CardDescription>
                Your children currently enrolled and attending this class.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed text-center">
                  <HiOutlineExclamationCircle className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No child enrolled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a student profile below to enroll them in this class.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border bg-background overflow-hidden">
                  {enrolledChildren.map((child) => (
                    <div key={child.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-700 font-semibold text-sm">
                          {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {child.firstName} {child.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize truncate">
                            Grade: {child.gradeLevel?.replace(/_/g, ' ').replace(/-/g, ' ')} · Login: {child.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200 capitalize font-medium text-[10px]">
                        Enrolled
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enroll Student Card */}
          <Card className="shadow-none border-border rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HiOutlineUserPlus className="h-5 w-5 text-tutor-purple-600" /> Enroll Another Child
              </CardTitle>
              <CardDescription>
                Select an existing profile or add a new child profile to enroll.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Capacity guard message */}
              {isOneOnOneFull ? (
                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                  <HiOutlineExclamationCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">One-on-One Class Limit Reached</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This is a 1-on-1 class and already has an enrolled student. You cannot add more students.
                    </p>
                  </div>
                </div>
              ) : isFull ? (
                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                  <HiOutlineExclamationCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Class Enrollment Capacity Reached</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      This class has reached its maximum enrollment capacity of {maxStudents} students.
                    </p>
                  </div>
                </div>
              ) : unenrolledChildren.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    All your children are currently enrolled in this class. To enroll another child, create their profile first.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">Select Child Profile</Label>
                  <RadioGroup value={selectedStudentId} onValueChange={setSelectedStudentId} className="grid grid-cols-1 gap-3">
                    {unenrolledChildren.map((child) => (
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
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider capitalize">
                          {child.gradeLevel?.replace(/_/g, ' ').replace(/-/g, ' ')}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>

                  <Button
                    onClick={handleEnrollStudent}
                    disabled={isEnrolling || !selectedStudentId}
                    className="w-full bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 font-semibold cursor-pointer h-10 text-sm"
                  >
                    {isEnrolling ? 'Enrolling Child...' : 'Confirm Enrollment'}
                  </Button>
                </div>
              )}

              {/* Add Child Toggler */}
              {!(isFull || isOneOnOneFull) && (
                <div className="pt-2 border-t">
                  {!showAddForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="border-dashed border-2 hover:bg-muted/40 text-tutor-purple-600 border-tutor-purple-200 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <HiOutlineUserPlus className="h-4 w-4" /> Add a new child profile
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
                            placeholder="Samuel"
                            className="bg-card border-border"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName" className="text-xs">Last name</Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Okafor"
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
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Class Details */}
        <div className="space-y-6">
          <Card className="shadow-none border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Class Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {classDescription && (
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Description</p>
                  <p className="text-muted-foreground leading-relaxed text-xs">{classDescription}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Duration</p>
                <p className="text-foreground text-xs">
                  {classStartDate} — {classEndDate}
                </p>
              </div>
              <div className="space-y-1.5 border-t pt-3">
                <p className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">Schedule</p>
                <div className="space-y-1 text-xs text-muted-foreground pl-1">
                  {classSchedule.map((s, idx) => (
                    <div key={idx} className="capitalize flex items-center gap-1.5">
                      <HiOutlineClock className="h-3.5 w-3.5 text-tutor-purple-500 shrink-0" />
                      {s.day}s @ {s.startTime} - {s.endTime}
                    </div>
                  ))}
                  {classSchedule.length === 0 && <div>Scheduled as needed</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-border rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Tutor Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-600 font-bold border border-border">
                  {tutorName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{tutorName}</p>
                  <p className="text-xs text-muted-foreground">Assigned Class Tutor</p>
                </div>
              </div>
              {tutorEmail && (
                <div className="border-t pt-3 flex items-center gap-2 text-xs text-muted-foreground pl-1">
                  <HiOutlineEnvelope className="h-4 w-4 text-tutor-purple-500 shrink-0" />
                  <span>{tutorEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
