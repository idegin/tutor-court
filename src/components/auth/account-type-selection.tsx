import * as React from 'react'
import { HiAcademicCap, HiUser } from 'react-icons/hi2'
import { FiChevronRight } from 'react-icons/fi'

import type { AccountTypeOption } from '@/components/auth/auth-types'
import { cn } from '@/lib/utils'

type AccountTypeSelectionProps = {
    options: AccountTypeOption[]
    selectedTypeId?: string
    error?: string
    onSelect: (id: string) => void
    onLoginClick?: () => void
}

export function AccountTypeSelection({
    options,
    selectedTypeId,
    error,
    onSelect,
    onLoginClick,
}: AccountTypeSelectionProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-4">
                {options.map((option) => {
                    const selected = selectedTypeId === option.id

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onSelect(option.id)}
                            className={cn(
                                'flex items-center w-full gap-5 rounded-2xl border p-5 text-left transition-all duration-200',
                                selected
                                    ? 'border-tutor-purple-600 bg-tutor-purple-50 dark:bg-tutor-purple-900/20 text-foreground ring-1 ring-tutor-purple-500/50 shadow-sm'
                                    : 'border-border/80 bg-background hover:bg-muted/50 hover:border-border'
                            )}
                            aria-pressed={selected}
                        >
                            <div className={cn("flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full",
                                selected ? "bg-tutor-purple-100 dark:bg-tutor-purple-900/50 text-tutor-purple-600 dark:text-tutor-purple-300" : "bg-primary/10 text-primary/80"
                            )}>
                                {option.id === 'tutor' ? <HiAcademicCap className="w-7 h-7" /> : <HiUser className="w-7 h-7" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[1.05rem] font-bold text-foreground tracking-tight">{option.title}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground/90 leading-snug">{option.description}</p>
                            </div>
                            <FiChevronRight className={cn("w-5 h-5 flex-shrink-0 transition-colors", selected ? "text-tutor-purple-600 dark:text-tutor-purple-400" : "text-muted-foreground")} />
                        </button>
                    )
                })}
            </div>

            {error ? <p className="text-sm text-tutor-red-500 text-center font-medium">{error}</p> : null}

            <div className="pt-6 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" className="font-bold text-tutor-purple-600 dark:text-tutor-purple-400 hover:underline ml-1" onClick={onLoginClick}>
                        Log In
                    </button>
                </p>
            </div>
        </div>
    )
}
