'use client';

import React, { useState } from 'react';
import { EditClassInfoTab } from './edit-class-info-tab';
import { EditClassScheduleTab } from './edit-class-schedule-tab';

export function EditClassTabs() {
    const [activeTab, setActiveTab] = useState('info');

    return (
        <div className="w-full mt-4">
            <div className="border-b border-border w-full flex">
                <button
                    onClick={() => setActiveTab('info')}
                    className={`flex-1 text-center py-4 text-base font-bold transition-all focus:outline-none ${activeTab === 'info'
                        ? 'text-primary border-b-2 border-primary -mb-[1px]'
                        : 'text-muted-foreground hover:text-foreground/80 border-b-2 border-transparent'
                        }`}
                >
                    Info
                </button>
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`flex-1 text-center py-4 text-base font-bold transition-all focus:outline-none ${activeTab === 'schedule'
                        ? 'text-primary border-b-2 border-primary -mb-[1px]'
                        : 'text-muted-foreground hover:text-foreground/80 border-b-2 border-transparent'
                        }`}
                >
                    Schedule
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 text-center py-4 text-base font-bold transition-all focus:outline-none ${activeTab === 'settings'
                        ? 'text-primary border-b-2 border-primary -mb-[1px]'
                        : 'text-muted-foreground hover:text-foreground/80 border-b-2 border-transparent'
                        }`}
                >
                    Settings
                </button>
            </div>

            <div className="mt-8 outline-none">
                {activeTab === 'info' && <EditClassInfoTab />}

                {activeTab === 'schedule' && (
                    <EditClassScheduleTab />
                )}

                {activeTab === 'settings' && (
                    <div className="bg-card rounded-3xl p-12 text-center border-none shadow-sm">
                        <h3 className="text-xl font-bold text-foreground">Class Settings</h3>
                        <p className="text-muted-foreground mt-2 font-medium">Coming soon.</p>
                    </div>
                )}
            </div>
        </div>
    );
}