import { redirect, notFound } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { TutorAdminTabsClient } from './tutor-admin-tabs-client';
import { addDays, startOfWeek, format } from 'date-fns';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default async function AdminTutorDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { user } = await getServerSideUser();
    if (!user || user.accountType !== 'admin') redirect('/');

    const { id } = await params;
    const payload = await getPayload({ config });

    const profile = await payload.findByID({
        collection: 'tutor-profiles',
        id,
        depth: 2,
        overrideAccess: true,
    }) as any;

    if (!profile) notFound();

    const tutorUser = typeof profile.user === 'object' ? profile.user : null;

    const [classesResult, reviewCount, bookingCount, walletResult] = await Promise.all([
        payload.find({
            collection: 'classes',
            where: { tutor: { equals: tutorUser?.id } },
            limit: 100,
            depth: 1,
            sort: '-createdAt',
            overrideAccess: true,
        }),
        payload.find({ collection: 'reviews', where: { tutor: { equals: profile.id } }, limit: 1, depth: 0, overrideAccess: true }),
        payload.find({ collection: 'bookings', where: { tutor: { equals: tutorUser?.id } }, limit: 1, depth: 0, overrideAccess: true }),
        payload.find({ collection: 'wallets', where: { user: { equals: tutorUser?.id } }, limit: 1, depth: 0, overrideAccess: true }),
    ]);

    const subjects = (profile.subjects || []).map((s: any) => typeof s === 'object' ? s.name : s).filter(Boolean);

    // Build classes list
    const classes = classesResult.docs.map((c: any) => ({
        id: String(c.id),
        title: c.title || '—',
        status: c.status || 'scheduled',
        studentCount: Array.isArray(c.students) ? c.students.length : 0,
        startDate: c.startDate || null,
        classType: c.classType || 'one-on-one',
    }));

    // Build unique student list across all classes
    const studentMap: Record<string, { name: string; email: string; classCount: number }> = {};
    for (const cls of classesResult.docs as any[]) {
        const studentList = Array.isArray(cls.students) ? cls.students : [];
        for (const s of studentList) {
            const sUser = typeof s === 'object' ? s : null;
            if (!sUser) continue;
            const sid = String(sUser.id);
            if (studentMap[sid]) {
                studentMap[sid].classCount++;
            } else {
                studentMap[sid] = {
                    name: `${sUser.firstName || ''} ${sUser.lastName || ''}`.trim() || sUser.email || '—',
                    email: sUser.email || '',
                    classCount: 1,
                };
            }
        }
    }
    const students = Object.entries(studentMap).map(([id, s]) => ({ id, ...s }));

    // Build calendar days (current week)
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const calendarDays = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const dayName = DAY_NAMES[date.getDay()];
        const dayClasses = classesResult.docs
            .filter((c: any) => (c.schedule || []).some((s: any) => s.day === dayName))
            .map((c: any) => {
                const slot = (c.schedule || []).find((s: any) => s.day === dayName);
                return {
                    title: c.title || '—',
                    startTime: slot?.startTime || '',
                    endTime: slot?.endTime || '',
                    status: c.status || 'scheduled',
                    studentCount: Array.isArray(c.students) ? c.students.length : 0,
                };
            })
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

        return {
            dateLabel: format(date, 'EEE d'),
            isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
            classes: dayClasses,
        };
    });

    const wallet = walletResult.docs[0] as any;

    const data = {
        id: String(profile.id),
        slug: profile.slug || '',
        name: tutorUser ? `${tutorUser.firstName || ''} ${tutorUser.lastName || ''}`.trim() : profile.slug,
        email: tutorUser?.email || '',
        phone: tutorUser?.phoneNumber || '',
        country: tutorUser?.country || '',
        avatarUrl: tutorUser?.avatar?.url || '',
        joinedAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        bio: profile.bio || '',
        headline: profile.headline || '',
        subjects,
        mode: profile.mode || '',
        type: (profile.type || []) as string[],
        hourlyRate: profile.hourlyRate || 0,
        yearsOfExperience: profile.yearsOfExperience || 0,
        rating: profile.rating || 0,
        totalReviews: profile.totalReviews || 0,
        gradesTaught: (profile.gradesTaught || []) as string[],
        isApproved: Boolean(profile.isApproved),
        isVerified: Boolean(profile.isVerified),
        onboardingCompleted: Boolean(profile.onboardingCompleted),
        identityVerified: Boolean(profile.identityVerified),
        backgroundCheckStatus: profile.backgroundCheckStatus || 'none',
        backgroundCheckCompletedAt: profile.backgroundCheckCompletedAt || null,
        usagePlan: profile.usagePlan || '',
        minAge: profile.minAge || null,
        maxAge: profile.maxAge || null,
        teachingCertifications: (profile.teachingCertifications || []) as any[],
        payoutBankName: profile.payoutBankName || '',
        payoutAccountName: profile.payoutAccountName || '',
        payoutAccountNumber: profile.payoutAccountNumber || '',
        classCount: classesResult.totalDocs,
        reviewCount: reviewCount.totalDocs,
        bookingCount: bookingCount.totalDocs,
        creditBalance: wallet?.creditBalance || 0,
        studentCount: students.length,
        classes,
        students,
        calendarDays,
    };

    return <TutorAdminTabsClient data={data} />;
}
