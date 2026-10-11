import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { TutorsPageClient, type TutorRow } from './tutors-client';

const PAGE_SIZE = 20;

export default async function AdminTutorsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
    const { user } = await getServerSideUser();

    if (!user || user.accountType !== 'admin') {
        redirect('/');
    }

    const { tab, search, page } = await searchParams;
    const currentTab = tab === 'pending' ? 'pending' : 'all';
    const currentSearch = (search || '').trim();
    const currentPage = Math.max(1, parseInt(page || '1', 10));

    const payload = await getPayload({ config });

    const baseWhere: any = currentTab === 'pending'
        ? { and: [{ onboardingCompleted: { equals: true } }, { isApproved: { equals: false } }] }
        : {};

    const searchWhere = currentSearch
        ? { slug: { like: currentSearch } }
        : null;

    const where = searchWhere
        ? currentTab === 'pending'
            ? { and: [baseWhere.and[0], baseWhere.and[1], searchWhere] }
            : searchWhere
        : baseWhere;

    const [tutorProfiles, pendingCount] = await Promise.all([
        payload.find({
            collection: 'tutor-profiles',
            where,
            sort: '-createdAt',
            limit: PAGE_SIZE,
            page: currentPage,
            depth: 2,
        }),
        payload.find({
            collection: 'tutor-profiles',
            where: {
                and: [
                    { onboardingCompleted: { equals: true } },
                    { isApproved: { equals: false } },
                ],
            },
            limit: 1,
            depth: 0,
        }),
    ]);

    const tutors: TutorRow[] = tutorProfiles.docs.map((profile: any) => {
        const tutorUser = typeof profile.user === 'object' ? profile.user : null;
        const subjects = (profile.subjects || []).map((s: any) =>
            typeof s === 'object' ? s.name : s,
        ).filter(Boolean);

        return {
            id: String(profile.id),
            name: tutorUser
                ? `${tutorUser.firstName || ''} ${tutorUser.lastName || ''}`.trim()
                : profile.slug || 'Unknown',
            email: tutorUser?.email || '',
            avatarUrl: tutorUser?.avatar?.url || undefined,
            subjects,
            isApproved: Boolean(profile.isApproved),
            onboardingCompleted: Boolean(profile.onboardingCompleted),
            createdAt: profile.createdAt,
            slug: profile.slug,
        };
    });

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Tutors</h1>
                <p className="text-muted-foreground mt-1">Manage tutor profiles, applications, and approvals.</p>
            </div>

            <TutorsPageClient
                tutors={tutors}
                totalDocs={tutorProfiles.totalDocs}
                currentPage={currentPage}
                totalPages={tutorProfiles.totalPages}
                currentTab={currentTab}
                currentSearch={currentSearch}
                pendingCount={pendingCount.totalDocs}
            />
        </div>
    );
}
