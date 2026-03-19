import * as React from 'react'
import { HiAcademicCap, HiUser } from 'react-icons/hi2'
import { FiChevronRight } from 'react-icons/fi'

import type { AccountTypeOption } from '@/components/auth/auth-types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AccountTypeSelectionProps = {
    options: AccountTypeOption[]
    selectedTypeId?: string
    error?: string
    isSubmitting?: boolean
    onSelect: (id: string) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onLoginClick?: () => void
}

export function AccountTypeSelection({
    options,
    selectedTypeId,
    error,
    isSubmitting = false,
    onSelect,
    onSubmit,
    onLoginClick,
}: AccountTypeSelectionProps) {
    return (
        <form className="space-y-6" onSubmit={onSubmit} noValidate>
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
                                    ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/20 shadow-sm'
                                    : 'border-border/80 bg-background hover:bg-muted/50 hover:border-border'
                            )}
                            aria-pressed={selected}
                        >
                            <div className={cn("flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full",
                                selected ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary/80"
                            )}>
                                {option.id === 'tutor' ? <HiAcademicCap className="w-7 h-7" /> : <HiUser className="w-7 h-7" />}
                            </div>
                            <div className="flex-1">
                                <p className="text-[1.05rem] font-bold text-foreground tracking-tight">{option.title}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground/90 leading-snug">{option.description}</p>
                            </div>
                            <FiChevronRight className={cn("w-5 h-5 flex-shrink-0 transition-colors", selected ? "text-primary" : "text-muted-foreground")} />
                        </button>
                    )
                })}
            </div>

            {error ? <p className="text-sm text-destructive text-center font-medium">{error}</p> : null}

            <div className="pt-4 pb-2">
                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-[15px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2" 
                    disabled={!selectedTypeId || isSubmitting}
                >
                    {isSubmitting ? 'Continuing...' : 'Continue'}
                    {!isSubmitting && <FiChevronRight className="h-5 w-5" />}
                </Button>
            </div>
<div className="pt-6 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <button type="button" className="font-bold text-primary hover:underline ml-1" onClick={onLoginClick}>
                        Log In
                    </button>
                </p>
            </div>
            
            {/* Keeping the button accessible for keyboard but visually hidden if we want auto-advance, or just standard solid button */}
            
        </form>
    )
}
