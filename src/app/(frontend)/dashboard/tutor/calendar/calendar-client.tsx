"use client";

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, EventProps, ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineClock, HiOutlineUsers, HiOutlineCalendar, HiOutlineDocumentText } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

// Custom Toolbar
const CustomToolbar = (toolbar: ToolbarProps) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    return (
        <div className="flex items-center justify-between py-4 px-2 mb-2 bg-background border-b border-border/50">
            <div className="flex items-center gap-2">
                <button
                    onClick={goToCurrent}
                    className="px-4 py-2 text-sm font-medium border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground cursor-pointer"
                >
                    Today
                </button>
                <div className="flex items-center ml-2 space-x-1">
                    <button
                        onClick={goToBack}
                        className="p-2 border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center cursor-pointer"
                    >
                        <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-2 border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center cursor-pointer"
                    >
                        <HiOutlineChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="text-lg font-bold text-foreground capitalize">
                {toolbar.label}
            </div>
            <div className="flex bg-muted/30 p-1 rounded-lg border border-border/50">
                {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                    <button
                        key={view}
                        onClick={() => toolbar.onView(view)}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors cursor-pointer ${toolbar.view === view
                            ? 'bg-background border border-border/60 text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {view}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Custom Event Component
const CustomEvent = ({ event }: EventProps<any>) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
            case 'pending':
                return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    return (
        <div className={`h-full w-full p-1.5 border rounded-md flex flex-col gap-0.5 overflow-hidden ${getStatusColor(event.status)}`}>
            <span className="text-xs font-bold leading-tight truncate">{event.title}</span>
            <span className="text-[10px] leading-tight opacity-80 truncate">{event.student}</span>
        </div>
    );
};

interface CalendarClientProps {
    initialEvents: any[];
}

export default function CalendarClient({ initialEvents }: CalendarClientProps) {
    const router = useRouter();
    const [view, setView] = useState<any>('week');
    const [date, setDate] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isLoadingClassInfo, setIsLoadingClassInfo] = useState(false);
    const [classInfo, setClassInfo] = useState<any | null>(null);

    // Convert string dates back to Date objects
    const events = initialEvents.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
    }));

    const handleSelectEvent = async (event: any) => {
        setSelectedEvent(event);
        setIsSheetOpen(true);
        setIsLoadingClassInfo(true);
        setClassInfo(null);
        try {
            const res = await fetch(`/api/classes/${event.classId}`);
            if (res.ok) {
                const data = await res.json();
                setClassInfo(data);
            }
        } catch (err) {
            console.error('Failed to fetch class details:', err);
        } finally {
            setIsLoadingClassInfo(false);
        }
    };

    return (
        <div className="h-full bg-card overflow-hidden flex flex-col p-4 md:p-6 lg:p-8">
            <style>
                {`
            .rbc-calendar {
              font-family: inherit;
              border: 1px solid var(--border) !important;
              border-radius: calc(var(--radius) + 2px);
              overflow: hidden;
              background-color: var(--background);
            }
            .rbc-header {
              padding: 12px 0;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 0.75rem;
              color: var(--muted-foreground);
              border-bottom: 1px solid var(--border) !important;
            }
            .rbc-header + .rbc-header {
              border-left: 1px solid var(--border) !important;
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border: none !important;
              border-top: none !important;
            }
            .rbc-day-bg + .rbc-day-bg {
              border-left: 1px solid var(--border) !important;
            }
            .rbc-month-row + .rbc-month-row {
              border-top: 1px solid var(--border) !important;
            }
            .rbc-time-content {
              border-top: 1px solid var(--border) !important;
            }
            .rbc-time-header.rbc-overflowing {
              border-right: 1px solid var(--border) !important;
            }
            .rbc-time-header-content {
              border-left: 1px solid var(--border) !important;
            }
            .rbc-timeslot-group {
              border-bottom: 1px solid var(--border) !important;
            }
            .rbc-day-slot .rbc-time-slot {
              border-top: 1px dashed var(--border) !important;
            }
            .rbc-time-gutter {
              border-right: 1px solid var(--border) !important;
            }
            .rbc-event {
              background-color: transparent !important;
              padding: 0 !important;
              border: none !important;
            }
            .rbc-event-content {
                height: 100%;
            }
            .rbc-event.rbc-selected {
                background-color: transparent !important;
                outline: none !important;
            }
            .rbc-show-more {
              color: var(--primary);
              font-weight: 600;
              font-size: 0.8rem;
              background: transparent;
              z-index: 4;
            }
            
            .rbc-today {
              background-color: hsla(var(--primary), 0.03) !important;
            }
            .rbc-month-view .rbc-today .rbc-date-cell {
              position: relative;
            }
            .rbc-month-view .rbc-today .rbc-button-link {
              background-color: var(--primary);
              color: var(--primary-foreground);
              border-radius: 9999px;
              min-width: 28px;
              height: 28px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              margin-top: 4px;
              margin-right: 4px;
            }
            .rbc-time-header .rbc-today {
              color: var(--primary);
            }
            .rbc-time-header .rbc-today .rbc-header {
              border-bottom: 2px solid var(--primary) !important;
              color: var(--primary);
              font-weight: 800;
              background-color: hsla(var(--primary), 0.05);
            }

            .rbc-off-range-bg {
              background-color: hsla(var(--muted), 0.2) !important;
            }
            .rbc-label {
               padding: 4px;
            }
            .rbc-agenda-view table.rbc-agenda-table {
               border: none !important;
            }
            .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
               border-bottom: 1px solid var(--border) !important;
               text-align: left;
               padding: 12px;
               color: var(--muted-foreground);
               font-size: 0.8rem;
               font-weight: 600;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
               border-top: 1px solid var(--border) !important;
               padding: 12px;
               color: var(--foreground);
               font-size: 0.9rem;
            }
            .rbc-event-label {
               color: var(--foreground) !important;
            }
          `}
            </style>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                date={date}
                onView={(v) => setView(v)}
                onNavigate={(d) => setDate(d)}
                onSelectEvent={handleSelectEvent}
                components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                }}
                showMultiDayTimes
                dayLayoutAlgorithm="no-overlap"
            />

            {/* Event Summary Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="sm:max-w-lg px-4">
                    {selectedEvent && (
                        <div className="space-y-6 pt-4">
                            <SheetHeader>
                                <SheetTitle className="text-xl font-bold">{selectedEvent.title}</SheetTitle>
                                <SheetDescription className="text-sm font-medium text-amber-700">
                                    Subject: {selectedEvent.subject}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <HiOutlineCalendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground">Date</h5>
                                        <p className="text-sm font-medium text-foreground mt-0.5">
                                            {format(selectedEvent.start, 'EEEE, MMMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <HiOutlineClock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground">Time</h5>
                                        <p className="text-sm font-medium text-foreground mt-0.5">
                                            {format(selectedEvent.start, 'h:mm a')} - {format(selectedEvent.end, 'h:mm a')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <HiOutlineUsers className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground">Student(s)</h5>
                                        <p className="text-sm font-medium text-foreground mt-0.5">{selectedEvent.student}</p>
                                    </div>
                                </div>

                                {selectedEvent.description && (
                                    <div className="flex items-start gap-3">
                                        <HiOutlineDocumentText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <h5 className="text-xs font-semibold text-muted-foreground">Description</h5>
                                            <p className="text-sm text-foreground mt-0.5">{selectedEvent.description}</p>
                                        </div>
                                    </div>
                                )}

                                {isLoadingClassInfo && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tutor-purple-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-tutor-purple-500"></span>
                                        </span>
                                        Loading additional class details...
                                    </div>
                                )}

                                {classInfo && (
                                    <div className="space-y-4 border-t pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <h5 className="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">Class Type</h5>
                                                <p className="text-sm font-medium text-foreground mt-0.5 capitalize">
                                                    {classInfo.classType === 'group' ? `Group (Max ${classInfo.maxStudents})` : 'One-on-One'}
                                                </p>
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">Status</h5>
                                                <p className="text-sm font-medium text-foreground mt-0.5 capitalize">
                                                    {classInfo.status}
                                                </p>
                                            </div>
                                        </div>

                                        <div>
                                            <h5 className="text-xs font-semibold text-muted-foreground font-mono uppercase tracking-wider">Recurrences</h5>
                                            <div className="text-sm font-medium text-foreground mt-0.5 space-y-1">
                                                {classInfo.schedule?.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-1.5 capitalize text-xs">
                                                        <span className="w-20 font-semibold">{item.day}:</span>
                                                        <span className="text-muted-foreground">{item.startTime} - {item.endTime}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t flex flex-col gap-2">
                                <Button
                                    onClick={() => {
                                        setIsSheetOpen(false);
                                        router.push(`/classroom/${selectedEvent.classId}`);
                                    }}
                                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold cursor-pointer"
                                >
                                    Join Live Classroom
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsSheetOpen(false);
                                        router.push(`/dashboard/tutor/classes/${selectedEvent.classId}`);
                                    }}
                                    className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-semibold cursor-pointer"
                                >
                                    Open Class Details
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsSheetOpen(false)}
                                    className="w-full cursor-pointer"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
