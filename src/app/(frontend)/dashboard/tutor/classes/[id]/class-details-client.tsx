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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    HiOutlineCalendar,
    HiOutlineClock,
    HiOutlineUsers,
    HiOutlineVideoCamera,
    HiOutlineDocumentText,
    HiPlus,
    HiOutlineSparkles,
    HiOutlineChevronLeft,
} from 'react-icons/hi2';

interface ClassDetailsClientProps {
    cls: any;
    initialWhiteboards: any[];
}

export function ClassDetailsClient({ cls, initialWhiteboards }: ClassDetailsClientProps) {
    const router = useRouter();
    const [whiteboards, setWhiteboards] = useState(initialWhiteboards);
    const [isCreateWhiteboardOpen, setIsCreateWhiteboardOpen] = useState(false);
    const [newWhiteboardTitle, setNewWhiteboardTitle] = useState('');
    const [isCreatingWhiteboard, setIsCreatingWhiteboard] = useState(false);
    
    const [isStartSessionOpen, setIsStartSessionOpen] = useState(false);
    const [isStartingSession, setIsStartingSession] = useState(false);
    const [tutorCoins, setTutorCoins] = useState<number | null>(null);
    const [activeSession, setActiveSession] = useState<any | null>(null);

    // Fetch tutor coins and check active session on mount
    useEffect(() => {
        fetchCoins();
        checkActiveSession();
    }, []);

    const fetchCoins = async () => {
        try {
            const res = await fetch(`/api/wallets?where[user][equals]=${cls.tutor.id || cls.tutor}&limit=1`);
            const data = await res.json();
            if (data?.docs?.[0]) {
                setTutorCoins(data.docs[0].coinBalance || 0);
            }
        } catch (err) {
            console.error('Error fetching coin balance:', err);
        }
    };

    const checkActiveSession = async () => {
        try {
            const res = await fetch(`/api/live-sessions?where[class][equals]=${cls.id}&where[status][equals]=live&limit=1`);
            const data = await res.json();
            if (data?.docs?.length > 0) {
                setActiveSession(data.docs[0]);
            } else {
                setActiveSession(null);
            }
        } catch (err) {
            console.error('Error checking active live session:', err);
        }
    };

    const handleStartLiveClass = async () => {
        if (tutorCoins === null) {
            toast.error('Checking coin balance, please try again.');
            return;
        }

        if (tutorCoins < 60) {
            toast.error('Insufficient coins. You need at least 60 coins (1 hour) to start a live class.');
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
                            <HiOutlineUsers className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {cls.students && cls.students.length > 0 ? (
                                <div className="divide-y border rounded-lg bg-card/50">
                                    {cls.students.map((student: any) => {
                                        const studentInitials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase();
                                        // Find parents linked to this class or who represent this student
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
                                                <div className="flex flex-col items-start md:items-end">
                                                    <span className="text-xs font-medium text-muted-foreground">Parent</span>
                                                    <span className="text-xs text-foreground font-semibold mt-0.5">
                                                        {cls.parents && cls.parents.length > 0
                                                            ? cls.parents.map((p: any) => `${p.firstName} ${p.lastName}`).join(', ')
                                                            : 'None linked'}
                                                    </span>
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
                        </CardContent>
                    </Card>
                </div>

                {/* Right Columns (Live Class Actions & Whiteboard management) */}
                <div className="space-y-6">
                    {/* Live Class Session Manager */}
                    <Card className="border-2 border-tutor-purple-100 bg-tutor-purple-50/20">
                        <CardHeader>
                            <CardTitle className="text-tutor-purple-900 flex items-center gap-2">
                                <HiOutlineVideoCamera className="h-5 w-5" /> Live Classroom
                            </CardTitle>
                            <CardDescription>
                                Start or join VideoSDK live calls with whiteboards.
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
                                                onClick={fetchCoins}
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
                                                    Starting a live session costs <strong>1 coin per minute</strong>. A minimum of 60 coins (1 hour) is required to start.
                                                </DialogDescription>
                                            </DialogHeader>

                                            <div className="py-4 border-t border-b border-muted my-2">
                                                <div className="flex justify-between items-center text-sm mb-2">
                                                    <span className="font-medium text-muted-foreground">Required Coins:</span>
                                                    <span className="font-bold text-foreground">60 Coins</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-muted-foreground">Your Balance:</span>
                                                    <span className={`font-bold ${tutorCoins !== null && tutorCoins < 60 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {tutorCoins !== null ? `${tutorCoins} Coins` : 'Loading...'}
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
                                                {tutorCoins !== null && tutorCoins < 60 ? (
                                                    <Button
                                                        onClick={() => {
                                                            setIsStartSessionOpen(false);
                                                            router.push('/dashboard/tutor/wallet');
                                                        }}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white"
                                                    >
                                                        Purchase Coins
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={handleStartLiveClass}
                                                        disabled={isStartingSession || tutorCoins === null}
                                                        className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white"
                                                    >
                                                        {isStartingSession ? 'Starting...' : 'Start Session'}
                                                    </Button>
                                                )}
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Starting a class deducts coins from your wallet based on call duration.
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
                                            onClick={() => router.push(`/classroom/${cls.id}?whiteboardId=${wb.id}`)}
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
        </div>
    );
}
