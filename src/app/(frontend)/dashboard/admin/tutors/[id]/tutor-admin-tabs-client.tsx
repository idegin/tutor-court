'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    HiOutlineArrowTopRightOnSquare,
    HiOutlineStar,
    HiOutlineUsers,
    HiOutlineCalendarDays,
    HiOutlineCurrencyDollar,
    HiOutlineBookmarkSquare,
    HiOutlineShieldCheck,
    HiOutlineCog6Tooth,
    HiOutlineChevronLeft,
} from 'react-icons/hi2';
import Link from 'next/link';
import { format } from 'date-fns';
import { TutorAdminDetailClient } from './tutor-admin-detail-client';

type Tab = 'overview' | 'actions' | 'classes' | 'students' | 'calendar';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: HiOutlineBookmarkSquare },
    { id: 'actions', label: 'Admin Actions', icon: HiOutlineCog6Tooth },
    { id: 'classes', label: 'Classes', icon: HiOutlineCalendarDays },
    { id: 'students', label: 'Students', icon: HiOutlineUsers },
    { id: 'calendar', label: 'Calendar', icon: HiOutlineShieldCheck },
];

const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-blue-400',
    active: 'bg-emerald-400',
    completed: 'bg-muted-foreground',
    cancelled: 'bg-red-400',
};

type ClassRow = {
    id: string;
    title: string;
    status: string;
    studentCount: number;
    startDate: string | null;
    classType: string;
};

type StudentRow = {
    id: string;
    name: string;
    email: string;
    classCount: number;
};

type CalendarDay = {
    dateLabel: string;
    isToday: boolean;
    classes: {
        title: string;
        startTime: string;
        endTime: string;
        status: string;
        studentCount: number;
    }[];
};

type TutorDetailData = {
    id: string;
    slug: string;
    name: string;
    email: string;
    phone: string;
    country: string;
    avatarUrl: string;
    joinedAt: string;
    updatedAt: string;
    bio: string;
    headline: string;
    subjects: string[];
    mode: string;
    type: string[];
    hourlyRate: number;
    yearsOfExperience: number;
    rating: number;
    totalReviews: number;
    gradesTaught: string[];
    isApproved: boolean;
    isVerified: boolean;
    onboardingCompleted: boolean;
    identityVerified: boolean;
    backgroundCheckStatus: string;
    backgroundCheckCompletedAt: string | null;
    usagePlan: string;
    minAge: number | null;
    maxAge: number | null;
    teachingCertifications: any[];
    payoutBankName: string;
    payoutAccountName: string;
    payoutAccountNumber: string;
    classCount: number;
    reviewCount: number;
    bookingCount: number;
    creditBalance: number;
    studentCount: number;
    classes: ClassRow[];
    students: StudentRow[];
    calendarDays: CalendarDay[];
};

const STATUS_BADGE_CLASS: Record<string, string> = {
    scheduled: 'border-blue-300 bg-blue-50 text-blue-700',
    active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    completed: 'border-border bg-muted text-muted-foreground',
    cancelled: 'border-red-300 bg-red-50 text-red-700',
};

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

export function TutorAdminTabsClient({ data }: { data: TutorDetailData }) {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <div className="flex flex-col gap-0">
            {/* Back link */}
            <div className="px-4 md:px-6 lg:px-8 pt-4 md:pt-6">
                <Link
                    href="/dashboard/admin/tutors"
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <HiOutlineChevronLeft className="h-4 w-4" />
                    Tutors
                </Link>
            </div>

            {/* Hero section */}
            <div className="relative">
                {/* Cover gradient */}
                <div className="h-28 md:h-36 w-full bg-gradient-to-br from-violet-100 via-blue-50 to-emerald-100" />

                {/* Avatar + name row */}
                <div className="px-4 md:px-6 lg:px-8 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 md:-mt-12">
                        <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-md shrink-0 ring-2 ring-border">
                            <AvatarImage src={data.avatarUrl} />
                            <AvatarFallback className="text-xl font-bold bg-muted">{initials}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0 sm:pb-1">
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                <h1 className="text-xl md:text-2xl font-bold tracking-tight">{data.name}</h1>
                                {data.isVerified && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold text-xs rounded-full">Verified</Badge>
                                )}
                                {data.isApproved && (
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs rounded-full">Approved</Badge>
                                )}
                                {!data.isApproved && data.onboardingCompleted && (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-300 font-semibold text-xs rounded-full">Pending</Badge>
                                )}
                                {!data.onboardingCompleted && (
                                    <Badge className="bg-muted text-muted-foreground font-semibold text-xs rounded-full">Onboarding</Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">{data.email}</p>
                            {data.headline && <p className="text-sm text-muted-foreground">{data.headline}</p>}
                        </div>

                        <Link
                            href={`/tutors/${data.slug}`}
                            target="_blank"
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 self-start sm:self-auto"
                        >
                            <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Public profile</span>
                        </Link>
                    </div>

                    {/* Stats bar — horizontal scroll on mobile */}
                    <div className="flex gap-3 mt-5 overflow-x-auto pb-1 -mx-1 px-1">
                        {[
                            { label: 'Classes', value: data.classCount, icon: HiOutlineCalendarDays },
                            { label: 'Students', value: data.studentCount, icon: HiOutlineUsers },
                            { label: 'Bookings', value: data.bookingCount, icon: HiOutlineBookmarkSquare },
                            { label: 'Reviews', value: `${data.totalReviews} (${data.rating.toFixed(1)}★)`, icon: HiOutlineStar },
                            { label: 'Credits', value: data.creditBalance.toLocaleString(), icon: HiOutlineCurrencyDollar },
                        ].map(stat => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="flex-shrink-0 rounded-lg border border-border bg-card px-4 py-3 min-w-[100px]">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground font-medium whitespace-nowrap">{stat.label}</p>
                                    </div>
                                    <p className="text-lg font-bold tracking-tight">{stat.value}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Tab bar — sticky, horizontal scroll on mobile */}
            <div className="sticky top-0 z-10 bg-background border-b border-border">
                <div className="px-4 md:px-6 lg:px-8 flex items-center gap-0 overflow-x-auto">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content */}
            <div className="px-4 md:px-6 lg:px-8 py-6">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
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
                                <InfoRow label="BG check date" value={format(new Date(data.backgroundCheckCompletedAt), 'dd MMM yyyy')} />
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
                )}

                {/* ADMIN ACTIONS TAB */}
                {activeTab === 'actions' && (
                    <div className="max-w-2xl">
                        <TutorAdminDetailClient data={{
                            id: data.id,
                            name: data.name,
                            email: data.email,
                            isApproved: data.isApproved,
                            isVerified: data.isVerified,
                            onboardingCompleted: data.onboardingCompleted,
                        }} />
                    </div>
                )}

                {/* CLASSES TAB */}
                {activeTab === 'classes' && (
                    <div className="max-w-4xl">
                        {data.classes.length === 0 ? (
                            <div className="rounded-lg border border-border bg-muted/20 py-12 text-center">
                                <p className="text-sm text-muted-foreground">This tutor has no classes yet.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Class</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Students</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Start</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.classes.map(cls => (
                                            <tr key={cls.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-medium">{cls.title}</td>
                                                <td className="px-4 py-3 text-muted-foreground capitalize hidden sm:table-cell">{cls.classType.replace('-', ' ')}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={`text-xs font-medium shadow-none rounded-full ${STATUS_BADGE_CLASS[cls.status] || ''}`}>
                                                        {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{cls.studentCount}</td>
                                                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                                                    {cls.startDate ? format(new Date(cls.startDate), 'dd MMM yyyy') : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* STUDENTS TAB */}
                {activeTab === 'students' && (
                    <div className="max-w-3xl">
                        {data.students.length === 0 ? (
                            <div className="rounded-lg border border-border bg-muted/20 py-12 text-center">
                                <p className="text-sm text-muted-foreground">No enrolled students yet.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Classes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {data.students.map(student => (
                                            <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{student.name}</p>
                                                    <p className="text-xs text-muted-foreground">{student.email}</p>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{student.classCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* CALENDAR TAB */}
                {activeTab === 'calendar' && (
                    <div className="max-w-5xl">
                        <p className="text-xs text-muted-foreground mb-4">This tutor's recurring weekly schedule (all classes).</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {data.calendarDays.map(day => (
                                <div key={day.dateLabel} className={`rounded-lg border ${day.isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'} flex flex-col min-h-[100px]`}>
                                    <div className={`px-2.5 py-2 border-b ${day.isToday ? 'border-primary/20' : 'border-border'}`}>
                                        <span className={`text-xs font-bold uppercase tracking-wide ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {day.dateLabel}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1 p-1.5 flex-1">
                                        {day.classes.length === 0 ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <p className="text-[10px] text-muted-foreground/40">—</p>
                                            </div>
                                        ) : (
                                            day.classes.map((cls, i) => (
                                                <div key={i} className="rounded px-1.5 py-1 bg-muted/40 border border-border">
                                                    <p className="text-[10px] font-semibold truncate leading-tight">{cls.title}</p>
                                                    {cls.startTime && (
                                                        <p className="text-[10px] text-muted-foreground">{cls.startTime}</p>
                                                    )}
                                                    <div className="flex items-center gap-0.5 mt-0.5">
                                                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[cls.status] || 'bg-muted-foreground'}`} />
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                            <HiOutlineUsers className="h-2 w-2" />{cls.studentCount}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
