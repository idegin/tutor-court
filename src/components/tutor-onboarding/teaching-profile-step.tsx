import React from 'react'
import { HiArrowRight as ArrowRight, HiXMark as X } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

type TeachingProfileStepProps = {
    onNext: () => void
    onBack: () => void
}

export function TeachingProfileStep({ onNext, onBack }: TeachingProfileStepProps) {
    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-emerald-500 uppercase tracking-widest">STEP 2 OF 3</span>
                <span className="text-sm font-semibold text-slate-500">66% Complete</span>
            </div>
            <Progress value={66} className="h-2 mb-6" indicatorClassName="bg-emerald-400" />

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1F26] dark:text-foreground mb-3">
                Build your teaching profile
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                Tell us about your expertise to help students find the right match.
            </p>

            <div className="flex flex-col gap-6">
                
                <div className="space-y-3">
                    <label className="text-sm font-bold">Subjects You Teach</label>
                    <Select>
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select subjects..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="math">Mathematics</SelectItem>
                            <SelectItem value="physics">Physics</SelectItem>
                            <SelectItem value="chemistry">Chemistry</SelectItem>
                            <SelectItem value="computer_science">Computer Science</SelectItem>
                            <SelectItem value="english">English Literature</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                            Mathematics <button className="hover:bg-emerald-200 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                            Computer Science <button className="hover:bg-emerald-200 rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-bold">Years of Experience</label>
                    <Select>
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Less than 1 year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0-1">Less than 1 year</SelectItem>
                            <SelectItem value="1-3">1 - 3 years</SelectItem>
                            <SelectItem value="3-5">3 - 5 years</SelectItem>
                            <SelectItem value="5+">5+ years</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-bold">Short Bio</label>
                    <Textarea 
                        placeholder="Briefly describe your teaching style and academic background..." 
                        className="min-h-[120px] rounded-xl resize-none p-4"
                    />
                    <div className="text-right text-xs text-muted-foreground">0 / 500 characters</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <Button type="button" variant="outline" size="lg" className="h-12 text-[15px] font-bold rounded-xl" onClick={onBack}>
                        Back
                    </Button>
                    <Button type="button" size="lg" className="h-12 text-[15px] font-bold rounded-xl bg-[#4ade80] hover:bg-[#22c55e] text-black shadow-sm" onClick={onNext}>
                        Continue
                    </Button>
                </div>
            </div>
        </div>
    )
}
