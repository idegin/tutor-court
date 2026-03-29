'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfileSettingsForm({ user }: { user: any }) {
    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
            </div>

            <div className="grid gap-6 rounded-2xl border border-border bg-white p-6 md:grid-cols-2 shadow-none">
                <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-medium text-foreground">First Name</Label>
                    <Input
                        id="firstName"
                        defaultValue={user.firstName}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-medium text-foreground">Last Name</Label>
                    <Input
                        id="lastName"
                        defaultValue={user.lastName}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email" className="font-medium text-foreground">Email Address</Label>
                    <Input
                        id="email"
                        defaultValue={user.email}
                        disabled
                        className="rounded-lg shadow-none bg-muted/50 h-11 text-muted-foreground cursor-not-allowed"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="font-medium text-foreground">Phone Number</Label>
                    <Input
                        id="phoneNumber"
                        defaultValue={user.phoneNumber || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="country" className="font-medium text-foreground">Country</Label>
                    <Input
                        id="country"
                        defaultValue={user.country || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="timezone" className="font-medium text-foreground">Timezone</Label>
                    <Input
                        id="timezone"
                        defaultValue={user.timezone || ''}
                        className="rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-primary h-11"
                    />
                </div>

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
