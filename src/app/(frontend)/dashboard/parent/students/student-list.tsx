'use client'

import * as React from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUserPlus,
} from 'react-icons/hi2'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  generatedEmail: string
  generatedPassword: string
  gradeLevel: string | null
  createdAt: string
}

export function StudentList({ initialChildren }: { initialChildren: Child[] }) {
  const router = useRouter()
  const [children, setChildren] = React.useState<Child[]>(initialChildren)
  const [revealed, setRevealed] = React.useState<Record<string, boolean>>({})
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  // Form states
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [gradeLevel, setGradeLevel] = React.useState('junior_high_school')
  const [notes, setNotes] = React.useState('')

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy. Please copy manually.')
    }
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last names are required.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/parent/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gradeLevel,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add student.')
      }

      toast.success('Student added successfully!')
      setChildren((prev) => [
        {
          id: data.student.id,
          firstName: data.student.firstName,
          lastName: data.student.lastName,
          generatedEmail: data.student.generatedEmail,
          generatedPassword: data.student.generatedPassword,
          gradeLevel: data.student.gradeLevel,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])

      setIsOpen(false)
      setFirstName('')
      setLastName('')
      setNotes('')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage your children's learning accounts.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-tutor-purple-600 text-white hover:bg-tutor-purple-700 cursor-pointer">
              <HiOutlineUserPlus className="mr-2 h-4 w-4" />
              Add another child
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Student Account</DialogTitle>
              <DialogDescription>
                Create a login account for your child. A generated email and password will be shown upon creation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddChild} className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger>
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

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes / Special Instructions (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details the tutor should know"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                >
                  {isLoading ? 'Creating...' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grid List */}
      {children.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            You haven't added any children yet. Click &quot;Add another child&quot; to set one up.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => {
            const initials = `${child.firstName[0] ?? ''}${child.lastName[0] ?? ''}`.toUpperCase()
            const isRevealed = revealed[child.id]
            return (
              <div key={child.id} className="rounded-2xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-tutor-purple-50 text-tutor-purple-700 font-bold">
                      {initials || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {child.gradeLevel?.replace(/_/g, ' ').replace(/-/g, ' ') || 'No grade set'}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Login email
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                    <span className="truncate font-mono text-xs text-foreground">{child.generatedEmail}</span>
                    <button
                      type="button"
                      onClick={() => copy(child.generatedEmail, 'Email')}
                      className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Copy email"
                    >
                      <HiOutlineDocumentDuplicate className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Password
                  </p>
                  <div className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2">
                    <span className="truncate font-mono text-xs text-foreground">
                      {isRevealed ? child.generatedPassword : '••••••••••'}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [child.id]: !prev[child.id] }))
                        }
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={isRevealed ? 'Hide password' : 'Show password'}
                      >
                        {isRevealed ? (
                          <HiOutlineEyeSlash className="h-4 w-4" />
                        ) : (
                          <HiOutlineEye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copy(child.generatedPassword, 'Password')}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Copy password"
                      >
                        <HiOutlineDocumentDuplicate className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] text-muted-foreground">
                  Added {new Date(child.createdAt).toLocaleDateString()}
                </p>

                <div className="mt-4 pt-3 border-t flex justify-end">
                  <Button asChild variant="ghost" size="sm" className="text-tutor-purple-600 hover:text-tutor-purple-700 hover:bg-tutor-purple-50 text-xs font-semibold px-2.5 py-1 h-auto cursor-pointer">
                    <Link href={`/dashboard/parent/students/${child.id}`}>
                      View Schedule & Attendance →
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
