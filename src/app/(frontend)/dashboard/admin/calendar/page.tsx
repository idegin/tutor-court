import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { AdminCalendarClient } from './calendar-client';
import { startOfWeek, endOfWeek, addDays, format, parseISO } from 'date-fns';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default async function AdminCalendarPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const { user } = await getServerSideUser();
    if (!user || user.accountType !== 'admin') redirect('/');

    const params = await searchParams;

    // Parse week offset (0 = current week, -1 = last week, etc.)
    const weekOffset = parseInt(params.week || '0', 10);
    const today = new Date();
    const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 }); // Mon
    const weekEnd = endOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });

    const statusFilter = params.status || '';

    const payload = await getPayload({ config });

    // Fetch all classes that overlap this week
    const where: any = {
        and: [
            { startDate: { less_than_equal: weekEnd.toISOString() } },
            { endDate: { greater_than_equal: weekStart.toISOString() } },
        ],
    };
    if (statusFilter) {
        where.and.push({ status: { equals: statusFilter } });
    }

    const { docs } = await payload.find({
        collection: 'classes',
        where,
        limit: 500,
        depth: 2,
        overrideAccess: true,
    });

    // Build 7-column day data
    const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const dayName = DAY_NAMES[date.getDay()];

        const dayClasses = docs
            .filter((cls: any) => {
                // Check if this class has a schedule entry for this weekday
                return (cls.schedule || []).some((s: any) => s.day === dayName);
            })
            .map((cls: any) => {
                const slot = (cls.schedule || []).find((s: any) => s.day === dayName);
                const tutor = typeof cls.tutor === 'object' ? cls.tutor : null;
                const subject = typeof cls.subject === 'object' ? cls.subject : null;
                return {
                    id: String(cls.id),
                    title: cls.title || subject?.name || 'Untitled',
                    tutorName: tutor ? `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() : '—',
                    subject: subject?.name || '—',
                    status: cls.status || 'scheduled',
                    studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
                    startTime: slot?.startTime || '',
                    endTime: slot?.endTime || '',
                    classType: cls.classType || 'one-on-one',
                };
            })
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

        return {
            date: format(date, 'yyyy-MM-dd'),
            dateLabel: format(date, 'EEE d'),
            isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
            classes: dayClasses,
        };
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Calendar</h1>
                <p className="text-muted-foreground mt-1">All scheduled classes across the platform.</p>
            </div>

            <AdminCalendarClient
                days={days}
                weekOffset={weekOffset}
                weekLabel={`${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`}
                currentStatus={statusFilter}
            />
        </div>
    );
}
