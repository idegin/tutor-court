import React from 'react'
import { HiArrowRight as ArrowRight, HiUser as User } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'

type AccountBasicsStepProps = {
    onNext: () => void
}

export function AccountBasicsStep({ onNext }: AccountBasicsStepProps) {
    return (
        <div className="flex flex-col max-w-xl w-full mx-auto md:ml-0 md:mr-auto justify-center">
            
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#1A1F26]">Step 1 of 3</span>
                <span className="text-sm font-semibold text-emerald-600">33% Complete</span>
            </div>
            <Progress value={33} className="h-2 mb-6" indicatorClassName="bg-emerald-400" />
            <span className="text-sm text-muted-foreground mb-4">Account Basics</span>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1A1F26] dark:text-foreground mb-3">
                Welcome to TutorCourt
            </h1>
            <p className="text-[1.05rem] text-muted-foreground mb-8">
                Tell us a bit about yourself to get started.
            </p>

            <div className="flex flex-col gap-6">
                <div className="border border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <User className="h-8 w-8 text-slate-400" />
                    </div>
                    <span className="font-bold text-[15px] mb-1">Upload photo</span>
                    <span className="text-xs text-muted-foreground">Recommended: JPG or PNG, max 2MB</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold">First Name</label>
                        <Input placeholder="John" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold">Last Name</label>
                        <Input placeholder="Doe" className="h-12 rounded-xl" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold">Phone Number</label>
                    <Input placeholder="+1 (555) 000-0000" className="h-12 rounded-xl" />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold">Country</label>
                    <Select>
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="uk">United Kingdom</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold">Timezone</label>
                    <Select>
                        <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pst">(GMT-08:00) Pacific Time (US & Canada)</SelectItem>
                            <SelectItem value="est">(GMT-05:00) Eastern Time (US & Canada)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button size="lg" className="w-full h-12 text-[15px] font-bold rounded-xl bg-[#4ade80] hover:bg-[#22c55e] text-black shadow-sm mt-4" onClick={onNext}>
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-2">
                    By continuing, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    )
}
