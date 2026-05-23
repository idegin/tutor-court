'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
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
import { format } from "date-fns";
import {
    HiPlus,
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineEllipsisHorizontal
} from "react-icons/hi2";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';

const DAYS_OF_WEEK = [
    { id: 'sun', label: 'Sun', name: 'sunday' },
    { id: 'mon', label: 'Mon', name: 'monday' },
    { id: 'tue', label: 'Tue', name: 'tuesday' },
    { id: 'wed', label: 'Wed', name: 'wednesday' },
    { id: 'thu', label: 'Thu', name: 'thursday' },
    { id: 'fri', label: 'Fri', name: 'friday' },
    { id: 'sat', label: 'Sat', name: 'saturday' },
];

export function ClassesClient({ initialClasses, subjects }: { initialClasses: any[], subjects: any[] }) {
    const router = useRouter();
    const [classes, setClasses] = useState(initialClasses);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [classType, setClassType] = useState('one-on-one');
    const [maxStudents, setMaxStudents] = useState('1');
    const [inviteeEmail, setInviteeEmail] = useState('');
    const [inviteeType, setInviteeType] = useState('parent');
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();

    const [scheduleState, setScheduleState] = useState<Record<string, { checked: boolean, startTime: string, endTime: string }>>({
        sun: { checked: false, startTime: '09:00', endTime: '10:00' },
        mon: { checked: false, startTime: '09:00', endTime: '10:00' },
        tue: { checked: false, startTime: '09:00', endTime: '10:00' },
        wed: { checked: false, startTime: '09:00', endTime: '10:00' },
        thu: { checked: false, startTime: '09:00', endTime: '10:00' },
        fri: { checked: false, startTime: '09:00', endTime: '10:00' },
        sat: { checked: false, startTime: '09:00', endTime: '10:00' },
    });

    const handleScheduleDayChange = (dayId: string, checked: boolean) => {
        setScheduleState(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], checked }
        }));
    };

    const handleScheduleTimeChange = (dayId: string, type: 'startTime' | 'endTime', value: string) => {
        setScheduleState(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], [type]: value }
        }));
    };

    const resetForm = () => {
        setSubject('');
        setDescription('');
        setClassType('one-on-one');
        setMaxStudents('1');
        setInviteeEmail('');
        setInviteeType('parent');
        setStartDate(undefined);
        setEndDate(undefined);
        setScheduleState({
            sun: { checked: false, startTime: '09:00', endTime: '10:00' },
            mon: { checked: false, startTime: '09:00', endTime: '10:00' },
            tue: { checked: false, startTime: '09:00', endTime: '10:00' },
            wed: { checked: false, startTime: '09:00', endTime: '10:00' },
            thu: { checked: false, startTime: '09:00', endTime: '10:00' },
            fri: { checked: false, startTime: '09:00', endTime: '10:00' },
            sat: { checked: false, startTime: '09:00', endTime: '10:00' },
        });
    };

    const handleCreateClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !startDate || !endDate) {
            toast.error('Please fill in all required fields.');
            return;
        }

        const schedule = Object.entries(scheduleState)
            .filter(([_, v]) => v.checked)
            .map(([k, v]) => {
                const dayObj = DAYS_OF_WEEK.find(d => d.id === k);
                return {
                    day: dayObj?.name || 'monday',
                    startTime: v.startTime,
                    endTime: v.endTime,
                };
            });

        if (schedule.length === 0) {
            toast.error('Please select at least one day for the weekly schedule.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/tutor/classes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    description,
                    classType,
                    maxStudents: classType === 'group' ? Number(maxStudents) : 1,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    schedule,
                    inviteeEmail: inviteeEmail.trim() || undefined,
                    inviteeType: inviteeEmail.trim() ? inviteeType : undefined,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create class.');
            }

            toast.success('Class created successfully!');
            setIsOpen(false);
            resetForm();
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatSchedule = (scheduleArr: any[]) => {
        if (!scheduleArr || scheduleArr.length === 0) return 'No schedule';
        return scheduleArr
            .map(s => `${s.day.slice(0, 3).toUpperCase()} (${s.startTime} - ${s.endTime})`)
            .join(', ');
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Classes</h1>
                    <p className="text-muted-foreground mt-1">Manage your active and upcoming classes, schedules, and students.</p>
                </div>

                <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                        <Button className="shrink-0 bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-medium rounded-lg cursor-pointer">
                            <HiPlus className="mr-2 h-4 w-4" /> Create New Class
                        </Button>
                    </SheetTrigger>
                    <SheetContent className="overflow-y-auto grid grid-cols-1 w-full sm:max-w-[45rem] [&[data-side=right]]:sm:max-w-[45rem]">
                        <SheetHeader>
                            <SheetTitle>Create New Class</SheetTitle>
                            <SheetDescription>
                                Set up a new class session. Add subject, students, type, and define the weekly schedule.
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleCreateClass} className="grid gap-6 py-6 grid-cols-1 px-4">
                            <div className="grid gap-2">
                                <Label htmlFor="subject">Subject</Label>
                                <Select value={subject} onValueChange={setSubject}>
                                    <SelectTrigger id="subject">
                                        <SelectValue placeholder="Select a subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects?.map((sub) => (
                                            <SelectItem key={sub.id} value={sub.id}>
                                                {sub.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief details about the class"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
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
                                <div className="grid gap-2">
                                    <Label>Maximum Students (If Group)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={maxStudents}
                                        onChange={(e) => setMaxStudents(e.target.value)}
                                        disabled={classType === 'one-on-one'}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="grid gap-2 md:col-span-2">
                                    <Label htmlFor="inviteeEmail">Invite Student/Parent by Email (Optional)</Label>
                                    <Input
                                        id="inviteeEmail"
                                        type="email"
                                        value={inviteeEmail}
                                        onChange={(e) => setInviteeEmail(e.target.value)}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Invitee Role</Label>
                                    <Select value={inviteeType} onValueChange={setInviteeType} disabled={!inviteeEmail}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="parent">Parent</SelectItem>
                                            <SelectItem value="student">Student</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2 flex-col">
                                    <Label>Start Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={`w-full rounded-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                                            >
                                                <HiOutlineCalendar className="mr-2 h-4 w-4" />
                                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={startDate}
                                                onSelect={setStartDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="grid gap-2 flex-col grid-cols-1">
                                    <Label>End Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={`w-full rounded-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                                            >
                                                <HiOutlineCalendar className="mr-2 h-4 w-4" />
                                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={endDate}
                                                onSelect={setEndDate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            {/* Weekly Schedule */}
                            <div className="grid gap-3 pt-2 grid-cols-1">
                                <Label className="text-base font-semibold">Weekly Schedule</Label>
                                <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b last:border-0 pb-3 last:pb-0">
                                            <div className="flex items-center gap-2 w-32">
                                                <Checkbox
                                                    id={`day-${day.id}`}
                                                    checked={scheduleState[day.id].checked}
                                                    onCheckedChange={(checked) => handleScheduleDayChange(day.id, !!checked)}
                                                />
                                                <Label htmlFor={`day-${day.id}`} className="font-medium cursor-pointer">{day.label}</Label>
                                            </div>
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    type="time"
                                                    value={scheduleState[day.id].startTime}
                                                    onChange={(e) => handleScheduleTimeChange(day.id, 'startTime', e.target.value)}
                                                    disabled={!scheduleState[day.id].checked}
                                                    className="h-9"
                                                />
                                                <span className="text-muted-foreground text-sm">to</span>
                                                <Input
                                                    type="time"
                                                    value={scheduleState[day.id].endTime}
                                                    onChange={(e) => handleScheduleTimeChange(day.id, 'endTime', e.target.value)}
                                                    disabled={!scheduleState[day.id].checked}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <SheetFooter className="mt-4">
                                <SheetClose asChild>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </SheetClose>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                                >
                                    {isLoading ? 'Creating...' : 'Create Class'}
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
                            classes.map((cls) => (
                                <TableRow key={cls.id} className="cursor-pointer hover:bg-muted/10" onClick={() => router.push(`/dashboard/tutor/classes/${cls.id}`)}>
                                    <TableCell className="font-medium">
                                        {cls.title}
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`capitalize ${cls.classType === 'group' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-tutor-purple-700 border-tutor-purple-200'}`}>
                                            {cls.classType.replace('-', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        {cls.students && cls.students.length > 0 ? (
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
                                                        )
                                                    })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {cls.students[0].firstName} {cls.students.length > 1 ? `+${cls.students.length - 1} more` : ''}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">No students yet</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                                        {cls.parents && cls.parents.length > 0 ? (
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
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size='icon' className="h-8 w-8 p-0 border-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <HiOutlineEllipsisHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/tutor/classes/${cls.id}`)}>
                                                    View details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>Message students</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                                    No classes found. Click &quot;Create New Class&quot; to set one up.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
