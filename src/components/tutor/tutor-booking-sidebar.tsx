'use client';
import React, { useState } from 'react';
import { HiCheckCircle, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export interface TutorBookingSidebarProps {
    pricePerHour: number;
    responseTimeText: string;
}

export function TutorBookingSidebar({ pricePerHour, responseTimeText }: TutorBookingSidebarProps) {
    const [selectedDate, setSelectedDate] = useState<number | null>(14);

    return (
        <div className="bg-card rounded-[2rem] border-[3px] border-foreground p-6 sm:p-8 flex flex-col gap-8 sticky top-24">
            <div>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-black text-foreground">₦{pricePerHour.toLocaleString()}</span>
                    <span className="text-xl font-bold text-muted-foreground">/hr</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <HiCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />
                    <span>{responseTimeText}</span>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-foreground">Availability</h3>
                    <div className="flex gap-2">
                        <button className="p-1 hover:bg-muted rounded-full transition-colors">
                            <HiChevronLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <button className="p-1 hover:bg-muted rounded-full transition-colors">
                            <HiChevronRight className="w-5 h-5 text-foreground" />
                        </button>
                    </div>
                </div>

                {/* Calendar Days Mock */}
                <div className="flex justify-between items-center mb-6">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                        const date = 12 + i;
                        const isSelected = selectedDate === date;
                        const isAvailable = [14, 15].includes(date);
                        const isPast = date < 14;

                        return (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <span className={`text-xs font-bold ${isPast ? 'text-muted-foreground/50' : 'text-foreground'}`}>{day}</span>
                                <button
                                    onClick={() => !isPast && setSelectedDate(date)}
                                    disabled={isPast}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? 'bg-tutor-purple-100 text-tutor-purple-900 border-[2px] border-foreground' :
                                            isAvailable ? 'bg-green-100 text-green-900 hover:bg-green-200' :
                                                isPast ? 'text-muted-foreground/30 cursor-not-allowed' :
                                                    'text-foreground hover:bg-muted'
                                        }`}
                                >
                                    {date}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Time Slots Mock */}
                <div className="flex flex-col gap-3 mb-8">
                    <button className="w-full py-4 px-6 rounded-xl border-[3px] border-foreground text-sm font-bold text-foreground hover:bg-muted transition-colors bg-card">
                        09:00 AM - 10:30 AM
                    </button>
                    <button className="w-full py-4 px-6 rounded-xl border-[3px] border-foreground text-sm font-bold text-foreground hover:bg-muted transition-colors bg-card">
                        02:00 PM - 03:30 PM
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-4">
                    <button className="w-full bg-tutor-red-500 hover:bg-tutor-red-600 text-white font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-colors text-lg">
                        Book Full Session
                    </button>
                    <button className="w-full bg-card hover:bg-muted text-foreground font-black py-4 px-6 rounded-xl border-[3px] border-foreground transition-colors text-lg">
                        Book a Free Consultation
                    </button>
                </div>

                <p className="text-center text-xs font-bold text-muted-foreground mt-4">
                    TutorCourt guarantees your satisfaction or your money back. 100% Secure Checkout.
                </p>
            </div>
        </div>
    );
}
