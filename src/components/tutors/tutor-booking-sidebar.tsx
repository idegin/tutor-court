'use client';
import React, { useState } from 'react';
import { HiCheckCircle, HiChevronLeft, HiChevronRight, HiClock, HiUsers } from 'react-icons/hi2';
import { BookingModal } from './booking-modal';
import { HiCheckBadge } from 'react-icons/hi2';
import { Button } from '../ui/button';

import Link from 'next/link';
import { useAuth } from '../providers/auth-provider';
import { useRouter, usePathname } from 'next/navigation';

export interface TutorBookingSidebarProps {
    tutorId: string;
    tutorName: string;
    headline?: string;
    avatarUrl?: string;
    pricePerHour: number;
    responseTimeText: string;
    studentsCount?: number;
    offeredSubjects?: string[];
    isVerified?: boolean;
    hasActiveBooking?: boolean;
    currentUserRole?: string;
    availability?: { day?: string; startTime?: string; endTime?: string }[];
    gradesTaught?: string[];
    childrenOptions?: { id: string; name: string }[];
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const to12h = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    const period = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:${String(m || 0).padStart(2, '0')} ${period}`;
};
const cap = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const formatGrade = (g: string) =>
    g === 'kindergarten' ? 'Kindergarten' : g === 'others' ? 'Others' : cap(g.replace('grade_', 'Grade '));

export function TutorBookingSidebar({
    tutorId,
    tutorName,
    headline,
    avatarUrl,
    pricePerHour,
    responseTimeText,
    studentsCount = 0,
    offeredSubjects = ['Mathematics', 'Physics', 'Chemistry'],
    isVerified = true,
    hasActiveBooking = false,
    currentUserRole,
    availability = [],
    gradesTaught = [],
    childrenOptions = []
}: TutorBookingSidebarProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const role = user?.accountType ?? currentUserRole;
    // Only students and parents (or logged-out visitors, who are routed to sign
    // up) can book. A tutor/admin viewing a profile shouldn't see a booking CTA.
    const canBook = !user || role === 'student' || role === 'parent';
    const bookingsHref = role === 'parent' ? '/dashboard/parent/bookings' : '/dashboard/student/bookings';

    const sortedAvailability = [...availability]
        .filter((a) => a?.day && a?.startTime && a?.endTime)
        .sort((a, b) => DAY_ORDER.indexOf(a.day!) - DAY_ORDER.indexOf(b.day!));

    const handleBookClick = () => {
        if (!user) {
            localStorage.setItem('post_login_redirect', pathname);
            router.push('/auth/register');
        } else {
            setIsModalOpen(true);
        }
    };

    return (
        <>
            <div className="bg-card rounded-[2rem] border-[3px] border-foreground p-6 sm:p-8 flex flex-col gap-8 sticky top-24">
                <div className="flex items-center gap-4">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={tutorName} className="w-16 h-16 rounded-full border-2 border-foreground object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-foreground bg-tutor-purple-500 flex items-center justify-center font-bold text-xl text-foreground">
                            {tutorName.charAt(0)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                            <h2 className="text-2xl font-black text-foreground truncate">{tutorName}</h2>
                            {isVerified && <HiCheckBadge className="w-6 h-6 text-blue-400 flex-shrink-0" title="Verified Tutor" />}
                        </div>
                        {headline && <p className="text-sm font-bold text-muted-foreground truncate">{headline}</p>}
                    </div>
                </div>

                <div>
                    <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-4xl font-black text-foreground">
                            {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(pricePerHour)}
                        </span>
                        <span className="text-xl font-bold text-muted-foreground">/hr</span>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                            <HiClock className="w-5 h-5 flex-shrink-0" />
                            <span>Response time: {responseTimeText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                            <HiUsers className="w-5 h-5 flex-shrink-0" />
                            <span>{studentsCount} active student{studentsCount !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {offeredSubjects.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Subjects offered</p>
                            <div className="flex flex-wrap gap-2">
                                {offeredSubjects.map((subject) => (
                                    <span
                                        key={subject}
                                        className="px-2.5 py-1 rounded-full border-2 border-border bg-tutor-purple-50 text-xs font-bold text-tutor-purple-800"
                                    >
                                        {subject}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {gradesTaught.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Grade levels</p>
                            <div className="flex flex-wrap gap-2">
                                {gradesTaught.map((g) => (
                                    <span
                                        key={g}
                                        className="px-2.5 py-1 rounded-full border-2 border-border bg-green-50 text-xs font-bold text-green-800"
                                    >
                                        {formatGrade(g)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Weekly availability</p>
                        {sortedAvailability.length > 0 ? (
                            <ul className="flex flex-col gap-1.5">
                                {sortedAvailability.map((slot, i) => (
                                    <li key={i} className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-foreground">{cap(slot.day)}</span>
                                        <span className="font-semibold text-muted-foreground">
                                            {to12h(slot.startTime)} – {to12h(slot.endTime)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm font-semibold text-muted-foreground">
                                Flexible — message the tutor to arrange a time.
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex flex-col gap-4">
                        {hasActiveBooking ? (
                            <Link href={bookingsHref} className="block">
                                <Button
                                    className="w-full bg-foreground hover:bg-foreground/90 text-background font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-all text-lg"
                                >
                                    View Active Booking
                                </Button>
                            </Link>
                        ) : canBook ? (
                            <Button
                                onClick={handleBookClick}
                                className="w-full bg-tutor-red-500 hover:bg-tutor-orange-400 text-white font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-all text-lg"
                            >
                                Book This Tutor
                            </Button>
                        ) : (
                            <p className="text-center text-sm font-semibold text-muted-foreground rounded-xl border-2 border-dashed border-border py-4 px-3">
                                Only students and parents can book a tutor.
                            </p>
                        )}
                    </div>

                    <p className="text-center text-xs font-bold text-muted-foreground mt-4">
                        TutorCourt guarantees your satisfaction or your money back. 100% Secure Checkout.
                    </p>
                </div>
            </div>

            <BookingModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tutorId={tutorId}
                tutorName={tutorName}
                pricePerHour={pricePerHour}
                offeredSubjects={offeredSubjects}
                childrenOptions={childrenOptions}
                onSuccess={() => window.location.reload()}
            />
        </>
    );
}
