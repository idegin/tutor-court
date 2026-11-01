import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { ClassesAdminClient } from './classes-client';

export default async function AdminClassesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const { user } = await getServerSideUser();
    if (!user || user.accountType !== 'admin') redirect('/');

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const statusFilter = params.status || '';
    const limit = 20;

    const payload = await getPayload({ config });

    const where: any = {};
    if (statusFilter) {
        where.status = { equals: statusFilter };
    }

    const { docs, totalDocs, totalPages } = await payload.find({
        collection: 'classes',
        where: Object.keys(where).length > 0 ? where : undefined,
        sort: '-createdAt',
        limit,
        page,
        depth: 2,
        overrideAccess: true,
    });

    const classes = docs.map((c: any) => {
        const tutor = typeof c.tutor === 'object' ? c.tutor : null;
        const subject = typeof c.subject === 'object' ? c.subject : null;
        const studentCount = Array.isArray(c.students) ? c.students.length : 0;

        return {
            id: String(c.id),
            title: c.title || subject?.name || 'Untitled',
            tutorName: tutor ? `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() : '—',
            tutorEmail: tutor?.email || '',
            subject: subject?.name || '—',
            classType: c.classType || '—',
            status: c.status || 'scheduled',
            studentCount,
            startDate: c.startDate || null,
            endDate: c.endDate || null,
            createdAt: c.createdAt,
        };
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Classes</h1>
                <p className="text-muted-foreground mt-1">
                    All classes on the platform. {totalDocs} total.
                </p>
            </div>

            <ClassesAdminClient
                classes={classes}
                totalDocs={totalDocs}
                currentPage={page}
                totalPages={totalPages}
                currentStatus={statusFilter}
            />
        </div>
    );
}
