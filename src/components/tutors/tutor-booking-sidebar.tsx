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
}

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
    hasActiveBooking = false
}: TutorBookingSidebarProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

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
                </div>

                <div>
                    <div className="flex flex-col gap-4">
                        {hasActiveBooking ? (
                            <Link href="/dashboard/bookings" className="block">
                                <Button
                                    className="w-full bg-foreground hover:bg-foreground/90 text-background font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-all text-lg"
                                >
                                    View Active Booking
                                </Button>
                            </Link>
                        ) : (
                            <Button
                                onClick={handleBookClick}
                                className="w-full bg-tutor-red-500 hover:bg-tutor-orange-400 text-white font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-all text-lg"
                            >
                                Book This Tutor
                            </Button>
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
                onSuccess={() => window.location.reload()}
            />
        </>
    );
}
