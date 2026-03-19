import React, { useState } from 'react'
import { HiArrowLeft as ArrowLeft, HiVideoCamera as Video, HiBuildingOffice2 as Building2, HiSparkles as PartyPopper } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type PreferencesStepProps = {
    onBack: () => void
    onComplete: () => void
}

export function PreferencesStep({ onBack, onComplete }: PreferencesStepProps) {
    const [tutoringMode, setTutoringMode] = useState<'online' | 'hybrid'>('online')
    const [useCase, setUseCase] = useState<string>('listed')

    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            
            <div className="flex items-center justify-between mb-2">
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">FINAL STEP</span>
                    <span className="text-sm font-semibold text-slate-500">Step 3 of 3</span>
                </div>
                <span className="text-sm font-extrabold text-[#1A1F26]">100% Complete</span>
            </div>
            <Progress value={100} className="h-2 mb-8" indicatorClassName="bg-emerald-400" />

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1F26] dark:text-foreground mb-8">
                Preferences & Setup
            </h1>

            <div className="flex flex-col gap-8">
                
                <div className="space-y-4">
                    <label className="text-sm font-bold">Tutoring Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div 
                            className={cn("border-2 rounded-xl p-5 cursor-pointer transition-all", tutoringMode === 'online' ? "border-emerald-400 bg-emerald-50/30" : "border-border hover:border-emerald-200")} 
                            onClick={() => setTutoringMode('online')}
                        >
                            <Video className={cn("w-6 h-6 mb-3", tutoringMode === 'online' ? "text-emerald-500" : "text-slate-400")} />
                            <h3 className="font-bold text-[#1A1F26] mb-1">Online only</h3>
                            <p className="text-xs text-muted-foreground">Sessions via video call</p>
                        </div>
                        <div 
                            className={cn("border-2 rounded-xl p-5 cursor-pointer transition-all", tutoringMode === 'hybrid' ? "border-emerald-400 bg-emerald-50/30" : "border-border hover:border-emerald-200")} 
                            onClick={() => setTutoringMode('hybrid')}
                        >
                            <Building2 className={cn("w-6 h-6 mb-3", tutoringMode === 'hybrid' ? "text-emerald-500" : "text-slate-400")} />
                            <h3 className="font-bold text-[#1A1F26] mb-1">Hybrid</h3>
                            <p className="text-xs text-muted-foreground">Remote & in-person options</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="text-sm font-bold">How do you plan to use TutorCourt?</label>
                    <div className="flex flex-col gap-3">
                        <label className={cn("flex flex-row items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50", useCase === 'existing' ? "border-emerald-200 bg-emerald-50/10" : "")}>
                            <Checkbox checked={useCase === 'existing'} onCheckedChange={() => setUseCase('existing')} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-[#1A1F26]">Use TutorCourt with my existing students</span>
                                <span className="text-xs text-muted-foreground">Manage invoicing and scheduling for current clients</span>
                            </div>
                        </label>

                        <label className={cn("flex flex-row items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50", useCase === 'listed' ? "border-emerald-200 bg-emerald-50/10" : "")}>
                            <Checkbox checked={useCase === 'listed'} onCheckedChange={() => setUseCase('listed')} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-[#1A1F26]">Apply to be listed on TutorCourt marketplace</span>
                                <span className="text-xs text-muted-foreground">Get discovered by new students looking for your expertise</span>
                            </div>
                        </label>

                        <label className={cn("flex flex-row items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-50", useCase === 'both' ? "border-emerald-200 bg-emerald-50/10" : "")}>
                            <Checkbox checked={useCase === 'both'} onCheckedChange={() => setUseCase('both')} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-[#1A1F26]">Both</span>
                                <span className="text-xs text-muted-foreground">The full TutorCourt experience for all your students</span>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex gap-4 mt-4">
                    <Button type="button" variant="outline" size="lg" className="h-12 w-1/3 text-[15px] font-bold rounded-xl" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button type="button" size="lg" className="h-12 flex-1 text-[15px] font-bold rounded-xl bg-[#4ade80] hover:bg-[#22c55e] text-black shadow-sm group" onClick={onComplete}>
                        Complete Setup <PartyPopper className="ml-2 h-4 w-4 group-hover:animate-bounce" />
                    </Button>
                </div>
                
                <p className="text-sm text-center text-muted-foreground mt-4">
                    Need help? <a href="#" className="text-emerald-500 hover:underline">Contact our support team</a>
                </p>
            </div>
        </div>
    )
}
