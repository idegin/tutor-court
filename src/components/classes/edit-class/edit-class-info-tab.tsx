import React from 'react';
import { ClassInfoForm } from './class-info-form';
import { ClassLivePreview } from './class-live-preview';

export function EditClassInfoTab() {
    return (
        <div className="flex flex-col xl:flex-row gap-10 xl:gap-20 items-start w-full mt-8">
            <div className="w-full xl:w-7/12 flex-1">
                <ClassInfoForm />
            </div>
            <div className="w-full xl:w-5/12 xl:max-w-md xl:flex-shrink-0 relative">
                <ClassLivePreview />
            </div>
        </div>
    );
}