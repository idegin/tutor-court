'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileSettingsForm } from './profile-settings-form'
import { TutorSettingsForm } from './tutor-settings-form'

interface SettingsContainerProps {
    user: any;
    tutorProfile?: any;
}

export function SettingsContainer({ user, tutorProfile }: SettingsContainerProps) {
    return (
        <div className="w-full">
            <Tabs defaultValue="profile" className="w-full">
                {/* Horizontal scrollable bottom border tabs */}
                <div className="w-full overflow-x-auto border-b border-border pb-0 mb-8 hide-scrollbar">
                    <TabsList className="flex h-auto w-max items-center justify-start gap-6 bg-transparent p-0 mb-[-1px]">
                        <TabsTrigger
                            value="profile"
                            className="rounded-none border-b-2 border-transparent px-2 py-3 font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground hover:text-foreground transition-colors"
                        >
                            Profile
                        </TabsTrigger>
                        {tutorProfile && (
                            <TabsTrigger
                                value="tutor"
                                className="rounded-none border-b-2 border-transparent px-2 py-3 font-semibold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground hover:text-foreground transition-colors"
                            >
                                Tutor
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <TabsContent value="profile" className="outline-none focus:ring-0 mt-0">
                    <ProfileSettingsForm user={user} />
                </TabsContent>

                {tutorProfile && (
                    <TabsContent value="tutor" className="outline-none focus:ring-0 mt-0">
                        <TutorSettingsForm tutorProfile={tutorProfile} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
