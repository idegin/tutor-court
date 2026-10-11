import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getServerSideUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    HiOutlineUsers,
    HiOutlineClock,
    HiOutlineCheckBadge,
    HiOutlineArrowRight,
    HiOutlineCalendarDays,
} from 'react-icons/hi2';
import { formatDistanceToNow } from 'date-fns';

export default async function AdminOverviewPage() {
    const { user } = await getServerSideUser();

    if (!user || user.accountType !== 'admin') {
        redirect('/');
    }

    const payload = await getPayload({ config });

    const [approvedTutors, pendingTutors, totalStudents, activeClasses, recentTutors] = await Promise.all([
        payload.find({
            collection: 'tutor-profiles',
            where: { isApproved: { equals: true } },
            limit: 1,
            depth: 0,
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
        payload.find({
            collection: 'users',
            where: { accountType: { equals: 'student' } },
            limit: 1,
            depth: 0,
        }),
        payload.find({
            collection: 'classes',
            where: { status: { equals: 'active' } },
            limit: 1,
            depth: 0,
        }),
        payload.find({
            collection: 'tutor-profiles',
            sort: '-createdAt',
            limit: 5,
            depth: 2,
        }),
    ]);

    const pendingCount = pendingTutors.totalDocs;

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Overview</h1>
                <p className="text-muted-foreground mt-1">At-a-glance stats and pending actions.</p>
            </div>

            {pendingCount > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                            <HiOutlineClock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-bold text-amber-900">
                                {pendingCount} tutor application{pendingCount !== 1 ? 's' : ''} awaiting review
                            </p>
                            <p className="text-sm text-amber-700">These tutors have completed onboarding and are waiting for your approval.</p>
                        </div>
                    </div>
                    <Button asChild className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-none rounded">
                        <Link href="/dashboard/admin/tutors?tab=pending">
                            Review Now <HiOutlineArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Approved Tutors</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <HiOutlineCheckBadge className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedTutors.totalDocs}</div>
                        <p className="text-xs text-muted-foreground mt-1">Live on the platform</p>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Applications</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <HiOutlineClock className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <div className="text-2xl font-bold">{pendingCount}</div>
                            {pendingCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs font-bold border-0 px-1.5 py-0.5 h-auto">
                                    Action needed
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <HiOutlineUsers className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalStudents.totalDocs}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registered students</p>
                    </CardContent>
                </Card>

                <Card className="shadow-none border-border">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <HiOutlineCalendarDays className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeClasses.totalDocs}</div>
                        <p className="text-xs text-muted-foreground mt-1">Currently running</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-none border-border">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Tutor Sign-ups</CardTitle>
                            <CardDescription>The last 5 tutors who joined the platform.</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" className="shadow-none" asChild>
                            <Link href="/dashboard/admin/tutors">
                                View All <HiOutlineArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="divide-y divide-border/50">
                        {recentTutors.docs.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No tutors have signed up yet.
                            </div>
                        ) : (
                            recentTutors.docs.map((profile: any) => {
                                const tutorUser = typeof profile.user === 'object' ? profile.user : null;
                                const name = tutorUser
                                    ? `${tutorUser.firstName || ''} ${tutorUser.lastName || ''}`.trim()
                                    : profile.slug || 'Unknown Tutor';
                                const avatarUrl = tutorUser?.avatar?.url;
                                const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                                const timeAgo = formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true });

                                return (
                                    <div key={profile.id} className="flex items-center justify-between py-3 gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Avatar className="h-9 w-9 border border-border shrink-0">
                                                <AvatarImage src={avatarUrl} />
                                                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">{name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{tutorUser?.email || ''}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-medium shadow-none rounded-full ${profile.isApproved
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : profile.onboardingCompleted
                                                        ? 'border-amber-300 bg-amber-50 text-amber-700'
                                                        : 'border-border bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {profile.isApproved ? 'Approved' : profile.onboardingCompleted ? 'Pending' : 'Onboarding'}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground hidden sm:block">{timeAgo}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
