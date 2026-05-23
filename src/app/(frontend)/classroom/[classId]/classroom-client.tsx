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
import { MeetingProvider, useMeeting, useParticipant, usePubSub } from '@videosdk.live/react-sdk';

interface ClassroomClientProps {
    cls: any;
    currentUser: any;
    initialSession: any;
    initialWhiteboards: any[];
    videoSdkToken: string;
}

export function ClassroomClient({ cls, currentUser, initialSession, initialWhiteboards, videoSdkToken }: ClassroomClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTutor = currentUser.accountType === 'tutor';

    // Session states
    const [session, setSession] = useState<any>(initialSession);
    const [isLive, setIsLive] = useState(initialSession?.status === 'live');
    const [isLoading, setIsLoading] = useState(false);

    // Call controls initial state
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

    // Pre-request browser camera/microphone permissions on mount
    useEffect(() => {
        if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
            navigator.mediaDevices.getUserMedia({ audio: true, video: true })
                .then((stream) => {
                    // Stop tracks immediately since we just want to trigger the prompt early
                    stream.getTracks().forEach(track => track.stop());
                })
                .catch((err) => {
                    console.warn("Pre-requesting camera/microphone permissions failed/denied:", err);
                });
        }
    }, []);

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

    const handleCreateWhiteboard = async (title: string) => {
        try {
            const res = await fetch('/api/whiteboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    classId: cls.id,
                    liveSessionId: session?.id,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setWhiteboards(prev => [...prev, data.whiteboard]);
                setSelectedWhiteboard(data.whiteboard);
                setShowWhiteboard(true);
                toast.success('New whiteboard created!');
            }
        } catch (err) {
            toast.error('Failed to create whiteboard');
        }
    };

    // Render Waiting Room for Student or Pre-start screen for Tutor
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

    // Wrap in MeetingProvider once live session starts
    return (
        <MeetingProvider
            token={videoSdkToken}
            config={{
                meetingId: session.roomId || `room-${cls.id}`,
                micEnabled: micEnabled,
                webcamEnabled: camEnabled,
                name: `${currentUser.firstName} ${currentUser.lastName}`,
                participantId: currentUser.id,
            }}
        >
            <ClassroomMeetingView
                cls={cls}
                currentUser={currentUser}
                session={session}
                isTutor={isTutor}
                whiteboards={whiteboards}
                selectedWhiteboard={selectedWhiteboard}
                setSelectedWhiteboard={setSelectedWhiteboard}
                showWhiteboard={showWhiteboard}
                setShowWhiteboard={setShowWhiteboard}
                handleLeaveSession={handleLeaveSession}
                handleCreateWhiteboard={handleCreateWhiteboard}
                newWbTitle={newWbTitle}
                setNewWbTitle={setNewWbTitle}
                activeTab={activeTab}
                toggleTab={toggleTab}
                isPanelOpen={isPanelOpen}
            />
        </MeetingProvider>
    );
}

// Inner Component within MeetingProvider context
interface ClassroomMeetingViewProps {
    cls: any;
    currentUser: any;
    session: any;
    isTutor: boolean;
    whiteboards: any[];
    selectedWhiteboard: any;
    setSelectedWhiteboard: (wb: any) => void;
    showWhiteboard: boolean;
    setShowWhiteboard: (show: boolean) => void;
    handleLeaveSession: () => void;
    handleCreateWhiteboard: (title: string) => Promise<void>;
    newWbTitle: string;
    setNewWbTitle: (title: string) => void;
    activeTab: 'chat' | 'tools';
    toggleTab: (tab: 'chat' | 'tools') => void;
    isPanelOpen: boolean;
}

function ClassroomMeetingView({
    cls,
    currentUser,
    session,
    isTutor,
    whiteboards,
    selectedWhiteboard,
    setSelectedWhiteboard,
    showWhiteboard,
    setShowWhiteboard,
    handleLeaveSession,
    handleCreateWhiteboard,
    newWbTitle,
    setNewWbTitle,
    activeTab,
    toggleTab,
    isPanelOpen,
}: ClassroomMeetingViewProps) {
    const { join, leave, toggleMic, toggleWebcam, participants } = useMeeting({
        onMeetingJoined: () => {
            console.log("Connected to VideoSDK WebRTC room");
        },
        onError: (error) => {
            console.error("VideoSDK error event:", error);
            toast.error(`Media connection error: ${error.message}`);
        }
    });

    // Auto-join meeting on load
    useEffect(() => {
        join();
        return () => {
            leave();
        };
    }, [join, leave]);

    // Track active participants list
    const participantIds = Array.from(participants.keys());
    const localParticipant = Array.from(participants.values()).find(p => p.local);
    
    // Resolve active state based on WebRTC track states
    const localParticipantStats = useParticipant(localParticipant?.id || '');
    const isMicEnabled = localParticipant ? localParticipantStats?.micOn : true;
    const isCamEnabled = localParticipant ? localParticipantStats?.webcamOn : true;

    // Real-time Chat using VideoSDK PubSub
    const { publish, messages } = usePubSub("CHAT");
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Scroll chat to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await publish(newMessage.trim(), { persist: true });
            setNewMessage('');
        } catch (err) {
            toast.error("Failed to send chat message.");
        }
    };

    const handleFormCreateWhiteboard = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWbTitle.trim()) return;
        handleCreateWhiteboard(newWbTitle.trim());
        setNewWbTitle('');
    };

    // Get expected tutor/students info from DB to build the grid
    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor.id : cls.tutor;
    const tutorInfo = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor : null;
    const expectedStudents = cls.students || [];

    // Helper to check if a specific database user ID is in the current VideoSDK participants Map
    const isParticipantJoined = (userId: string) => participants.has(userId);

    // Collect any guest or dynamic participant IDs that are NOT the tutor or enrolled students
    const expectedUserIds = [tutorId, ...expectedStudents.map((s: any) => s.id)];
    const guestParticipantIds = participantIds.filter(id => !expectedUserIds.includes(id));

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
                        variant={isMicEnabled ? 'outline' : 'destructive'}
                        onClick={() => toggleMic()}
                        className={`h-9 w-9 rounded-full cursor-pointer ${isMicEnabled ? 'border-border text-foreground hover:bg-muted' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        title={isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
                    >
                        <HiOutlineMicrophone className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant={isCamEnabled ? 'outline' : 'destructive'}
                        onClick={() => toggleWebcam()}
                        className={`h-9 w-9 rounded-full cursor-pointer ${isCamEnabled ? 'border-border text-foreground hover:bg-muted' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        title={isCamEnabled ? 'Turn off Cam' : 'Turn on Cam'}
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
                                {isParticipantJoined(tutorId) ? (
                                    <SmallParticipantVideoView participantId={tutorId} />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 border border-border border-dashed">
                                            <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                                {tutorInfo?.firstName?.[0] || 'T'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-[10px] text-muted-foreground font-medium">Tutor ({tutorInfo?.firstName || 'Offline'})</span>
                                    </div>
                                )}
                                {expectedStudents.map((student: any) => (
                                    <div key={student.id} className="border-l border-border pl-2">
                                        {isParticipantJoined(student.id) ? (
                                            <SmallParticipantVideoView participantId={student.id} />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 border border-border border-dashed">
                                                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                                                        {student.firstName?.[0] || 'S'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-[10px] text-muted-foreground font-medium">{student.firstName} (Offline)</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {guestParticipantIds.map((guestId) => (
                                    <div key={guestId} className="border-l border-border pl-2">
                                        <SmallParticipantVideoView participantId={guestId} />
                                    </div>
                                ))}
                            </div>

                            {/* Whiteboard Canvas */}
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
                            {isParticipantJoined(tutorId) ? (
                                <ParticipantVideoView
                                    participantId={tutorId}
                                    displayName={`${tutorInfo?.firstName || 'Tutor'} ${tutorInfo?.lastName || ''}`}
                                    isTutorUser={true}
                                    avatarInitials={tutorInfo?.firstName?.[0] || 'T'}
                                />
                            ) : (
                                <OfflineParticipantView
                                    displayName={`${tutorInfo?.firstName || 'Tutor'} ${tutorInfo?.lastName || ''}`}
                                    isTutorUser={true}
                                    avatarInitials={tutorInfo?.firstName?.[0] || 'T'}
                                />
                            )}

                            {/* Student(s) Video Screen */}
                            {expectedStudents.map((student: any) => (
                                <React.Fragment key={student.id}>
                                    {isParticipantJoined(student.id) ? (
                                        <ParticipantVideoView
                                            participantId={student.id}
                                            displayName={`${student.firstName} ${student.lastName}`}
                                            isTutorUser={false}
                                            avatarInitials={student.firstName?.[0] || 'S'}
                                        />
                                    ) : (
                                        <OfflineParticipantView
                                            displayName={`${student.firstName} ${student.lastName}`}
                                            isTutorUser={false}
                                            avatarInitials={student.firstName?.[0] || 'S'}
                                        />
                                    )}
                                </React.Fragment>
                            ))}

                            {/* Guest Video Screen */}
                            {guestParticipantIds.map((guestId) => (
                                <ParticipantVideoView
                                    key={guestId}
                                    participantId={guestId}
                                    displayName="Guest User"
                                    isTutorUser={false}
                                    avatarInitials="G"
                                />
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
                                    {messages.map((msg: any) => (
                                        <div key={msg.id} className="space-y-0.5">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-secondary">{msg.senderName}</span>
                                                <span className="text-[9px] text-muted-foreground">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="bg-muted/40 p-2 rounded-lg text-foreground border border-border/40 break-words">
                                                {msg.message}
                                            </p>
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <p className="text-center text-muted-foreground text-[10px] mt-6">
                                            No messages yet. Start the conversation!
                                        </p>
                                    )}
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
                                            <form onSubmit={handleFormCreateWhiteboard} className="space-y-2">
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

// Single Participant Feed Component (Big Grid)
interface ParticipantVideoViewProps {
    participantId: string;
    displayName: string;
    isTutorUser: boolean;
    avatarInitials: string;
}

function ParticipantVideoView({ participantId, displayName, isTutorUser, avatarInitials }: ParticipantVideoViewProps) {
    const { webcamStream, webcamOn, micStream, micOn, isLocal } = useParticipant(participantId);
    const videoRef = useRef<HTMLVideoElement>(null);
    const micRef = useRef<HTMLAudioElement>(null);

    // Handle video track streaming
    useEffect(() => {
        if (videoRef.current) {
            if (webcamOn && webcamStream) {
                const mediaStream = new MediaStream([webcamStream.track]);
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch((err) => console.error("Webcam video play failed:", err));
            } else {
                videoRef.current.srcObject = null;
            }
        }
    }, [webcamStream, webcamOn]);

    // Handle audio track streaming (only play for remote participants to prevent local echo)
    useEffect(() => {
        if (micRef.current) {
            if (micOn && micStream && !isLocal) {
                const mediaStream = new MediaStream([micStream.track]);
                micRef.current.srcObject = mediaStream;
                micRef.current.play().catch((err) => console.error("Mic audio play failed:", err));
            } else {
                micRef.current.srcObject = null;
            }
        }
    }, [micStream, micOn, isLocal]);

    return (
        <div className="h-full min-h-[220px] rounded-xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
            {/* Hidden audio element for remote feeds */}
            {!isLocal && <audio ref={micRef} autoPlay playsInline />}

            {webcamOn ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                />
            ) : (
                <Avatar className={`h-16 w-16 border-2 ${isTutorUser ? 'border-secondary' : 'border-border'}`}>
                    <AvatarFallback className="text-xl font-bold bg-secondary text-secondary-foreground">
                        {avatarInitials}
                    </AvatarFallback>
                </Avatar>
            )}

            {/* User Details label */}
            <span className="absolute bottom-3 left-3 bg-background/90 border border-border px-2 py-0.5 rounded text-xs text-foreground font-semibold flex items-center gap-1.5 z-10">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {isTutorUser ? 'Tutor: ' : ''}{displayName} {isLocal && '(You)'}
            </span>

            {/* Mic/Camera track state indicators */}
            <div className="absolute top-3 right-3 flex gap-1.5 z-10">
                <span className={`p-1.5 rounded-full ${micOn ? 'bg-background/90 border border-border text-foreground' : 'bg-red-600 text-white'} text-xs shadow-sm`}>
                    <HiOutlineMicrophone className="h-3.5 w-3.5" />
                </span>
                <span className={`p-1.5 rounded-full ${webcamOn ? 'bg-background/90 border border-border text-foreground' : 'bg-red-600 text-white'} text-xs shadow-sm`}>
                    <HiOutlineVideoCamera className="h-3.5 w-3.5" />
                </span>
            </div>
        </div>
    );
}

// Single Participant Feed Component (Small bubble for whiteboard mode)
function SmallParticipantVideoView({ participantId }: { participantId: string }) {
    const { webcamStream, webcamOn, micStream, micOn, isLocal, displayName } = useParticipant(participantId);
    const videoRef = useRef<HTMLVideoElement>(null);
    const micRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (webcamOn && webcamStream) {
                const mediaStream = new MediaStream([webcamStream.track]);
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch((err) => console.error("Webcam small video play failed:", err));
            } else {
                videoRef.current.srcObject = null;
            }
        }
    }, [webcamStream, webcamOn]);

    useEffect(() => {
        if (micRef.current) {
            if (micOn && micStream && !isLocal) {
                const mediaStream = new MediaStream([micStream.track]);
                micRef.current.srcObject = mediaStream;
                micRef.current.play().catch((err) => console.error("Mic small audio play failed:", err));
            } else {
                micRef.current.srcObject = null;
            }
        }
    }, [micStream, micOn, isLocal]);

    return (
        <div className="flex items-center gap-2 relative group pr-2">
            {!isLocal && <audio ref={micRef} autoPlay playsInline />}
            <div className="h-8 w-8 rounded-full border border-secondary overflow-hidden bg-muted relative shadow-sm">
                {webcamOn ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted={isLocal}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-foreground text-xs font-bold">
                        {displayName?.[0] || 'P'}
                    </div>
                )}
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold max-w-[80px] truncate">
                {displayName?.split(' ')[0]} {isLocal && '(You)'}
            </span>
            <div className="flex gap-0.5">
                <span className={`text-[10px] ${micOn ? 'text-emerald-500' : 'text-red-500'}`}>
                    <HiOutlineMicrophone className="h-3 w-3" />
                </span>
            </div>
        </div>
    );
}

// Offline/Placeholder Card for expected participant not currently connected
interface OfflineParticipantViewProps {
    displayName: string;
    isTutorUser: boolean;
    avatarInitials: string;
}

function OfflineParticipantView({ displayName, isTutorUser, avatarInitials }: OfflineParticipantViewProps) {
    return (
        <div className="h-full min-h-[220px] rounded-xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-sm opacity-60">
            <Avatar className={`h-16 w-16 border-2 border-dashed ${isTutorUser ? 'border-secondary/40' : 'border-border'}`}>
                <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                    {avatarInitials}
                </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-3 left-3 bg-background/90 border border-border px-2 py-0.5 rounded text-xs text-foreground font-semibold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                {isTutorUser ? 'Tutor: ' : ''}{displayName} (Offline)
            </span>
        </div>
    );
}
