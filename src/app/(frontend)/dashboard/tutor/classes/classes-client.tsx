'use client';

import React, { useState } from 'react';
import { useRouter } from 'next13-progressbar';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
    SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TutorOnboardingGateModal } from '@/components/dashboard/tutor-onboarding-gate-modal';
import {
    HiPlus, HiOutlineCalendar, HiOutlineClock,
    HiOutlineEllipsisHorizontal, HiOutlinePencil,
} from "react-icons/hi2";
import { HiOutlineLightningBolt } from "react-icons/hi";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
    { id: 'sun', label: 'Sun', name: 'sunday' },
    { id: 'mon', label: 'Mon', name: 'monday' },
    { id: 'tue', label: 'Tue', name: 'tuesday' },
    { id: 'wed', label: 'Wed', name: 'wednesday' },
    { id: 'thu', label: 'Thu', name: 'thursday' },
    { id: 'fri', label: 'Fri', name: 'friday' },
    { id: 'sat', label: 'Sat', name: 'saturday' },
];

const DAY_NAME_BY_INDEX: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
};

const DEFAULT_SCHEDULE_STATE = () => Object.fromEntries(
    DAYS_OF_WEEK.map(d => [d.id, { checked: false, startTime: '09:00', endTime: '10:00' }])
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleState = Record<string, { checked: boolean; startTime: string; endTime: string }>;
type ClassMode = 'one-time' | 'recurring';

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeToggle({ mode, onChange }: { mode: ClassMode; onChange: (m: ClassMode) => void }) {
    return (
        <div className="flex rounded-xl bg-muted p-1 gap-1">
            <button
                type="button"
                onClick={() => onChange('one-time')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    mode === 'one-time'
                        ? 'bg-tutor-purple-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                <HiOutlineLightningBolt className="h-4 w-4" />
                One-time / Emergency
            </button>
            <button
                type="button"
                onClick={() => onChange('recurring')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                    mode === 'recurring'
                        ? 'bg-tutor-purple-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                }`}
            >
                <HiOutlineClock className="h-4 w-4" />
                Recurring
            </button>
        </div>
    );
}

function DatePickerButton({ date, onSelect, disabled, placeholder }: {
    date: Date | undefined;
    onSelect: (d: Date | undefined) => void;
    disabled: (d: Date) => boolean;
    placeholder?: string;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal rounded-lg ${!date && 'text-muted-foreground'}`}
                >
                    <HiOutlineCalendar className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{date ? format(date, 'PPP') : (placeholder ?? 'Pick a date')}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={onSelect} disabled={disabled} initialFocus />
            </PopoverContent>
        </Popover>
    );
}

function DayScheduleRow({ day, state, onChange }: {
    day: typeof DAYS_OF_WEEK[0];
    state: ScheduleState[string];
    onChange: (id: string, field: 'checked' | 'startTime' | 'endTime', value: any) => void;
}) {
    return (
        <div className={`rounded-lg border transition-all duration-200 overflow-hidden ${
            state.checked ? 'border-tutor-purple-200 bg-tutor-purple-50/50' : 'border-border bg-background'
        }`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
                <Checkbox
                    id={`day-${day.id}`}
                    checked={state.checked}
                    onCheckedChange={(v) => onChange(day.id, 'checked', !!v)}
                    className="data-[state=checked]:bg-tutor-purple-600 data-[state=checked]:border-tutor-purple-600"
                />
                <Label
                    htmlFor={`day-${day.id}`}
                    className={`font-semibold text-sm w-9 cursor-pointer select-none ${
                        state.checked ? 'text-tutor-purple-700' : 'text-muted-foreground'
                    }`}
                >
                    {day.label}
                </Label>
                <div
                    className={`flex items-center gap-2 flex-1 transition-all duration-200 ${
                        state.checked ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    <Input
                        type="time"
                        value={state.startTime}
                        onChange={(e) => onChange(day.id, 'startTime', e.target.value)}
                        disabled={!state.checked}
                        className="h-8 text-sm flex-1"
                        tabIndex={state.checked ? 0 : -1}
                    />
                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                    <Input
                        type="time"
                        value={state.endTime}
                        onChange={(e) => onChange(day.id, 'endTime', e.target.value)}
                        disabled={!state.checked}
                        className="h-8 text-sm flex-1"
                        tabIndex={state.checked ? 0 : -1}
                    />
                </div>
                {!state.checked && (
                    <span className="text-xs text-muted-foreground ml-auto">Off</span>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClassesClient({
    initialClasses, subjects, onboardingCompleted,
}: {
    initialClasses: any[];
    subjects: any[];
    onboardingCompleted: boolean;
}) {
    const router = useRouter();
    const [classes, setClasses] = useState(initialClasses);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [gateOpen, setGateOpen] = useState(false);

    // ── Form state ────────────────────────────────────────────────────────────
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [mode, setMode] = useState<ClassMode>('recurring');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [classType, setClassType] = useState('one-on-one');
    const [maxStudents, setMaxStudents] = useState('1');

    // Recurring
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const [originalStartDay, setOriginalStartDay] = useState<Date | null>(null);
    const [scheduleState, setScheduleState] = useState<ScheduleState>(DEFAULT_SCHEDULE_STATE());

    // One-time
    const [oneTimeDate, setOneTimeDate] = useState<Date>();
    const [oneTimeStart, setOneTimeStart] = useState('09:00');
    const [oneTimeEnd, setOneTimeEnd] = useState('10:00');

    // Delete state
    const [classToDelete, setClassToDelete] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const startOfToday = React.useMemo(() => {
        const d = new Date(); d.setHours(0, 0, 0, 0); return d;
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────

    const resetForm = () => {
        setEditingClassId(null);
        setMode('recurring');
        setSubject('');
        setDescription('');
        setClassType('one-on-one');
        setMaxStudents('1');
        setStartDate(undefined);
        setEndDate(undefined);
        setOriginalStartDay(null);
        setScheduleState(DEFAULT_SCHEDULE_STATE());
        setOneTimeDate(undefined);
        setOneTimeStart('09:00');
        setOneTimeEnd('10:00');
    };

    const handleScheduleChange = (id: string, field: 'checked' | 'startTime' | 'endTime', value: any) => {
        setScheduleState(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const openEditClass = (cls: any) => {
        setEditingClassId(cls.id);
        setSubject(cls.subject ? (typeof cls.subject === 'object' ? String(cls.subject.id) : String(cls.subject)) : '');
        setDescription(cls.description || '');
        setClassType(cls.classType || 'one-on-one');
        setMaxStudents(String(cls.maxStudents || 1));

        const sd = new Date(cls.startDate);
        const ed = new Date(cls.endDate);
        const sameDay = sd.toISOString().split('T')[0] === ed.toISOString().split('T')[0];

        if (sameDay && cls.schedule?.length === 1) {
            setMode('one-time');
            setOneTimeDate(sd);
            setOneTimeStart(cls.schedule[0].startTime);
            setOneTimeEnd(cls.schedule[0].endTime);
        } else {
            setMode('recurring');
            setStartDate(sd);
            setEndDate(ed);
            const os = new Date(cls.startDate); os.setHours(0, 0, 0, 0);
            setOriginalStartDay(os);
            const newSchedule = DEFAULT_SCHEDULE_STATE();
            if (cls.schedule && Array.isArray(cls.schedule)) {
                const dayIdMap: Record<string, string> = {
                    sunday: 'sun', monday: 'mon', tuesday: 'tue', wednesday: 'wed',
                    thursday: 'thu', friday: 'fri', saturday: 'sat',
                };
                cls.schedule.forEach((s: any) => {
                    const key = dayIdMap[s.day?.toLowerCase()];
                    if (key) newSchedule[key] = { checked: true, startTime: s.startTime, endTime: s.endTime };
                });
            }
            setScheduleState(newSchedule);
        }
        setIsOpen(true);
    };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmitClass = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!subject) { toast.error('Please select a subject.'); return; }

        let startDateStr: string;
        let endDateStr: string;
        let schedule: { day: string; startTime: string; endTime: string }[];

        if (mode === 'one-time') {
            if (!oneTimeDate) { toast.error('Please pick a date for the class.'); return; }
            if (oneTimeStart >= oneTimeEnd) { toast.error('End time must be after start time.'); return; }
            startDateStr = format(oneTimeDate, 'yyyy-MM-dd');
            endDateStr = startDateStr;
            const dayName = DAY_NAME_BY_INDEX[oneTimeDate.getDay()];
            schedule = [{ day: dayName, startTime: oneTimeStart, endTime: oneTimeEnd }];
        } else {
            if (!startDate || !endDate) { toast.error('Please select start and end dates.'); return; }
            if (endDate < startDate) { toast.error('End date cannot be before start date.'); return; }

            startDateStr = format(startDate, 'yyyy-MM-dd');
            endDateStr = format(endDate, 'yyyy-MM-dd');

            const startChanged = !originalStartDay ||
                format(startDate, 'yyyy-MM-dd') !== format(originalStartDay, 'yyyy-MM-dd');
            if (startChanged && startDateStr < format(new Date(), 'yyyy-MM-dd')) {
                toast.error('Start date cannot be in the past.'); return;
            }

            schedule = Object.entries(scheduleState)
                .filter(([, v]) => v.checked)
                .map(([k, v]) => ({
                    day: DAYS_OF_WEEK.find(d => d.id === k)!.name,
                    startTime: v.startTime,
                    endTime: v.endTime,
                }));
            if (schedule.length === 0) {
                toast.error('Please select at least one day for the weekly schedule.'); return;
            }
        }

        setIsLoading(true);
        try {
            const url = editingClassId ? `/api/tutor/classes/${editingClassId}` : '/api/tutor/classes';
            const method = editingClassId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    description,
                    classType,
                    maxStudents: classType === 'group' ? Number(maxStudents) : 1,
                    startDate: startDateStr,
                    endDate: endDateStr,
                    schedule,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Failed to ${editingClassId ? 'update' : 'create'} class.`);

            toast.success(`Class ${editingClassId ? 'updated' : 'created'} successfully!`);
            setIsOpen(false);
            resetForm();
            router.refresh();
            if (!editingClassId && data.classId) router.push(`/dashboard/tutor/classes/${data.classId}`);
        } catch (err: any) {
            toast.error(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClass = async () => {
        if (!classToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/tutor/classes/${classToDelete.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete class.');
            toast.success('Class deleted');
            setClasses(prev => prev.filter(c => c.id !== classToDelete.id));
            setClassToDelete(null);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'An error occurred.');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatSchedule = (scheduleArr: any[]) => {
        if (!scheduleArr?.length) return 'No schedule';
        return scheduleArr.map(s => `${s.day.slice(0, 3).toUpperCase()} (${s.startTime}–${s.endTime})`).join(', ');
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Classes</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your active and upcoming classes, schedules, and students.
                    </p>
                </div>

                <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                    <Button
                        onClick={() => {
                            if (!onboardingCompleted) { setGateOpen(true); return; }
                            resetForm();
                            setIsOpen(true);
                        }}
                        className="shrink-0 bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-medium rounded-lg cursor-pointer"
                    >
                        <HiPlus className="mr-2 h-4 w-4" /> Create New Class
                    </Button>

                    <SheetContent className="overflow-y-auto w-full [&[data-side=right]]:w-full [&[data-side=right]]:max-w-none sm:max-w-[42rem] [&[data-side=right]]:sm:max-w-[42rem]">
                        <SheetHeader className="pb-2">
                            <SheetTitle>{editingClassId ? 'Edit Class' : 'Create New Class'}</SheetTitle>
                            <SheetDescription>
                                {editingClassId
                                    ? 'Update class details, schedule, and metadata.'
                                    : 'Set up a new class. Choose one-time for emergency sessions or recurring for ongoing classes.'}
                            </SheetDescription>
                        </SheetHeader>

                        <form onSubmit={handleSubmitClass} className="flex flex-col gap-5 py-4 px-1">

                            {/* Mode toggle */}
                            {!editingClassId && <ModeToggle mode={mode} onChange={setMode} />}

                            {/* One-time mode hint */}
                            {mode === 'one-time' && !editingClassId && (
                                <div className="flex items-start gap-2 rounded-lg bg-tutor-purple-50 border border-tutor-purple-200 px-3 py-2.5 text-sm text-tutor-purple-800">
                                    <HiOutlineLightningBolt className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>Perfect for emergency or trial sessions — pick a date, set the time, and go.</span>
                                </div>
                            )}

                            {/* Subject */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="subject">Subject <span className="text-destructive">*</span></Label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger id="subject">
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects?.map(sub => (
                                            <SelectItem key={sub.id} value={String(sub.id)}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Description */}
                            <div className="grid gap-1.5">
                                <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Brief details about the class"
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Class type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-1.5">
                                    <Label>Class Type</Label>
                                    <Select value={classType} onValueChange={setClassType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="one-on-one">One on One</SelectItem>
                                            <SelectItem value="group">Group Class</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label>Max Students {classType !== 'group' && <span className="text-muted-foreground text-xs">(group only)</span>}</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={maxStudents}
                                        onChange={e => setMaxStudents(e.target.value)}
                                        disabled={classType === 'one-on-one'}
                                    />
                                </div>
                            </div>

                            {/* ── ONE-TIME fields ── */}
                            {mode === 'one-time' && (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid gap-1.5">
                                        <Label>Class Date <span className="text-destructive">*</span></Label>
                                        <DatePickerButton
                                            date={oneTimeDate}
                                            onSelect={setOneTimeDate}
                                            disabled={d => d < startOfToday}
                                            placeholder="Pick today or a future date"
                                        />
                                    </div>

                                    <div className="rounded-xl border bg-muted/20 p-4 grid gap-3">
                                        <Label className="text-sm font-semibold">Session Time</Label>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 grid gap-1.5">
                                                <Label className="text-xs text-muted-foreground">Start</Label>
                                                <Input
                                                    type="time"
                                                    value={oneTimeStart}
                                                    onChange={e => setOneTimeStart(e.target.value)}
                                                    className="h-10"
                                                />
                                            </div>
                                            <span className="text-muted-foreground text-sm mt-5">→</span>
                                            <div className="flex-1 grid gap-1.5">
                                                <Label className="text-xs text-muted-foreground">End</Label>
                                                <Input
                                                    type="time"
                                                    value={oneTimeEnd}
                                                    onChange={e => setOneTimeEnd(e.target.value)}
                                                    className="h-10"
                                                />
                                            </div>
                                        </div>
                                        {oneTimeDate && (
                                            <p className="text-xs text-muted-foreground">
                                                Session on <strong>{format(oneTimeDate, 'EEEE, MMM d')}</strong> from {oneTimeStart} to {oneTimeEnd}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── RECURRING fields ── */}
                            {mode === 'recurring' && (
                                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Date range */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label>Start Date <span className="text-destructive">*</span></Label>
                                            <DatePickerButton
                                                date={startDate}
                                                onSelect={setStartDate}
                                                disabled={d =>
                                                    d < startOfToday &&
                                                    !(originalStartDay && d.getTime() === originalStartDay.getTime())
                                                }
                                                placeholder="Start date"
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label>End Date <span className="text-destructive">*</span></Label>
                                            <DatePickerButton
                                                date={endDate}
                                                onSelect={setEndDate}
                                                disabled={d =>
                                                    d < startOfToday ||
                                                    (startDate ? d < startDate : false)
                                                }
                                                placeholder="End date"
                                            />
                                        </div>
                                    </div>

                                    {/* Weekly schedule */}
                                    <div className="grid gap-2.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold">Weekly Schedule <span className="text-destructive">*</span></Label>
                                            <span className="text-xs text-muted-foreground">
                                                {Object.values(scheduleState).filter(s => s.checked).length} day
                                                {Object.values(scheduleState).filter(s => s.checked).length !== 1 ? 's' : ''} selected
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            {DAYS_OF_WEEK.map(day => (
                                                <DayScheduleRow
                                                    key={day.id}
                                                    day={day}
                                                    state={scheduleState[day.id]}
                                                    onChange={handleScheduleChange}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Footer */}
                            <SheetFooter className="mt-2 flex gap-2">
                                <SheetClose asChild>
                                    <Button type="button" variant="outline" className="flex-1">Cancel</Button>
                                </SheetClose>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {editingClassId ? 'Saving…' : 'Creating…'}
                                        </span>
                                    ) : (
                                        editingClassId ? 'Save Changes' : 'Create Class'
                                    )}
                                </Button>
                            </SheetFooter>
                        </form>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Subject / Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead className="hidden md:table-cell">Parents</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length > 0 ? (
                            classes.map(cls => (
                                <TableRow
                                    key={cls.id}
                                    className="cursor-pointer hover:bg-muted/10"
                                    onClick={() => router.push(`/dashboard/tutor/classes/${cls.id}`)}
                                >
                                    <TableCell className="font-medium">
                                        {cls.title}
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {typeof cls.subject === 'object' && cls.subject
                                                ? cls.subject.name
                                                : (cls.subject || 'No Subject')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize ${
                                            cls.classType === 'group'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                : 'bg-purple-50 text-tutor-purple-700 border-tutor-purple-200'
                                        }`}>
                                            {cls.classType.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {cls.students?.length > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {cls.students.map((student: any, i: number) => {
                                                        const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
                                                        return (
                                                            <Avatar key={i} className="inline-block border-2 border-background h-8 w-8">
                                                                <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                                                                    {initials || 'S'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                        );
                                                    })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {cls.students[0].firstName}{cls.students.length > 1 ? ` +${cls.students.length - 1} more` : ''}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No students yet</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {cls.parents?.length > 0 ? (
                                            <span className="text-sm">
                                                {cls.parents.map((p: any) => `${p.firstName} ${p.lastName}`).join(', ')}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-sm">
                                            <HiOutlineClock className="mr-1.5 h-4 w-4 text-muted-foreground" />
                                            <span className="max-w-[200px] truncate" title={formatSchedule(cls.schedule)}>
                                                {formatSchedule(cls.schedule)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={cls.status === 'active' ? 'default' : 'secondary'} className="capitalize shadow-none">
                                            {cls.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditClass(cls)}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border border-border/50"
                                                title="Edit Class"
                                            >
                                                <HiOutlinePencil className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 border-0 cursor-pointer">
                                                        <HiOutlineEllipsisHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/tutor/classes/${cls.id}`)}>
                                                        View details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => openEditClass(cls)}>
                                                        Edit details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem variant="destructive" onClick={() => setClassToDelete(cls)}>
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                    No classes found. Click &quot;Create New Class&quot; to set one up.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete confirm */}
            <AlertDialog open={!!classToDelete} onOpenChange={open => { if (!open) setClassToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this class?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {classToDelete && (
                                <>
                                    You&apos;re about to permanently delete{' '}
                                    <span className="font-medium text-foreground">
                                        {classToDelete.title || (typeof classToDelete.subject === 'object' && classToDelete.subject
                                            ? classToDelete.subject.name
                                            : 'this class')}
                                    </span>
                                    . This cannot be undone. Enrolled students and pending invitations will lose access.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={e => { e.preventDefault(); handleDeleteClass(); }}
                            disabled={isDeleting}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting…' : 'Delete Class'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <TutorOnboardingGateModal
                open={gateOpen}
                onClose={() => setGateOpen(false)}
                featureLabel="create a class"
            />
        </div>
    );
}
