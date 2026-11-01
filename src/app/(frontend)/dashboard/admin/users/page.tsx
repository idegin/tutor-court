import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { UsersPageClient } from './users-client';

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
    const { user } = await getServerSideUser();
    if (!user || user.accountType !== 'admin') redirect('/');

    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const tab = (params.tab as string) || 'all';
    const search = params.search?.trim() || '';
    const limit = 20;

    const payload = await getPayload({ config });

    const where: any = { and: [] };

    if (tab !== 'all') {
        where.and.push({ accountType: { equals: tab } });
    }

    if (search) {
        const tokens = search.split(/\s+/).filter(Boolean);
        const orClauses: any[] = [{ email: { like: search } }];
        tokens.forEach(tok => {
            orClauses.push({ firstName: { like: tok } });
            orClauses.push({ lastName: { like: tok } });
        });
        where.and.push({ or: orClauses });
    }

    const { docs, totalDocs, totalPages } = await payload.find({
        collection: 'users',
        where: where.and.length > 0 ? where : undefined,
        sort: '-createdAt',
        limit,
        page,
        depth: 1,
        overrideAccess: true,
    });

    // For tutors, also fetch their slugs
    const tutorProfileMap: Record<string, string> = {};
    const tutorIds = docs.filter((u: any) => u.accountType === 'tutor').map((u: any) => u.id);
    if (tutorIds.length > 0) {
        const { docs: profiles } = await payload.find({
            collection: 'tutor-profiles',
            where: { user: { in: tutorIds } },
            limit: tutorIds.length,
            depth: 0,
            overrideAccess: true,
        });
        for (const p of profiles as any[]) {
            const uid = typeof p.user === 'object' ? p.user?.id : p.user;
            if (uid && p.slug) tutorProfileMap[String(uid)] = p.slug;
        }
    }

    const users = docs.map((u: any) => ({
        id: String(u.id),
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        accountType: u.accountType || 'student',
        isActive: u.isActive !== false,
        avatarUrl: u.avatar?.url || undefined,
        createdAt: u.createdAt,
        slug: tutorProfileMap[String(u.id)] || undefined,
    }));

    return (
        <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
                <p className="text-muted-foreground mt-1">
                    Manage all platform users. {totalDocs} total.
                </p>
            </div>

            <UsersPageClient
                users={users}
                totalDocs={totalDocs}
                currentPage={page}
                totalPages={totalPages}
                currentTab={tab as any}
                currentSearch={search}
            />
        </div>
    );
}
