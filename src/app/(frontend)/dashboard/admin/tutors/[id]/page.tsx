import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HiOutlineChevronLeft, HiOutlineArrowTopRightOnSquare } from 'react-icons/hi2';
import { format } from 'date-fns';
import { TutorAdminDetailClient } from './tutor-admin-detail-client';

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

    const [classCount, reviewCount, bookingCount] = await Promise.all([
        payload.find({ collection: 'classes', where: { tutor: { equals: tutorUser?.id } }, limit: 1, depth: 0, overrideAccess: true }),
        payload.find({ collection: 'reviews', where: { tutor: { equals: profile.id } }, limit: 1, depth: 0, overrideAccess: true }),
        payload.find({ collection: 'bookings', where: { tutor: { equals: tutorUser?.id } }, limit: 1, depth: 0, overrideAccess: true }),
    ]);

    const subjects = (profile.subjects || []).map((s: any) => typeof s === 'object' ? s.name : s).filter(Boolean);

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
        classCount: classCount.totalDocs,
        reviewCount: reviewCount.totalDocs,
        bookingCount: bookingCount.totalDocs,
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Back + header */}
            <div className="flex items-start gap-4">
                <Link
                    href="/dashboard/admin/tutors"
                    className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <HiOutlineChevronLeft className="h-4 w-4" />
                    Tutors
                </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border shrink-0">
                    <AvatarImage src={data.avatarUrl} />
                    <AvatarFallback className="text-lg font-bold bg-muted">
                        {data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
                        {data.isVerified && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold text-xs rounded-full">
                                Verified
                            </Badge>
                        )}
                        {data.isApproved && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs rounded-full">
                                Approved
                            </Badge>
                        )}
                        {!data.isApproved && data.onboardingCompleted && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-xs rounded-full">
                                Pending Review
                            </Badge>
                        )}
                        {!data.onboardingCompleted && (
                            <Badge className="bg-muted text-muted-foreground font-semibold text-xs rounded-full">
                                Onboarding
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{data.email}</p>
                    {data.headline && <p className="text-sm text-muted-foreground">{data.headline}</p>}
                </div>
                <Link
                    href={`/tutors/${data.slug}`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                    <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                    Public profile
                </Link>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Classes', value: data.classCount },
                    { label: 'Bookings', value: data.bookingCount },
                    { label: 'Reviews', value: `${data.totalReviews} (${data.rating.toFixed(1)}★)` },
                ].map(stat => (
                    <div key={stat.label} className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                        <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                        <p className="text-xl font-bold tracking-tight mt-0.5">{stat.value}</p>
                    </div>
                ))}
            </div>

            <TutorAdminDetailClient data={data} />

            {/* Info sections */}
            <div className="grid md:grid-cols-2 gap-6">
                <InfoSection title="Profile">
                    <InfoRow label="Bio" value={data.bio || '—'} multiline />
                    <InfoRow label="Subjects" value={data.subjects.length > 0 ? data.subjects.join(', ') : '—'} />
                    <InfoRow label="Mode" value={data.mode || '—'} />
                    <InfoRow label="Class types" value={data.type.length > 0 ? data.type.join(', ') : '—'} />
                    <InfoRow label="Hourly rate" value={data.hourlyRate ? `₦${data.hourlyRate.toLocaleString()}` : '—'} />
                    <InfoRow label="Experience" value={data.yearsOfExperience ? `${data.yearsOfExperience} yr${data.yearsOfExperience !== 1 ? 's' : ''}` : '—'} />
                    <InfoRow label="Grades taught" value={data.gradesTaught.length > 0 ? data.gradesTaught.join(', ') : '—'} />
                    <InfoRow label="Age range" value={data.minAge || data.maxAge ? `${data.minAge ?? '?'} – ${data.maxAge ?? '?'}` : '—'} />
                    <InfoRow label="Usage plan" value={data.usagePlan || '—'} />
                </InfoSection>

                <InfoSection title="Account">
                    <InfoRow label="Phone" value={data.phone || '—'} />
                    <InfoRow label="Country" value={data.country || '—'} />
                    <InfoRow label="Joined" value={data.joinedAt ? format(new Date(data.joinedAt), 'dd MMM yyyy') : '—'} />
                    <InfoRow label="Last updated" value={data.updatedAt ? format(new Date(data.updatedAt), 'dd MMM yyyy') : '—'} />
                    <InfoRow label="Onboarding" value={data.onboardingCompleted ? 'Complete' : 'In progress'} />
                    <InfoRow label="Identity verified" value={data.identityVerified ? 'Yes' : 'No'} />
                    <InfoRow label="Background check" value={data.backgroundCheckStatus} />
                    {data.backgroundCheckCompletedAt && (
                        <InfoRow label="Background check date" value={format(new Date(data.backgroundCheckCompletedAt), 'dd MMM yyyy')} />
                    )}
                </InfoSection>

                {(data.payoutBankName || data.payoutAccountNumber) && (
                    <InfoSection title="Payout Details">
                        <InfoRow label="Bank" value={data.payoutBankName || '—'} />
                        <InfoRow label="Account name" value={data.payoutAccountName || '—'} />
                        <InfoRow label="Account number" value={data.payoutAccountNumber || '—'} />
                    </InfoSection>
                )}

                {data.teachingCertifications.length > 0 && (
                    <InfoSection title="Teaching Certifications">
                        {data.teachingCertifications.map((cert: any, i: number) => (
                            <div key={i} className="py-1.5 border-b border-border last:border-0">
                                <p className="text-sm font-medium">{cert.name}</p>
                                {cert.issuingBody && <p className="text-xs text-muted-foreground">{cert.issuingBody}</p>}
                                {cert.issueDate && <p className="text-xs text-muted-foreground">{format(new Date(cert.issueDate), 'MMM yyyy')}</p>}
                            </div>
                        ))}
                    </InfoSection>
                )}
            </div>
        </div>
    );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            <div className="divide-y divide-border px-4">{children}</div>
        </div>
    );
}

function InfoRow({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
    return (
        <div className={`py-3 flex ${multiline ? 'flex-col gap-1' : 'justify-between items-start gap-4'}`}>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
            <span className={`text-sm text-foreground ${multiline ? '' : 'text-right'}`}>{value}</span>
        </div>
    );
}
