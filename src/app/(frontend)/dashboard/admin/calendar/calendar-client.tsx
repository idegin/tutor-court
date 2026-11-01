'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineCalendarDays,
    HiOutlineUsers,
} from 'react-icons/hi2';

const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<string, string> = {
    scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    completed: 'border-border bg-muted text-muted-foreground',
    cancelled: 'border-red-200 bg-red-50 text-red-700',
};

const STATUS_DOT: Record<string, string> = {
    scheduled: 'bg-blue-400',
    active: 'bg-emerald-400',
    completed: 'bg-muted-foreground',
    cancelled: 'bg-red-400',
};

type ClassItem = {
    id: string;
    title: string;
    tutorName: string;
    subject: string;
    status: string;
    studentCount: number;
    startTime: string;
    endTime: string;
    classType: string;
};

type DayData = {
    date: string;
    dateLabel: string;
    isToday: boolean;
    classes: ClassItem[];
};

type Props = {
    days: DayData[];
    weekOffset: number;
    weekLabel: string;
    currentStatus: string;
};

export function AdminCalendarClient({ days, weekOffset, weekLabel, currentStatus }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const updateUrl = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, val] of Object.entries(updates)) {
            if (!val) params.delete(key);
            else params.set(key, val);
        }
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    };

    const totalClasses = days.reduce((sum, d) => sum + d.classes.length, 0);

    return (
        <div className="flex flex-col gap-6">
            {/* Navigation + status filter */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="shadow-none h-9"
                        disabled={isPending}
                        onClick={() => updateUrl({ week: String(weekOffset - 1) })}
                    >
                        <HiOutlineChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{weekLabel}</span>
                        {weekOffset !== 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground shadow-none"
                                onClick={() => updateUrl({ week: null })}
                            >
                                Today
                            </Button>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shadow-none h-9"
                        disabled={isPending}
                        onClick={() => updateUrl({ week: String(weekOffset + 1) })}
                    >
                        <HiOutlineChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                    {STATUS_OPTIONS.map(opt => (
                        <Button
                            key={opt.value}
                            variant={currentStatus === opt.value ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-8 text-xs shadow-none"
                            onClick={() => updateUrl({ status: opt.value || null })}
                        >
                            {opt.label}
                        </Button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-muted-foreground">{totalClasses} class{totalClasses !== 1 ? 'es' : ''} this week</p>

            {/* Week grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {days.map(day => (
                    <div key={day.date} className={`rounded-lg border ${day.isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'} flex flex-col min-h-[120px]`}>
                        {/* Day header */}
                        <div className={`px-3 py-2 border-b ${day.isToday ? 'border-primary/20' : 'border-border'} flex items-center justify-between`}>
                            <span className={`text-xs font-bold uppercase tracking-wide ${day.isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                {day.dateLabel}
                            </span>
                            {day.isToday && (
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">TODAY</span>
                            )}
                        </div>

                        {/* Classes */}
                        <div className="flex flex-col gap-1.5 p-2 flex-1">
                            {day.classes.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-xs text-muted-foreground/50">No classes</p>
                                </div>
                            ) : (
                                day.classes.map(cls => (
                                    <div
                                        key={cls.id}
                                        className="rounded-md border border-border bg-muted/30 px-2.5 py-2 group hover:bg-muted/60 transition-colors cursor-default"
                                    >
                                        <div className="flex items-start gap-1.5">
                                            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[cls.status] || 'bg-muted-foreground'}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-semibold text-foreground truncate leading-tight">{cls.title}</p>
                                                {cls.startTime && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{cls.startTime}{cls.endTime ? ` – ${cls.endTime}` : ''}</p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground truncate">{cls.tutorName}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 font-medium shadow-none rounded ${STATUS_STYLES[cls.status] || ''}`}>
                                                        {cls.status}
                                                    </Badge>
                                                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                                        <HiOutlineUsers className="h-2.5 w-2.5" />
                                                        {cls.studentCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {totalClasses === 0 && (
                <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-muted/20 py-16">
                    <HiOutlineCalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No classes scheduled this week</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Try a different week or adjust the status filter.</p>
                </div>
            )}
        </div>
    );
}
