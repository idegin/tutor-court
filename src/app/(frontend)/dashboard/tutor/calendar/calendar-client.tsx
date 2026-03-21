"use client";

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, EventProps, ToolbarProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

import { faker } from '@faker-js/faker';

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

// Mock Events
const mockEvents = Array.from({ length: 60 }).map((_, i) => {
    // Generate dates around the current month
    const isFuture = faker.datatype.boolean();
    const dateOffset = faker.number.int({ min: -15, max: 15 });
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + dateOffset);

    // Random start hour (8 AM to 6 PM)
    const startHour = faker.number.int({ min: 8, max: 18 });
    const startMinute = faker.helpers.arrayElement([0, 30]);
    const durationHours = faker.helpers.arrayElement([1, 1.5, 2]);

    const start = new Date(baseDate);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const subject = faker.helpers.arrayElement(['Algebra', 'Physics', 'Geometry', 'Chemistry', 'Biology', 'History', 'English Literature', 'Calculus', 'SAT Prep', 'Essay Writing']);

    return {
        id: i + 1,
        title: `${subject} with ${faker.person.firstName()}`,
        start,
        end,
        student: faker.person.fullName(),
        status: faker.helpers.arrayElement(['confirmed', 'pending', 'completed']),
    };
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
                    className="px-4 py-2 text-sm font-medium border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                    Today
                </button>
                <div className="flex items-center ml-2 space-x-1">
                    <button
                        onClick={goToBack}
                        className="p-2 border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center"
                    >
                        <HiOutlineChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-2 border border-border/80 rounded-lg hover:bg-muted transition-colors text-foreground flex items-center justify-center"
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
                        className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${toolbar.view === view
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

export default function CalendarClient() {
    const [view, setView] = useState<any>('week');
    const [date, setDate] = useState<Date>(new Date());

    return (
        <div className="h-full bg-card overflow-hidden flex flex-col">
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
              border-top: 1px dashed var(--border) / 0.5) !important;
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
            
            /* Beautiful "Today" indication without shadow/gradients */
            .rbc-today {
              background-color: var(--primary) / 0.03 !important;
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
              background-color: var(--primary) / 0.05;
            }

            .rbc-off-range-bg {
              background-color: var(--muted) / 0.2) !important;
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
                events={mockEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                date={date}
                onView={(v) => setView(v)}
                onNavigate={(d) => setDate(d)}
                components={{
                    toolbar: CustomToolbar,
                    event: CustomEvent,
                }}
                showMultiDayTimes
                dayLayoutAlgorithm="no-overlap"
            />
        </div>
    );
}
