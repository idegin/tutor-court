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
        if (!window.confirm('Are you sure you want to end this live session? This will bill coins and disconnect participants.')) return;

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
                body: JSON.stringify({ title: newWbTitle.trim(), classId: cls.id }),
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6">
                <Card className="w-full max-w-md bg-slate-800 border-slate-700 shadow-2xl">
                    <CardContent className="flex flex-col items-center text-center p-8 space-y-6">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tutor-purple-400 opacity-20"></span>
                            <span className="relative inline-flex rounded-full h-12 w-12 bg-tutor-purple-600 items-center justify-center text-white">
                                <HiOutlineVideoCamera className="h-6 w-6" />
                            </span>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">{cls.title}</h2>
                            <p className="text-sm text-slate-400">Subject: {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}</p>
                        </div>
                        <div className="border-t border-slate-700 w-full pt-6">
                            {isTutor ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-300">
                                        You are the tutor for this class. Click below to start the live session.
                                    </p>
                                    <Button
                                        onClick={handleStartSession}
                                        disabled={isLoading}
                                        className="w-full bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white font-semibold py-2 rounded-lg cursor-pointer"
                                    >
                                        {isLoading ? 'Starting Class...' : 'Start Live Classroom'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2 text-sm text-amber-400 bg-amber-950/30 border border-amber-900/50 p-3 rounded-lg">
                                        <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                        Waiting for your tutor to start the class...
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        The screen will refresh automatically once the class starts.
                                    </p>
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push(isTutor ? `/dashboard/tutor/classes/${cls.id}` : '/dashboard/student')}
                            className="text-slate-400 hover:text-white cursor-pointer"
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
            {/* Top Navigation / Status Header */}
            <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <h1 className="text-sm font-bold tracking-tight max-w-[200px] sm:max-w-xs truncate">
                        {cls.title} <span className="text-slate-400 font-normal">| Live Classroom</span>
                    </h1>
                    <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-300">
                        {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}
                    </Badge>
                </div>

                {/* Call Control Center */}
                <div className="flex items-center gap-3">
                    <Button
                        size="icon"
                        variant={micEnabled ? 'secondary' : 'destructive'}
                        onClick={() => setMicEnabled(!micEnabled)}
                        className="h-9 w-9 rounded-full cursor-pointer"
                        title={micEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        <HiOutlineMicrophone className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant={camEnabled ? 'secondary' : 'destructive'}
                        onClick={() => setCamEnabled(!camEnabled)}
                        className="h-9 w-9 rounded-full cursor-pointer"
                        title={camEnabled ? 'Turn off Cam' : 'Turn on Cam'}
                    >
                        <HiOutlineVideoCamera className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleLeaveSession}
                        className="rounded-full flex items-center gap-1 px-4 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                        <HiOutlineArrowLeftOnRectangle className="h-4 w-4" />
                        {isTutor ? 'End Class' : 'Leave'}
                    </Button>
                </div>
            </header>

            {/* Main Classroom Split Panel */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Area: Video Call Viewport & Shared Whiteboard */}
                <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden relative">
                    {showWhiteboard && selectedWhiteboard ? (
                        /* Share Whiteboard Mode */
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Small Video Avatars at top */}
                            <div className="flex gap-2 mb-2 bg-slate-900/60 p-2 rounded-lg absolute top-14 left-4 z-20 shadow-md">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7 border border-slate-700">
                                        <AvatarFallback className="text-[10px] bg-slate-700 text-white font-bold">
                                            {cls.tutor.firstName?.[0] || 'T'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-[10px] text-slate-300 font-medium">Tutor ({cls.tutor.firstName})</span>
                                </div>
                                {cls.students && cls.students.map((student: any) => (
                                    <div key={student.id} className="flex items-center gap-2 border-l border-slate-800 pl-2">
                                        <Avatar className="h-7 w-7 border border-slate-700">
                                            <AvatarFallback className="text-[10px] bg-slate-700 text-white font-bold">
                                                {student.firstName?.[0] || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-slate-300 font-medium">{student.firstName}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Whiteboard Board */}
                            <div className="flex-1 min-h-0 text-slate-900">
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
                            <div className="h-full min-h-[220px] rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                                {camEnabled && isTutor ? (
                                    <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                                        <span className="text-xs text-slate-400">Tutor Camera active (streaming)</span>
                                    </div>
                                ) : (
                                    <Avatar className="h-16 w-16 bg-tutor-purple-800 border-2 border-tutor-purple-600">
                                        <AvatarFallback className="text-xl font-bold bg-tutor-purple-600">
                                            {cls.tutor.firstName?.[0] || 'T'}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <span className="absolute bottom-3 left-3 bg-slate-950/70 px-2 py-0.5 rounded text-xs">
                                    Tutor: {cls.tutor.firstName} {cls.tutor.lastName}
                                </span>
                            </div>

                            {/* Student(s) Video Screen */}
                            {cls.students && cls.students.map((student: any) => (
                                <div key={student.id} className="h-full min-h-[220px] rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                                    {camEnabled && !isTutor ? (
                                        <div className="absolute inset-0 bg-slate-800 animate-pulse flex items-center justify-center">
                                            <span className="text-xs text-slate-400">Student Camera active</span>
                                        </div>
                                    ) : (
                                        <Avatar className="h-16 w-16 bg-slate-800 border-2 border-slate-700">
                                            <AvatarFallback className="text-xl font-bold bg-slate-700">
                                                {student.firstName?.[0] || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                    )}
                                    <span className="absolute bottom-3 left-3 bg-slate-950/70 px-2 py-0.5 rounded text-xs">
                                        {student.firstName} {student.lastName}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collapsible Panel */}
                {isPanelOpen && (
                    <div className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0">
                        {activeTab === 'chat' && (
                            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                        <HiOutlineChatBubbleLeftRight className="h-4 w-4" /> Chat
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                                    {chatMessages.map(msg => (
                                        <div key={msg.id} className="space-y-0.5">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-tutor-purple-400">{msg.sender}</span>
                                                <span className="text-[9px] text-slate-500">
                                                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="bg-slate-850 p-2 rounded-lg text-slate-200 border border-slate-800/40">
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
                                        className="h-9 bg-slate-950 border-slate-800 text-xs focus:ring-tutor-purple-500 focus:border-tutor-purple-500"
                                    />
                                    <Button type="submit" size="sm" className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer h-9 text-xs">
                                        Send
                                    </Button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'tools' && (
                            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                                        <HiOutlineWrenchScrewdriver className="h-4 w-4" /> Tools
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1">
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
                                                    ? 'bg-tutor-purple-950/40 border-tutor-purple-500 text-white'
                                                    : 'bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-850'}`}
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
                                            className="w-full text-xs border-slate-700 hover:bg-slate-850 cursor-pointer mt-2"
                                        >
                                            Hide Whiteboard (View Cameras)
                                        </Button>
                                    )}

                                    {isTutor && (
                                        <div className="border-t border-slate-800 pt-3 mt-3">
                                            <h4 className="text-[11px] font-semibold text-slate-400 mb-2">Create Whiteboard</h4>
                                            <form onSubmit={handleCreateWhiteboard} className="space-y-2">
                                                <Input
                                                    value={newWbTitle}
                                                    onChange={(e) => setNewWbTitle(e.target.value)}
                                                    placeholder="Whiteboard title..."
                                                    className="h-8 bg-slate-950 border-slate-800 text-xs"
                                                    required
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    className="w-full bg-slate-800 hover:bg-slate-700 text-xs cursor-pointer flex items-center gap-1"
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
                <div className="w-14 border-l border-slate-800 bg-slate-950 flex flex-col items-center py-4 gap-4 shrink-0">
                    <button
                        onClick={() => toggleTab('chat')}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors relative ${
                            isPanelOpen && activeTab === 'chat'
                                ? 'bg-tutor-purple-600 text-white shadow-lg shadow-tutor-purple-500/20'
                                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                        }`}
                        title="Chat"
                    >
                        <HiOutlineChatBubbleLeftRight className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => toggleTab('tools')}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isPanelOpen && activeTab === 'tools'
                                ? 'bg-tutor-purple-600 text-white shadow-lg shadow-tutor-purple-500/20'
                                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
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
