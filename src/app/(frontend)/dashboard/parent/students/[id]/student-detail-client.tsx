'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineEyeSlash,
} from 'react-icons/hi2'
import { Label } from '@/components/ui/label'

interface StudentDetailClientProps {
  generatedEmail: string
  generatedPassword: string
}

export function StudentDetailClient({
  generatedEmail,
  generatedPassword,
}: StudentDetailClientProps) {
  const [isPasswordRevealed, setIsPasswordRevealed] = React.useState(false)

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error('Could not copy automatically. Please copy manually.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Email field */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Login Email
        </Label>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 border">
          <span className="truncate font-mono text-xs text-foreground select-all">
            {generatedEmail}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(generatedEmail, 'Email')}
            className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
            aria-label="Copy email"
          >
            <HiOutlineDocumentDuplicate className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Password field */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Generated Password
        </Label>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 border">
          <span className="truncate font-mono text-xs text-foreground select-all">
            {isPasswordRevealed ? generatedPassword : '••••••••••••'}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPasswordRevealed((prev) => !prev)}
              className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              aria-label={isPasswordRevealed ? 'Hide password' : 'Show password'}
            >
              {isPasswordRevealed ? (
                <HiOutlineEyeSlash className="h-4 w-4" />
              ) : (
                <HiOutlineEye className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => copyToClipboard(generatedPassword, 'Password')}
              className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              aria-label="Copy password"
            >
              <HiOutlineDocumentDuplicate className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
