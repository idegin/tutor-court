'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { WhiteboardCanvas } from './whiteboard-canvas';
import {
    HiOutlineMicrophone,
    HiOutlineVideoCamera,
    HiOutlineChatBubbleLeftRight,
    HiOutlineWrenchScrewdriver,
    HiOutlineArrowLeftOnRectangle,
    HiOutlineUserGroup,
    HiOutlineUser,
    HiOutlineDocumentText,
    HiPlus,
} from 'react-icons/hi2';

interface ClassroomClientProps {
    cls: any;
    currentUser: any;
    initialSession: any;
    initialWhiteboards: any[];
}

export function ClassroomClient({ cls, currentUser, initialSession, initialWhiteboards }: ClassroomClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTutor = currentUser.accountType === 'tutor';

    // Session states
    const [session, setSession] = useState<any>(initialSession);
    const [isLive, setIsLive] = useState(initialSession?.status === 'live');
    const [isLoading, setIsLoading] = useState(false);

    // Call controls
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);

    // Sidebar and Whiteboards
    const [whiteboards, setWhiteboards] = useState<any[]>(initialWhiteboards);
    const [selectedWhiteboard, setSelectedWhiteboard] = useState<any | null>(null);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [newWbTitle, setNewWbTitle] = useState('');

    // Collapsible side tabs panel
    const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    const toggleTab = (tab: 'chat' | 'tools') => {
        if (isPanelOpen && activeTab === tab) {
            setIsPanelOpen(false);
        } else {
            setActiveTab(tab);
            setIsPanelOpen(true);
        }
    };

    // Chat
    const [chatMessages, setChatMessages] = useState<any[]>([
        { id: '1', sender: 'System', text: 'Welcome to the classroom! Let\'s begin.', time: new Date() }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Set initial whiteboard from searchParams or first available
    useEffect(() => {
        const wbId = searchParams.get('whiteboardId');
        if (wbId) {
            const found = whiteboards.find(w => w.id === wbId);
            if (found) {
                setSelectedWhiteboard(found);
                setShowWhiteboard(true);
            }
        } else if (whiteboards.length > 0) {
            setSelectedWhiteboard(whiteboards[0]);
        }
    }, [searchParams, whiteboards]);

    // Student waiting room polling
    useEffect(() => {
        if (isLive) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/live-sessions?where[class][equals]=${cls.id}&where[status][equals]=live&limit=1`);
                const data = await res.json();
                if (data?.docs?.length > 0) {
                    setSession(data.docs[0]);
                    setIsLive(true);
                    toast.success('Your tutor has started the class! Joining room...');
                }
            } catch (err) {
                console.error('Polling active session error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [isLive, cls.id]);

    // Register attendance and join live session
    useEffect(() => {
        if (isLive && session?.id) {
            const joinSession = async () => {
                try {
                    await fetch('/api/live-sessions/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            classId: cls.id,
                            sessionId: session.id,
                        }),
                    });
                } catch (err) {
                    console.error('Error joining live session and registering attendance:', err);
                }
            };
            joinSession();
        }
    }, [isLive, session?.id, cls.id]);

    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // End session when tutor leaves page or closes tab
    useEffect(() => {
        if (!isTutor) return;

        const handleUnload = () => {
            const currentSession = sessionRef.current;
            if (currentSession?.id && currentSession?.status !== 'ended') {
                fetch(`/api/live-sessions/${currentSession.id}/end`, {
                    method: 'POST',
                    keepalive: true,
                });
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            const currentSession = sessionRef.current;
            if (currentSession?.id && currentSession?.status !== 'ended') {
                fetch(`/api/live-sessions/${currentSession.id}/end`, {
                    method: 'POST',
                });
            }
        };
    }, [isTutor]);

    // Poll session status for students
    useEffect(() => {
        if (isTutor || !isLive || !session?.id) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/live-sessions/${session.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data?.status === 'ended') {
                        toast.info('The tutor has ended this live session.');
                        router.push('/dashboard/student');
                    }
                }
            } catch (err) {
                console.error('Error polling live session status:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isTutor, isLive, session?.id, router]);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleStartSession = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/live-sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: cls.id }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to start class.');
            }
            setSession(data.session);
            setIsLive(true);
            toast.success('Live classroom session started.');
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndSession = async () => {
        if (!session) return;
        if (!window.confirm('Are you sure you want to end this live session? This will bill credits and disconnect participants.')) return;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/live-sessions/${session.id}/end`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to end class.');
            }
            toast.success('Live session ended successfully.');
            router.push(`/dashboard/tutor/classes/${cls.id}`);
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveSession = () => {
        if (isTutor) {
            handleEndSession();
        } else {
            router.push('/dashboard/student');
        }
    };

    const handleCreateWhiteboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWbTitle.trim()) return;

        try {
            const res = await fetch('/api/whiteboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newWbTitle.trim(),
                    classId: cls.id,
                    liveSessionId: session?.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setWhiteboards(prev => [...prev, data.whiteboard]);
                setSelectedWhiteboard(data.whiteboard);
                setShowWhiteboard(true);
                setNewWbTitle('');
                toast.success('New whiteboard created!');
            }
        } catch (err) {
            toast.error('Failed to create whiteboard');
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            id: Date.now().toString(),
            sender: `${currentUser.firstName} ${currentUser.lastName}`,
            text: newMessage.trim(),
            time: new Date(),
        };

        setChatMessages(prev => [...prev, msg]);
        setNewMessage('');
    };

    // Render Waiting Room for Student
    if (!isLive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
                <Card className="w-full max-w-md bg-card border-border shadow-xl">
                    <CardContent className="flex flex-col items-center text-center p-8 space-y-6">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-20"></span>
                            <span className="relative inline-flex rounded-full h-12 w-12 bg-secondary items-center justify-center text-white">
                                <HiOutlineVideoCamera className="h-6 w-6" />
                            </span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-foreground">{cls.title}</h2>
                            <p className="text-sm text-muted-foreground">Subject: {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}</p>
                        </div>
                        <div className="border-t border-border w-full pt-6">
                            {isTutor ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        You are the tutor for this class. Click below to start the live session.
                                    </p>
                                    <Button
                                        onClick={handleStartSession}
                                        disabled={isLoading}
                                        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-2 rounded-lg cursor-pointer"
                                    >
                                        {isLoading ? 'Starting Class...' : 'Start Live Classroom'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                        Waiting for your tutor to start the class...
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        The screen will refresh automatically once the class starts.
                                    </p>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push(isTutor ? `/dashboard/tutor/classes/${cls.id}` : '/dashboard/student')}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Top Navigation / Status Header */}
            <header className="h-14 bg-background border-b border-border px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <h1 className="text-sm font-bold tracking-tight max-w-[200px] sm:max-w-xs truncate text-foreground">
                        {cls.title} <span className="text-muted-foreground font-normal">| Live Classroom</span>
                    </h1>
                    <Badge variant="secondary" className="text-[10px] bg-secondary text-secondary-foreground">
                        {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}
                    </Badge>
                </div>

                {/* Call Control Center */}
                <div className="flex items-center gap-3">
                    <Button
                        size="icon"
                        variant={micEnabled ? 'outline' : 'destructive'}
                        onClick={() => setMicEnabled(!micEnabled)}
                        className={`h-9 w-9 rounded-full cursor-pointer ${micEnabled ? 'border-border text-foreground hover:bg-muted' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        <HiOutlineMicrophone className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant={camEnabled ? 'outline' : 'destructive'}
                        onClick={() => setCamEnabled(!camEnabled)}
                        className={`h-9 w-9 rounded-full cursor-pointer ${camEnabled ? 'border-border text-foreground hover:bg-muted' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        title={camEnabled ? 'Turn off Cam' : 'Turn on Cam'}
                    >
                        <HiOutlineVideoCamera className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleLeaveSession}
                        className="rounded-full flex items-center gap-1 px-4 py-1.5 text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                        <HiOutlineArrowLeftOnRectangle className="h-4 w-4" />
                        {isTutor ? 'End Class' : 'Leave'}
                    </Button>
                </div>
            </header>

            {/* Main Classroom Split Panel */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Area: Video Call Viewport & Shared Whiteboard */}
                <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative bg-muted/20">
                    {showWhiteboard && selectedWhiteboard ? (
                        /* Share Whiteboard Mode */
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Small Video Avatars at top */}
                            <div className="flex gap-2 mb-2 bg-card/95 border border-border p-2 rounded-lg absolute top-14 left-4 z-20 shadow-md">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 border border-border">
                                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-bold">
                                            {cls.tutor.firstName?.[0] || 'T'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-muted-foreground font-medium">Tutor ({cls.tutor.firstName})</span>
                                </div>
                                {cls.students && cls.students.map((student: any) => (
                                    <div key={student.id} className="flex items-center gap-2 border-l border-border pl-2">
                                        <Avatar className="h-7 w-7 border border-border">
                                            <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-bold">
                                                {student.firstName?.[0] || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-muted-foreground font-medium">{student.firstName}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Whiteboard Board */}
                            <div className="flex-1 min-h-0 text-foreground">
                                <WhiteboardCanvas
                                    whiteboardId={selectedWhiteboard.id}
                                    isTutor={isTutor}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Standard Grid Video Mode */
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center p-4">
                            {/* Tutor Video Screen */}
                            <div className="h-full min-h-[220px] rounded-xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                                {camEnabled && isTutor ? (
                                    <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                                        <span className="text-xs text-muted-foreground">Tutor Camera active (streaming)</span>
                                    </div>
                                ) : (
                                    <Avatar className="h-16 w-16 border-2 border-secondary">
                                        <AvatarFallback className="text-xl font-bold bg-secondary text-secondary-foreground">
                                            {cls.tutor.firstName?.[0] || 'T'}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <span className="absolute bottom-3 left-3 bg-background/90 border border-border px-2 py-0.5 rounded text-xs text-foreground font-semibold">
                                    Tutor: {cls.tutor.firstName} {cls.tutor.lastName}
                                </span>
                            </div>

                            {/* Student(s) Video Screen */}
                            {cls.students && cls.students.map((student: any) => (
                                <div key={student.id} className="h-full min-h-[220px] rounded-xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
                                    {camEnabled && !isTutor ? (
                                        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground">Student Camera active</span>
                                        </div>
                                    ) : (
                                        <Avatar className="h-16 w-16 border-2 border-border">
                                            <AvatarFallback className="text-xl font-bold bg-secondary text-secondary-foreground">
                                                {student.firstName?.[0] || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <span className="absolute bottom-3 left-3 bg-background/90 border border-border px-2 py-0.5 rounded text-xs text-foreground font-semibold">
                                        {student.firstName} {student.lastName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collapsible Panel */}
                {isPanelOpen && (
                    <div className="w-80 border-l border-border bg-background flex flex-col shrink-0">
                        {activeTab === 'chat' && (
                            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
                                <div className="border-b border-border pb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <HiOutlineChatBubbleLeftRight className="h-4 w-4 text-muted-foreground" /> Chat
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className="space-y-0.5">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-secondary">{msg.sender}</span>
                                                <span className="text-[9px] text-muted-foreground">
                                                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="bg-muted/40 p-2 rounded-lg text-foreground border border-border/40">
                                                {msg.text}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type message..."
                                        className="h-9 bg-background border-border text-xs focus:ring-secondary focus:border-secondary text-foreground"
                                    />
                                    <Button type="submit" size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer h-9 text-xs">
                                        Send
                                    </Button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'tools' && (
                            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
                                <div className="border-b border-border pb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <HiOutlineWrenchScrewdriver className="h-4 w-4 text-muted-foreground" /> Tools
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                        <HiOutlineUser className="h-4 w-4" /> Whiteboards
                                    </h3>

                                    <div className="space-y-2">
                                        {whiteboards.map((wb) => (
                                            <div
                                                key={wb.id}
                                                onClick={() => {
                                                    setSelectedWhiteboard(wb);
                                                    setShowWhiteboard(true);
                                                }}
                                                className={`p-3 border rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${selectedWhiteboard?.id === wb.id && showWhiteboard
                                                    ? 'bg-secondary/10 border-secondary/20 text-secondary font-semibold'
                                                    : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <HiOutlineDocumentText className="h-4 w-4" />
                                                    <span className="font-medium">{wb.title}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {showWhiteboard && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowWhiteboard(false)}
                                            className="w-full text-xs border-border hover:bg-muted cursor-pointer mt-2 text-foreground"
                                        >
                                            Hide Whiteboard (View Cameras)
                                        </Button>
                                    )}

                                    {isTutor && (
                                        <div className="border-t border-border pt-3 mt-3">
                                            <h4 className="text-[11px] font-semibold text-muted-foreground mb-2">Create Whiteboard</h4>
                                            <form onSubmit={handleCreateWhiteboard} className="space-y-2">
                                                <Input
                                                    value={newWbTitle}
                                                    onChange={(e) => setNewWbTitle(e.target.value)}
                                                    placeholder="Whiteboard title..."
                                                    className="h-8 bg-background border-border text-xs text-foreground"
                                                    required
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs cursor-pointer flex items-center justify-center gap-1 font-semibold"
                                                >
                                                    <HiPlus className="h-3.5 w-3.5" /> Create
                                                </Button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Vertical Tabs Bar on Right */}
                <div className="w-14 border-l border-border bg-background flex flex-col items-center py-4 gap-4 shrink-0">
                    <button
                        onClick={() => toggleTab('chat')}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors relative ${isPanelOpen && activeTab === 'chat'
                                ? 'bg-secondary text-secondary-foreground shadow-md shadow-secondary/20'
                                : 'text-muted-foreground hover:bg-primary/30 hover:text-foreground'
                            }`}
                        title="Chat"
                    >
                        <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => toggleTab('tools')}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors ${isPanelOpen && activeTab === 'tools'
                                ? 'bg-secondary text-secondary-foreground shadow-md shadow-secondary/20'
                                : 'text-muted-foreground hover:bg-primary/30 hover:text-foreground'
                            }`}
                        title="Tools"
                    >
                        <HiOutlineWrenchScrewdriver className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
