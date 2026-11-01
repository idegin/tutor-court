import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { SubjectsClient } from './subjects-client';

export default async function AdminSubjectsPage() {
    const { user } = await getServerSideUser();
    if (!user || user.accountType !== 'admin') redirect('/');

    const payload = await getPayload({ config });

    const [subjectsResult, categoriesResult] = await Promise.all([
        payload.find({
            collection: 'subjects',
            limit: 500,
            sort: 'name',
            depth: 1,
            overrideAccess: true,
        }),
        payload.find({
            collection: 'subject-categories',
            limit: 200,
            sort: 'name',
            depth: 0,
            overrideAccess: true,
        }),
    ]);

    const subjects = subjectsResult.docs.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        slug: s.slug || '',
        category: s.category && typeof s.category === 'object'
            ? { id: String(s.category.id), name: s.category.name }
            : null,
        shortDescription: s.shortDescription || '',
        isPopular: Boolean(s.isPopular),
        icon: s.icon || '',
        color: s.color || '',
    }));

    const categories = categoriesResult.docs.map((c: any) => ({
        id: String(c.id),
        name: c.name,
    }));

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Subjects</h1>
                <p className="text-muted-foreground mt-1">
                    Manage the subjects tutors can teach. Subjects currently in use by tutors or classes cannot be deleted.
                </p>
            </div>

            <SubjectsClient subjects={subjects} categories={categories} />
        </div>
    );
}
