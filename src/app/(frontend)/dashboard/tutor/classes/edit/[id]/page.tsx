import React from 'react';
import { EditClassHeader } from '@/components/classes/edit-class/edit-class-header';
import { EditClassTabs } from '@/components/classes/edit-class/edit-class-tabs';

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const classId = resolvedParams.id;
    return (
        <div className="flex w-full flex-col min-h-[80vh] p-4 md:p-8 max-w-[1400px] mx-auto ">
            <EditClassHeader title="Untitled Class" />
            <EditClassTabs />
        </div>
    );
}
