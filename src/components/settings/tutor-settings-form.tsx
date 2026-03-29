'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function TutorSettingsForm({ tutorProfile }: { tutorProfile: any }) {
    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Tutor Profile</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your tutoring preferences, pricing, and details.</p>
            </div>

            <div className="grid gap-6 rounded-2xl border border-border bg-white p-6 md:grid-cols-2 shadow-none">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="headline" className="font-medium text-foreground">Headline</Label>
                    <Input
                        id="headline"
                        defaultValue={tutorProfile.headline || ''}
                        placeholder="e.g. Expert Math & Physics Tutor"
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio" className="font-medium text-foreground">Bio</Label>
                    <Textarea
                        id="bio"
                        defaultValue={tutorProfile.bio || ''}
                        placeholder="Tell students about your teaching experience and style."
                        className="min-h-[140px] rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary p-4 resize-y"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="yearsOfExperience" className="font-medium text-foreground">Years of Experience</Label>
                    <Input
                        id="yearsOfExperience"
                        type="number"
                        defaultValue={tutorProfile.yearsOfExperience || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="hourlyRate" className="font-medium text-foreground">Hourly Rate (₦)</Label>
                    <Input
                        id="hourlyRate"
                        type="number"
                        defaultValue={tutorProfile.hourlyRate || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="minAge" className="font-medium text-foreground">Minimum Student Age</Label>
                    <Input
                        id="minAge"
                        type="number"
                        defaultValue={tutorProfile.minAge || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="maxAge" className="font-medium text-foreground">Maximum Student Age</Label>
                    <Input
                        id="maxAge"
                        type="number"
                        defaultValue={tutorProfile.maxAge || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mode" className="font-medium text-foreground">Teaching Mode</Label>
                    <select
                        id="mode"
                        defaultValue={tutorProfile.mode || ''}
                        className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select Mode</option>
                        <option value="online">Online</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="usagePlan" className="font-medium text-foreground">Usage Plan</Label>
                    <select
                        id="usagePlan"
                        defaultValue={tutorProfile.usagePlan || ''}
                        className="flex h-11 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select Plan</option>
                        <option value="existing">Existing Students</option>
                        <option value="marketplace">Marketplace</option>
                        <option value="both">Both</option>
                    </select>
                </div>

                {/* Note: Subjects and Type (multi-select) should be complex inputs, using text or simple selects for UI skeleton. */}
                <div className="md:col-span-2 pt-4 flex justify-end">
                    <Button
                        variant="default"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg h-11 px-8 shadow-none"
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    )
}
