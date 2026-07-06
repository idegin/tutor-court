'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineUsers,
    HiOutlineVideoCamera,
    HiOutlineDocumentText,
    HiPlus,
    HiOutlineSparkles,
    HiOutlineChevronLeft,
    HiOutlinePencil,
    HiOutlineClipboardDocumentList,
    HiOutlineAcademicCap,
    HiOutlineLink,
    HiOutlineTrash,
} from 'react-icons/hi2';
import { FaWhatsapp } from 'react-icons/fa6';
import { CREDIT_RATE } from '@/lib/constants';

function isCloseToSchedule(cls: any): boolean {
    if (!cls || !cls.schedule || !Array.isArray(cls.schedule) || cls.schedule.length === 0) {
        return false;
    }

    const now = new Date();

    // Check if now is within startDate and endDate
    const start = new Date(cls.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(cls.endDate);
    end.setHours(23, 59, 59, 999);

    if (now < start || now > end) {
        return false;
    }

    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = daysOfWeek[now.getDay()];

    for (const item of cls.schedule) {
        if (item.day.toLowerCase() === currentDay) {
            const [startHour, startMin] = item.startTime.split(':').map(Number);
            const [endHour, endMin] = item.endTime.split(':').map(Number);

            const classStart = new Date(now);
            classStart.setHours(startHour, startMin, 0, 0);

            const classEnd = new Date(now);
            classEnd.setHours(endHour, endMin, 0, 0);

            // Allow 15 minutes window before start
            const windowStart = new Date(classStart.getTime() - 15 * 60 * 1000);

            if (now >= windowStart && now <= classEnd) {
                return true;
            }
        }
    }

    return false;
}

const DAYS_OF_WEEK = [
    { id: 'sun', label: 'Sun', name: 'sunday' },
    { id: 'mon', label: 'Mon', name: 'monday' },
    { id: 'tue', label: 'Tue', name: 'tuesday' },
    { id: 'wed', label: 'Wed', name: 'wednesday' },
    { id: 'thu', label: 'Thu', name: 'thursday' },
    { id: 'fri', label: 'Fri', name: 'friday' },
    { id: 'sat', label: 'Sat', name: 'saturday' },
];

interface ClassDetailsClientProps {
    cls: any;
    initialWhiteboards: any[];
    subjects: any[];
}

export function ClassDetailsClient({ cls, initialWhiteboards, subjects }: ClassDetailsClientProps) {
    const router = useRouter();
    const [whiteboards, setWhiteboards] = useState(initialWhiteboards);
    const [isCreateWhiteboardOpen, setIsCreateWhiteboardOpen] = useState(false);
    const [newWhiteboardTitle, setNewWhiteboardTitle] = useState('');
    const [isCreatingWhiteboard, setIsCreatingWhiteboard] = useState(false);

    const [isStartSessionOpen, setIsStartSessionOpen] = useState(false);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [tutorCredits, setTutorCredits] = useState<number | null>(null);
    const [activeSession, setActiveSession] = useState<any | null>(null);

    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [isResending, setIsResending] = useState<string | null>(null);
    const [isCloseToScheduledTime, setIsCloseToScheduledTime] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [resendConfirmId, setResendConfirmId] = useState<string | null>(null);

    // Assessment assignment states
    const [tutorAssessments, setTutorAssessments] = useState<any[]>([]);
    const [recentAssignments, setRecentAssignments] = useState<any[]>([]);
    const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());
    const [questionsLoading, setQuestionsLoading] = useState(false);
    const [assignAssessmentId, setAssignAssessmentId] = useState('');
    const [assignRecipient, setAssignRecipient] = useState<string>('all');
    const [assignDueDate, setAssignDueDate] = useState('');
    const [assignInstructions, setAssignInstructions] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

    // Edit sheet states
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
    const [isUpdatingClass, setIsUpdatingClass] = useState(false);
    const [subject, setSubject] = useState(cls.subject ? (typeof cls.subject === 'object' ? String(cls.subject.id) : String(cls.subject)) : '');
    const [description, setDescription] = useState(cls.description || '');
    const [classType, setClassType] = useState(cls.classType || 'one-on-one');
    const [maxStudents, setMaxStudents] = useState(String(cls.maxStudents || 1));
    const [startDate, setStartDate] = useState<Date | undefined>(cls.startDate ? new Date(cls.startDate) : undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(cls.endDate ? new Date(cls.endDate) : undefined);

    const [scheduleState, setScheduleState] = useState<Record<string, { checked: boolean, startTime: string, endTime: string }>>(() => {
        const initial = {
            sun: { checked: false, startTime: '09:00', endTime: '10:00' },
            mon: { checked: false, startTime: '09:00', endTime: '10:00' },
            tue: { checked: false, startTime: '09:00', endTime: '10:00' },
            wed: { checked: false, startTime: '09:00', endTime: '10:00' },
            thu: { checked: false, startTime: '09:00', endTime: '10:00' },
            fri: { checked: false, startTime: '09:00', endTime: '10:00' },
            sat: { checked: false, startTime: '09:00', endTime: '10:00' },
        };
        if (cls.schedule && Array.isArray(cls.schedule)) {
            cls.schedule.forEach((s: any) => {
                const dayIdMap: Record<string, string> = {
                    sunday: 'sun',
                    monday: 'mon',
                    tuesday: 'tue',
                    wednesday: 'wed',
                    thursday: 'thu',
                    friday: 'fri',
                    saturday: 'sat'
                };
                const key = dayIdMap[s.day.toLowerCase()];
                if (key) {
                    initial[key as keyof typeof initial] = {
                        checked: true,
                        startTime: s.startTime,
                        endTime: s.endTime
                    };
                }
            });
        }
        return initial;
    });

    // Invitation Dialog states
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteeType, setInviteeType] = useState<'parent' | 'student'>('student');
    const [newInviteEmail, setNewInviteEmail] = useState('');
    const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
    const [inviteLink, setInviteLink] = useState<string | null>(null);

    // Remove student states
    const [removeStudent, setRemoveStudent] = useState<any | null>(null);
    const [isRemovingStudent, setIsRemovingStudent] = useState(false);

    const buildInviteLink = (token: string) =>
        `${typeof window !== 'undefined' ? window.location.origin : ''}/class-invite/${token}`;

    const copyInviteLink = async (link: string, message = 'Invite link copied') => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success(message);
        } catch {
            toast.error('Could not copy link.');
        }
    };

    const shareInviteOnWhatsApp = (link: string) => {
        const text = encodeURIComponent('You are invited to join a class on TutorCourt: ' + link);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleRemoveStudent = async (studentId: string) => {
        setIsRemovingStudent(true);
        try {
            const res = await fetch(`/api/tutor/classes/${cls.id}/students?studentId=${studentId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to remove student.');
            }
            toast.success('Student removed from class');
            setRemoveStudent(null);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Error removing student.');
        } finally {
            setIsRemovingStudent(false);
        }
    };

    // Fetch tutor credits and check active session on mount
    useEffect(() => {
        fetchCredits();
        checkActiveSession();
        fetchPendingInvites();
        fetchTutorAssessments();
        fetchRecentAssignments();

        const checkSchedule = () => {
            setIsCloseToScheduledTime(isCloseToSchedule(cls));
        };
        checkSchedule();
        const interval = setInterval(checkSchedule, 60000);
        return () => clearInterval(interval);
    }, [cls]);

    // Keep form state in sync with updated class props
    useEffect(() => {
        if (cls) {
            setSubject(cls.subject ? (typeof cls.subject === 'object' ? String(cls.subject.id) : String(cls.subject)) : '');
            setDescription(cls.description || '');
            setClassType(cls.classType || 'one-on-one');
            setMaxStudents(String(cls.maxStudents || 1));
            setStartDate(cls.startDate ? new Date(cls.startDate) : undefined);
            setEndDate(cls.endDate ? new Date(cls.endDate) : undefined);

            const newSchedule: Record<string, { checked: boolean; startTime: string; endTime: string }> = {
                sun: { checked: false, startTime: '09:00', endTime: '10:00' },
                mon: { checked: false, startTime: '09:00', endTime: '10:00' },
                tue: { checked: false, startTime: '09:00', endTime: '10:00' },
                wed: { checked: false, startTime: '09:00', endTime: '10:00' },
                thu: { checked: false, startTime: '09:00', endTime: '10:00' },
                fri: { checked: false, startTime: '09:00', endTime: '10:00' },
                sat: { checked: false, startTime: '09:00', endTime: '10:00' },
            };
            if (cls.schedule && Array.isArray(cls.schedule)) {
                cls.schedule.forEach((s: any) => {
                    const dayIdMap: Record<string, string> = {
                        sunday: 'sun',
                        monday: 'mon',
                        tuesday: 'tue',
                        wednesday: 'wed',
                        thursday: 'thu',
                        friday: 'fri',
                        saturday: 'sat'
                    };
                    const key = dayIdMap[s.day.toLowerCase()];
                    if (key) {
                        newSchedule[key] = {
                            checked: true,
                            startTime: s.startTime,
                            endTime: s.endTime
                        };
                    }
                });
            }
            setScheduleState(newSchedule);
        }
    }, [cls]);

    useEffect(() => {
        if (assignAssessmentId) {
            fetchAssessmentQuestions(assignAssessmentId);
        } else {
            setAvailableQuestions([]);
            setSelectedQuestionIds(new Set());
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assignAssessmentId]);

    const fetchPendingInvites = async () => {
        try {
            const res = await fetch(`/api/class-invitations?where[class][equals]=${cls.id}&where[status][equals]=pending`);
            const data = await res.json();
            if (data?.docs) {
                setPendingInvites(data.docs);
            }
        } catch (err) {
            console.error('Error fetching pending invitations:', err);
        }
    };

    const fetchTutorAssessments = async () => {
        try {
            const res = await fetch('/api/assessments?limit=50');
            const data = await res.json();
            if (data?.docs) setTutorAssessments(data.docs);
        } catch (err) {
            console.error('Error fetching assessments:', err);
        }
    };

    const fetchRecentAssignments = async () => {
        try {
            const res = await fetch(`/api/assessments/tutor-assessments?classId=${cls.id}&limit=200`);
            const data = await res.json();
            if (data?.docs) setRecentAssignments(data.docs);
        } catch (err) {
            console.error('Error fetching recent assignments:', err);
        }
    };

    const fetchAssessmentQuestions = async (assessmentId: string) => {
        setQuestionsLoading(true);
        setAvailableQuestions([]);
        setSelectedQuestionIds(new Set());
        try {
            const res = await fetch(`/api/assessments/questions?assessmentId=${assessmentId}&limit=100`);
            const data = await res.json();
            const questions = data?.docs || [];
            setAvailableQuestions(questions);
            setSelectedQuestionIds(new Set(questions.map((q: any) => q.id)));
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setQuestionsLoading(false);
        }
    };

    const handleAssignAssessment = async () => {
        if (!assignAssessmentId) {
            toast.error('Please select an assessment.');
            return;
        }
        if (availableQuestions.length > 0 && selectedQuestionIds.size === 0) {
            toast.error('Please select at least one question.');
            return;
        }
        const students: any[] = assignRecipient === 'all'
            ? (cls.students || [])
            : (cls.students || []).filter((s: any) => (typeof s === 'object' ? s.id : s) === assignRecipient);
        if (students.length === 0) {
            toast.error('No students to assign to. Add students to this class first.');
            return;
        }
        setIsAssigning(true);
        try {
            let count = 0;
            for (const student of students) {
                const studentId = typeof student === 'object' ? student.id : student;
                const res = await fetch('/api/assessments/tutor-assessments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assessmentId: assignAssessmentId,
                        studentId,
                        classId: cls.id,
                        selectedQuestionIds: Array.from(selectedQuestionIds),
                        dueDate: assignDueDate || undefined,
                        instructions: assignInstructions || undefined,
                    }),
                });
                if (res.ok) count++;
            }
            toast.success(`Assessment assigned to ${count} student${count !== 1 ? 's' : ''}!`);
            setIsAssignDialogOpen(false);
            setAssignAssessmentId('');
            setAssignRecipient('all');
            setAssignDueDate('');
            setAssignInstructions('');
            setAvailableQuestions([]);
            setSelectedQuestionIds(new Set());
            fetchRecentAssignments();
        } catch (err: any) {
            toast.error(err.message || 'Failed to assign assessment.');
        } finally {
            setIsAssigning(false);
        }
    };

    const handleResendInvite = async (invitationId: string) => {
        setResendConfirmId(null);
        setIsResending(invitationId);
        try {
            const res = await fetch('/api/tutor/classes/resend-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invitationId }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to resend invitation.');
            }
            toast.success('Invitation resent successfully!');
            fetchPendingInvites();
        } catch (err: any) {
            toast.error(err.message || 'Error resending invitation.');
        } finally {
            setIsResending(null);
        }
    };

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

    const handleUpdateClass = async (e: React.FormEvent) => {
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

        setIsUpdatingClass(true);
        try {
            const res = await fetch(`/api/tutor/classes/${cls.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject,
                    description,
                    classType,
                    maxStudents: classType === 'group' ? Number(maxStudents) : 1,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    schedule,
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update class.');
            }

            toast.success('Class updated successfully!');
            setIsEditSheetOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsUpdatingClass(false);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newInviteEmail.trim()) return;
        setIsSubmittingInvite(true);
        try {
            const res = await fetch('/api/tutor/classes/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    classId: cls.id,
                    email: newInviteEmail.trim(),
                    inviteeType,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send invitation.');
            }
            if (data.added) {
                toast.success('User added directly to the class!');
                setNewInviteEmail('');
                setIsInviteOpen(false);
            } else {
                toast.success('Invitation email sent successfully!');
                // Surface a shareable link as a fallback when email fails.
                const link = data.inviteUrl || (data.invitation?.token ? buildInviteLink(data.invitation.token) : null);
                setInviteLink(link);
                setNewInviteEmail('');
            }
            fetchPendingInvites();
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || 'Error sending invitation.');
        } finally {
            setIsSubmittingInvite(false);
        }
    };

    const handleDeleteInvite = async (invitationId: string) => {
        setDeleteConfirmId(null);
        // Optimistic update — remove from list immediately
        const prev = pendingInvites;
        setPendingInvites(current => current.filter(i => i.id !== invitationId));
        try {
            const res = await fetch(`/api/tutor/classes/invite?id=${invitationId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete invitation.');
            }
            toast.success('Invitation deleted successfully!');
        } catch (err: any) {
            setPendingInvites(prev); // restore on error
            toast.error(err.message || 'Error deleting invitation.');
        }
    };

    const fetchCredits = async () => {
        try {
            const res = await fetch(`/api/wallets?where[user][equals]=${cls.tutor.id || cls.tutor}&limit=1`);
            const data = await res.json();
            if (data?.docs?.[0]) {
                setTutorCredits(data.docs[0].creditBalance || 0);
            }
        } catch (err) {
            console.error('Error fetching credit balance:', err);
        }
    };

    const checkActiveSession = async () => {
        try {
            const res = await fetch(`/api/live-sessions?where[class][equals]=${cls.id}&where[status][equals]=live&limit=1`);
            const data = await res.json();
            if (data?.docs?.length > 0) {
                const session = data.docs[0];
                const startedAt = new Date(session.startedAt || session.createdAt);
                const now = new Date();
                const diffHours = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);

                let pastSchedule = false;
                if (cls.schedule && Array.isArray(cls.schedule) && cls.schedule.length > 0) {
                    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const currentDay = daysOfWeek[now.getDay()];
                    const todaySchedule = cls.schedule.find((item: any) => item.day.toLowerCase() === currentDay);
                    if (todaySchedule) {
                        const [endHour, endMin] = todaySchedule.endTime.split(':').map(Number);
                        const classEnd = new Date(now);
                        classEnd.setHours(endHour, endMin, 0, 0);
                        const graceTime = new Date(classEnd.getTime() + 30 * 60 * 1000); // 30 minutes grace period
                        if (now > graceTime) {
                            pastSchedule = true;
                        }
                    } else {
                        pastSchedule = true;
                    }
                }

                if (diffHours > 2 || pastSchedule) {
                    console.log('Auto-ending stale live session:', session.id);
                    await fetch(`/api/live-sessions/${session.id}/end`, { method: 'POST' });
                    setActiveSession(null);
                } else {
                    setActiveSession(session);
                }
            } else {
                setActiveSession(null);
            }
        } catch (err) {
            console.error('Error checking active live session:', err);
        }
    };

    const handleStartLiveClass = async () => {
        if (tutorCredits === null) {
            toast.error('Checking credit balance, please try again.');
            return;
        }

        if (tutorCredits < CREDIT_RATE.minimumClassCredits) {
            toast.error(`Insufficient credits. You need at least ${CREDIT_RATE.minimumClassCredits} credits (1 hour) to start a live class.`);
            return;
        }

        setIsStartingSession(true);
        try {
            const res = await fetch('/api/live-sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: cls.id }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to start live session.');
            }

            toast.success('Live classroom started successfully!');
            setIsStartSessionOpen(false);
            router.push(`/classroom/${cls.id}?sessionId=${data.session.id}`);
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsStartingSession(false);
        }
    };

    const handleCreateWhiteboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWhiteboardTitle.trim()) {
            toast.error('Please enter a title.');
            return;
        }

        setIsCreatingWhiteboard(true);
        try {
            const res = await fetch('/api/whiteboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newWhiteboardTitle.trim(),
                    classId: cls.id,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create whiteboard.');
            }

            toast.success('Whiteboard created!');
            setWhiteboards(prev => [data.whiteboard, ...prev]);
            setIsCreateWhiteboardOpen(false);
            setNewWhiteboardTitle('');
            // Open the classroom view with this whiteboard pre-selected
            router.push(`/classroom/${cls.id}?whiteboardId=${data.whiteboard.id}`);
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsCreatingWhiteboard(false);
        }
    };

    const formatDays = (scheduleArr: any[]) => {
        if (!scheduleArr || scheduleArr.length === 0) return 'No schedule defined';
        return scheduleArr
            .map(s => `${s.day.charAt(0).toUpperCase() + s.day.slice(1)} (${s.startTime} - ${s.endTime})`)
            .join(', ');
    };

    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Back Button */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/dashboard/tutor/classes')}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm cursor-pointer"
                >
                    <HiOutlineChevronLeft className="h-4 w-4" />
                    Back to Classes
                </Button>
            </div>

            {/* Title / Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{cls.title}</h1>
                    <p className="text-muted-foreground mt-1">Subject: <span className="font-semibold text-foreground">{typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}</span></p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={cls.status === 'active' ? 'default' : 'secondary'} className="capitalize text-sm px-3 py-1 shadow-none">
                        {cls.status}
                    </Badge>
                    <Badge variant="outline" className={`capitalize text-sm px-3 py-1 ${cls.classType === 'group' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-tutor-purple-700 border-tutor-purple-200'}`}>
                        {cls.classType.replace('-', ' ')}
                    </Badge>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditSheetOpen(true)}
                        className="flex items-center gap-1.5 cursor-pointer text-sm h-8 font-semibold"
                    >
                        <HiOutlinePencil className="h-4 w-4" />
                        Edit Class
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Columns (Class Details and Roster) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Class Details Card */}
                    <Card className="border border-border bg-card">
                        <CardHeader>
                            <CardTitle>Class Overview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {cls.description && (
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                                    <p className="text-sm mt-1 text-foreground">{cls.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="flex items-start gap-2.5">
                                    <HiOutlineCalendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground">Class Duration</h5>
                                        <p className="text-sm text-foreground mt-0.5">
                                            {format(new Date(cls.startDate), 'MMM d, yyyy')} to {format(new Date(cls.endDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <HiOutlineClock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                    <div>
                                        <h5 className="text-xs font-semibold text-muted-foreground">Weekly Schedule</h5>
                                        <p className="text-sm text-foreground mt-0.5">
                                            {formatDays(cls.schedule)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Students Roster Card */}
                    <Card className="border border-border bg-card">
                        <CardHeader className="flex flex-row justify-between items-center space-y-0">
                            <div>
                                <CardTitle>Students & Parents</CardTitle>
                                <CardDescription>View enrolled students and parent contacts.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setInviteeType('student');
                                        setIsInviteOpen(true);
                                    }}
                                    className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white rounded-lg cursor-pointer h-8 text-xs font-semibold px-3 flex items-center gap-1"
                                >
                                    <HiPlus className="h-3.5 w-3.5" /> Invite
                                </Button>
                                <HiOutlineUsers className="h-5 w-5 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(!cls.parents || cls.parents.length === 0) && (
                                <div className="p-3 bg-amber-50/50 border border-amber-200/50 rounded-lg flex items-center justify-between text-xs text-amber-800">
                                    <span>No parents are linked to this class yet. Invite a parent to link their child.</span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-50 cursor-pointer px-2 py-1 shrink-0 ml-2"
                                        onClick={() => {
                                            setInviteeType('parent');
                                            setIsInviteOpen(true);
                                        }}
                                    >
                                        Invite Parent
                                    </Button>
                                </div>
                            )}

                            {cls.students && cls.students.length > 0 ? (
                                <div className="divide-y border rounded-lg bg-card/50">
                                    {cls.students.map((student: any) => {
                                        const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
                                        return (
                                            <div key={student.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-10 w-10 border border-border">
                                                        <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-semibold">
                                                            {studentInitials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <h5 className="text-sm font-bold text-foreground">{student.firstName} {student.lastName}</h5>
                                                        <p className="text-xs text-muted-foreground">{student.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                                                    <div className="flex flex-col items-start md:items-end">
                                                        <span className="text-xs font-medium text-muted-foreground">Parent</span>
                                                        <span className="text-xs text-foreground font-semibold mt-0.5">
                                                            {student.parent && typeof student.parent === 'object'
                                                                ? `${(student.parent as any).firstName} ${(student.parent as any).lastName}`
                                                                : cls.parents && cls.parents.length > 0
                                                                    ? cls.parents.map((p: any) => `${p.firstName} ${p.lastName}`).join(', ')
                                                                    : 'None linked'}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        title="Remove student from class"
                                                        aria-label="Remove student from class"
                                                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                                                        onClick={() => setRemoveStudent(student)}
                                                    >
                                                        <HiOutlineTrash className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 border border-dashed rounded-lg text-sm text-muted-foreground">
                                    No students enrolled in this class yet.
                                </div>
                            )}

                            {pendingInvites.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border">
                                    <h5 className="text-xs font-bold text-foreground mb-2 tracking-wide uppercase">Pending Invitations</h5>
                                    <div className="space-y-2">
                                        {pendingInvites.map((inv) => (
                                            <div key={inv.id} className="p-3 bg-secondary/20 rounded-lg flex items-center justify-between gap-4 border text-xs">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold capitalize text-foreground">{inv.inviteeType}:</span>
                                                        <span className="text-muted-foreground">{inv.inviteeEmail}</span>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground">Expires {format(new Date(inv.expiresAt), 'MMM d, yyyy')}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {inv.token && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs text-tutor-purple-600 hover:text-tutor-purple-700 cursor-pointer px-2 gap-1"
                                                            onClick={() => copyInviteLink(buildInviteLink(inv.token), 'Invite link copied')}
                                                        >
                                                            <HiOutlineLink className="h-3.5 w-3.5" /> Copy link
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-tutor-purple-600 hover:text-tutor-purple-700 cursor-pointer px-2"
                                                        disabled={isResending === inv.id}
                                                        onClick={() => setResendConfirmId(inv.id)}
                                                    >
                                                        {isResending === inv.id ? 'Resending...' : 'Resend'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/5 cursor-pointer px-2"
                                                        onClick={() => setDeleteConfirmId(inv.id)}
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Assessments Card */}
                    <Card className="border border-border bg-card">
                        <CardHeader className="flex flex-row justify-between items-center space-y-0">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <HiOutlineClipboardDocumentList className="h-5 w-5" /> Assessments
                                </CardTitle>
                                <CardDescription>
                                    Assigned assessments for students in this class.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsAssignDialogOpen(true)}
                                className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer text-xs font-semibold h-8 px-3 gap-1 flex items-center"
                            >
                                <HiPlus className="h-3.5 w-3.5" /> Assign
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {recentAssignments.length > 0 ? (
                                <div className="divide-y border rounded-lg bg-card/50">
                                    {(() => {
                                        const typeColors: Record<string, string> = {
                                            quiz: 'bg-violet-50 text-violet-700 border-violet-100',
                                            flashcard: 'bg-sky-50 text-sky-700 border-sky-100',
                                            practice_test: 'bg-amber-50 text-amber-700 border-amber-100',
                                            homework: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                                        };

                                        // Group tutor-assessment rows by underlying assessment id
                                        const grouped = new Map<string, {
                                            assessmentId: string;
                                            title: string;
                                            type: string;
                                            assigned: number;
                                            completed: number;
                                            pending: number;
                                            inProgress: number;
                                            expired: number;
                                        }>();

                                        for (const ta of recentAssignments) {
                                            const a = typeof ta.assessment === 'object' ? ta.assessment : null;
                                            if (!a?.id) continue;
                                            const key = String(a.id);
                                            let g = grouped.get(key);
                                            if (!g) {
                                                g = {
                                                    assessmentId: key,
                                                    title: a.title || 'Assessment',
                                                    type: a.type || '',
                                                    assigned: 0,
                                                    completed: 0,
                                                    pending: 0,
                                                    inProgress: 0,
                                                    expired: 0,
                                                };
                                                grouped.set(key, g);
                                            }
                                            g.assigned += 1;
                                            if (ta.status === 'completed') g.completed += 1;
                                            else if (ta.status === 'in_progress') g.inProgress += 1;
                                            else if (ta.status === 'expired') g.expired += 1;
                                            else g.pending += 1;
                                        }

                                        const groups = [...grouped.values()];
                                        if (groups.length === 0) {
                                            return (
                                                <div className="p-6 text-center text-sm text-muted-foreground">
                                                    No assessments assigned yet.
                                                </div>
                                            );
                                        }

                                        return groups.map((g) => (
                                            <div
                                                key={g.assessmentId}
                                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                            >
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/30">
                                                        <HiOutlineClipboardDocumentList className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="text-sm font-bold text-foreground truncate">{g.title}</h5>
                                                            {g.type && (
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 capitalize ${typeColors[g.type] || 'bg-secondary/30 text-muted-foreground border-border'}`}>
                                                                    {g.type.replace('_', ' ')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {g.completed}/{g.assigned} completed
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            {g.pending > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100">
                                                                    {g.pending} pending
                                                                </span>
                                                            )}
                                                            {g.inProgress > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100">
                                                                    {g.inProgress} in progress
                                                                </span>
                                                            )}
                                                            {g.completed > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                                    {g.completed} done
                                                                </span>
                                                            )}
                                                            {g.expired > 0 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-100">
                                                                    {g.expired} expired
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-xs h-7 text-tutor-purple-600 hover:text-tutor-purple-700 cursor-pointer px-2"
                                                        onClick={() => router.push(`/dashboard/tutor/classes/${cls.id}/assessments/${g.assessmentId}`)}
                                                    >
                                                        View performance
                                                    </Button>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-dashed rounded-lg text-sm text-muted-foreground">
                                    <HiOutlineClipboardDocumentList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    No assessments assigned yet. Click &quot;Assign&quot; to get started.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Delete Invitation Confirmation */}
                <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this invitation? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                // className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={() => deleteConfirmId && handleDeleteInvite(deleteConfirmId)}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Resend Invitation Confirmation */}
                <AlertDialog open={!!resendConfirmId} onOpenChange={(open) => !open && setResendConfirmId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Resend Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                                Resend the invitation email to this person? They will receive a new invitation link.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => resendConfirmId && handleResendInvite(resendConfirmId)}
                            >
                                Resend
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Remove Student Confirmation */}
                <AlertDialog open={!!removeStudent} onOpenChange={(open) => !open && setRemoveStudent(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Student</AlertDialogTitle>
                            <AlertDialogDescription>
                                Remove {removeStudent ? `${removeStudent.firstName} ${removeStudent.lastName}` : 'this student'} from this class? They will lose access to sessions and assessments for this class.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isRemovingStudent}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (removeStudent) handleRemoveStudent(removeStudent.id);
                                }}
                                disabled={isRemovingStudent}
                            >
                                {isRemovingStudent ? 'Removing...' : 'Remove'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Right Columns (Live Class Actions & Whiteboard management) */}
                <div className="space-y-6">
                    {/* Live Class Session Manager */}
                    <Card className="border-2 border-tutor-purple-100 bg-tutor-purple-50/20">
                        <CardHeader>
                            <CardTitle className="text-tutor-purple-900 flex items-center gap-2">
                                <HiOutlineVideoCamera className="h-5 w-5" /> Live Classroom
                            </CardTitle>
                            <CardDescription>
                                Start or join live class.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {activeSession ? (
                                <div className="space-y-3">
                                    <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-xs flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="font-semibold">A live session is currently active for this class.</span>
                                    </div>
                                    <Button
                                        onClick={() => router.push(`/classroom/${cls.id}?sessionId=${activeSession.id}`)}
                                        className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-semibold cursor-pointer"
                                    >
                                        Join Active Classroom
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Dialog open={isStartSessionOpen} onOpenChange={setIsStartSessionOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                onClick={fetchCredits}
                                                className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-semibold cursor-pointer"
                                            >
                                                Start Live Classroom
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-1.5 text-amber-800">
                                                    <HiOutlineSparkles className="h-5 w-5" />
                                                    Start Live Classroom Session
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Starting a live session costs <strong>1 credit per minute per student/parent</strong> on the call. A minimum of {CREDIT_RATE.minimumClassCredits} credits (1 hour for 1 student) is required to start.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="py-4 border-t border-b border-muted my-2">
                                                <div className="flex justify-between items-center text-sm mb-2">
                                                    <span className="font-medium text-muted-foreground">Required Credits:</span>
                                                    <span className="font-bold text-foreground">{CREDIT_RATE.minimumClassCredits} Credits</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground">Your Balance:</span>
                                                    <span className={`font-bold ${tutorCredits !== null && tutorCredits < CREDIT_RATE.minimumClassCredits ? 'text-red-600' : 'text-green-600'}`}>
                                                        {tutorCredits !== null ? `${tutorCredits} Credits` : 'Loading...'}
                                                    </span>
                                                </div>
                                            </div>

                                            <DialogFooter className="mt-4 gap-2 sm:gap-0">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsStartSessionOpen(false)}
                                                    type="button"
                                                >
                                                    Cancel
                                                </Button>
                                                {tutorCredits !== null && tutorCredits < CREDIT_RATE.minimumClassCredits ? (
                                                    <Button
                                                        onClick={() => {
                                                            setIsStartSessionOpen(false);
                                                            router.push('/dashboard/tutor/wallet');
                                                        }}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                                    >
                                                        Purchase Credits
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={handleStartLiveClass}
                                                        disabled={isStartingSession || tutorCredits === null}
                                                        className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                                                    >
                                                        {isStartingSession ? 'Starting...' : 'Start Session'}
                                                    </Button>
                                                )}
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Starting a class deducts credits from your wallet based on call duration.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Whiteboard Manager Card */}
                    <Card className="border border-border bg-card">
                        <CardHeader className="flex flex-row justify-between items-center space-y-0">
                            <div>
                                <CardTitle>Class Whiteboards</CardTitle>
                                <CardDescription>Draw, explain and share slides.</CardDescription>
                            </div>
                            <Dialog open={isCreateWhiteboardOpen} onOpenChange={setIsCreateWhiteboardOpen}>
                                <DialogTrigger asChild>
                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border border-border cursor-pointer">
                                        <HiPlus className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Create Whiteboard</DialogTitle>
                                        <DialogDescription>
                                            Create a persistent whiteboard for explanation slides in this class.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleCreateWhiteboard} className="space-y-4 py-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="wb-title">Whiteboard Title</Label>
                                            <Input
                                                id="wb-title"
                                                value={newWhiteboardTitle}
                                                onChange={(e) => setNewWhiteboardTitle(e.target.value)}
                                                placeholder="e.g. Calculus Basics"
                                                required
                                            />
                                        </div>
                                        <DialogFooter className="pt-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsCreateWhiteboardOpen(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isCreatingWhiteboard}
                                                className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                                            >
                                                {isCreatingWhiteboard ? 'Creating...' : 'Create'}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            {whiteboards.length > 0 ? (
                                <div className="space-y-2">
                                    {whiteboards.map((wb) => (
                                        <div
                                            key={wb.id}
                                            onClick={() => router.push(`/whiteboard/${wb.id}`)}
                                            className="p-3 border rounded-lg hover:bg-muted/10 cursor-pointer flex items-center justify-between transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <HiOutlineDocumentText className="h-5 w-5 text-muted-foreground" />
                                                <div>
                                                    <span className="text-sm font-semibold text-foreground block">{wb.title}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Updated {format(new Date(wb.updatedAt), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border border-dashed rounded-lg text-xs text-muted-foreground">
                                    No whiteboards created. Explain and draw by creating one above.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Assign Assessment Dialog */}
            <Dialog
                open={isAssignDialogOpen}
                onOpenChange={(open) => {
                    setIsAssignDialogOpen(open);
                    if (!open) {
                        setAssignAssessmentId('');
                        setAssignRecipient('all');
                        setAssignDueDate('');
                        setAssignInstructions('');
                        setAvailableQuestions([]);
                        setSelectedQuestionIds(new Set());
                    }
                }}
            >
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Assign Assessment</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Choose an assessment and select the specific questions to include.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Assessment select */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Assessment <span className="text-destructive">*</span></Label>
                            <Select value={assignAssessmentId} onValueChange={setAssignAssessmentId}>
                                <SelectTrigger className="border-input text-foreground">
                                    <SelectValue placeholder="Select an assessment" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    {tutorAssessments.length === 0 ? (
                                        <div className="px-3 py-3 text-xs text-muted-foreground">No assessments created yet.</div>
                                    ) : tutorAssessments.map((a: any) => (
                                        <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Question selection */}
                        {assignAssessmentId && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-foreground">Questions</Label>
                                    {availableQuestions.length > 0 && (
                                        <button
                                            type="button"
                                            className="text-xs text-tutor-purple-600 hover:underline cursor-pointer"
                                            onClick={() => {
                                                if (selectedQuestionIds.size === availableQuestions.length) {
                                                    setSelectedQuestionIds(new Set());
                                                } else {
                                                    setSelectedQuestionIds(new Set(availableQuestions.map((q: any) => q.id)));
                                                }
                                            }}
                                        >
                                            {selectedQuestionIds.size === availableQuestions.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>
                                {questionsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
                                        ))}
                                    </div>
                                ) : availableQuestions.length === 0 ? (
                                    <div className="p-3 border border-dashed rounded-lg text-xs text-muted-foreground text-center">
                                        No questions found for this assessment.
                                    </div>
                                ) : (
                                    <div className="border rounded-lg divide-y max-h-52 overflow-y-auto">
                                        {availableQuestions.map((q: any, idx: number) => (
                                            <label
                                                key={q.id}
                                                className="flex items-start gap-3 p-2.5 hover:bg-muted/10 cursor-pointer"
                                            >
                                                <Checkbox
                                                    checked={selectedQuestionIds.has(q.id)}
                                                    onCheckedChange={(checked) => {
                                                        setSelectedQuestionIds(prev => {
                                                            const next = new Set(prev);
                                                            if (checked) next.add(q.id);
                                                            else next.delete(q.id);
                                                            return next;
                                                        });
                                                    }}
                                                    className="mt-0.5 border-input"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-foreground line-clamp-2">
                                                        Q{idx + 1}. {q.questionText}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] text-muted-foreground capitalize">{q.type?.replace(/_/g, ' ')}</span>
                                                        <span className="text-[10px] text-muted-foreground">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {availableQuestions.length > 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                        {selectedQuestionIds.size} of {availableQuestions.length} question{availableQuestions.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Recipient select */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Recipient <span className="text-destructive">*</span></Label>
                            <Select value={assignRecipient} onValueChange={setAssignRecipient}>
                                <SelectTrigger className="border-input text-foreground">
                                    <SelectValue placeholder="Select recipient" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="all">All Students ({cls.students?.length || 0})</SelectItem>
                                    {(cls.students || []).map((student: any) => (
                                        <SelectItem key={student.id} value={student.id}>
                                            {student.firstName} {student.lastName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Due date */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Due Date <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <Input
                                type="date"
                                value={assignDueDate}
                                onChange={e => setAssignDueDate(e.target.value)}
                                className="border-input text-foreground"
                            />
                        </div>

                        {/* Instructions */}
                        <div className="space-y-1.5">
                            <Label className="text-foreground">Instructions <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                            <Textarea
                                value={assignInstructions}
                                onChange={e => setAssignInstructions(e.target.value)}
                                placeholder="Any specific instructions for the student..."
                                rows={2}
                                className="border-input text-foreground resize-none text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAssignDialogOpen(false)}
                            disabled={isAssigning}
                            className="cursor-pointer border-input"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignAssessment}
                            disabled={isAssigning || !assignAssessmentId || (availableQuestions.length > 0 && selectedQuestionIds.size === 0)}
                            className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer"
                        >
                            <HiOutlineAcademicCap className="h-4 w-4 mr-1.5" />
                            {isAssigning ? 'Assigning...' : 'Assign Assessment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite Parent/Student Dialog */}
            <Dialog
                open={isInviteOpen}
                onOpenChange={(open) => {
                    setIsInviteOpen(open);
                    if (!open) setInviteLink(null);
                }}
            >
                <DialogContent className="max-w-md bg-card border-border">
                    <form onSubmit={handleInviteUser}>
                        <DialogHeader>
                            <DialogTitle className="text-foreground">Invite to Class</DialogTitle>
                            <DialogDescription className="text-muted-foreground">
                                Invite a parent or student to this class. If they are registered, they will be added directly. Otherwise, we will email them an invitation link.
                            </DialogDescription>
                        </DialogHeader>
                        {inviteLink && (
                            <div className="mt-4 rounded-lg border border-tutor-purple-200 bg-tutor-purple-50/40 p-3 space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                    <HiOutlineLink className="h-4 w-4 text-tutor-purple-600" />
                                    <p className="text-xs font-semibold text-tutor-purple-900">Shareable invite link</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    We emailed the invitation. If it doesn&apos;t arrive, share this link directly.
                                </p>
                                <Input
                                    readOnly
                                    value={inviteLink}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="border-input text-foreground text-xs h-9 bg-white"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyInviteLink(inviteLink, 'Link copied')}
                                        className="flex-1 cursor-pointer border-input text-xs h-8 gap-1.5"
                                    >
                                        <HiOutlineLink className="h-3.5 w-3.5" /> Copy link
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => shareInviteOnWhatsApp(inviteLink)}
                                        className="flex-1 cursor-pointer bg-[#25D366] hover:bg-[#1eb955] text-white text-xs h-8 gap-1.5"
                                    >
                                        <FaWhatsapp className="h-3.5 w-3.5" /> Share on WhatsApp
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-foreground">Role / Account Type</Label>
                                <Select
                                    value={inviteeType}
                                    onValueChange={(val: any) => setInviteeType(val)}
                                >
                                    <SelectTrigger className="border-input text-foreground">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="student">Student</SelectItem>
                                        <SelectItem value="parent">Parent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newInviteEmail" className="text-foreground">Email Address</Label>
                                <Input
                                    id="newInviteEmail"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={newInviteEmail}
                                    onChange={(e) => setNewInviteEmail(e.target.value)}
                                    className="border-input text-foreground"
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInviteOpen(false)}
                                disabled={isSubmittingInvite}
                                className="cursor-pointer border-input"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingInvite}
                                className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer"
                            >
                                {isSubmittingInvite ? 'Sending...' : 'Send Invitation'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Class Sheet */}
            <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
                <SheetContent className="overflow-y-auto grid grid-cols-1 w-full sm:max-w-[45rem] [&[data-side=right]]:sm:max-w-[45rem] bg-card border-border">
                    <SheetHeader>
                        <SheetTitle className="text-foreground">Edit Class</SheetTitle>
                        <SheetDescription className="text-muted-foreground">
                            Update class details, schedule, and metadata.
                        </SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleUpdateClass} className="grid gap-6 py-6 grid-cols-1 px-4">
                        <div className="grid gap-2">
                            <Label htmlFor="subject" className="text-foreground">Subject</Label>
                            <Select value={subject} onValueChange={setSubject}>
                                <SelectTrigger id="subject" className="border-input text-foreground">
                                    <SelectValue placeholder="Select a subject" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    {subjects?.map((sub) => (
                                        <SelectItem key={sub.id} value={String(sub.id)}>
                                            {sub.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description" className="text-foreground">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief details about the class"
                                className="border-input text-foreground"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label className="text-foreground">Class Type</Label>
                                <Select value={classType} onValueChange={setClassType}>
                                    <SelectTrigger className="border-input text-foreground">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border text-foreground">
                                        <SelectItem value="one-on-one">One on One</SelectItem>
                                        <SelectItem value="group">Group Class</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-foreground">Maximum Students (If Group)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxStudents}
                                    onChange={(e) => setMaxStudents(e.target.value)}
                                    disabled={classType === 'one-on-one'}
                                    className="border-input text-foreground"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2 flex-col">
                                <Label className="text-foreground">Start Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full rounded-full justify-start text-left font-normal border-input text-foreground ${!startDate && "text-muted-foreground"}`}
                                        >
                                            <HiOutlineCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
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
                                <Label className="text-foreground">End Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full rounded-full justify-start text-left font-normal border-input text-foreground ${!endDate && "text-muted-foreground"}`}
                                        >
                                            <HiOutlineCalendar className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
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
                            <Label className="text-base font-semibold text-foreground">Weekly Schedule</Label>
                            <div className="space-y-4 rounded-lg border p-4 bg-muted/20 border-border">
                                {DAYS_OF_WEEK.map((day) => (
                                    <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b last:border-0 pb-3 last:pb-0 border-border">
                                        <div className="flex items-center gap-2 w-32">
                                            <Checkbox
                                                id={`day-${day.id}`}
                                                checked={scheduleState[day.id].checked}
                                                onCheckedChange={(checked) => handleScheduleDayChange(day.id, !!checked)}
                                                className="border-input"
                                            />
                                            <Label htmlFor={`day-${day.id}`} className="font-medium cursor-pointer text-foreground">{day.label}</Label>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                type="time"
                                                value={scheduleState[day.id].startTime}
                                                onChange={(e) => handleScheduleTimeChange(day.id, 'startTime', e.target.value)}
                                                disabled={!scheduleState[day.id].checked}
                                                className="h-9 border-input text-foreground"
                                            />
                                            <span className="text-muted-foreground text-sm">to</span>
                                            <Input
                                                type="time"
                                                value={scheduleState[day.id].endTime}
                                                onChange={(e) => handleScheduleTimeChange(day.id, 'endTime', e.target.value)}
                                                disabled={!scheduleState[day.id].checked}
                                                className="h-9 border-input text-foreground"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditSheetOpen(false)}
                                disabled={isUpdatingClass}
                                className="cursor-pointer border-input text-foreground"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUpdatingClass}
                                className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer"
                            >
                                {isUpdatingClass ? 'Updating...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
