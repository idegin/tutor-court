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
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { createPortal } from 'react-dom';
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
    HiOutlineTv,
    HiOutlineExclamationCircle,
    HiPlus,
    HiOutlineArrowsPointingOut,
    HiOutlineArrowsPointingIn,
} from 'react-icons/hi2';
import { MeetingProvider, useMeeting, useParticipant, usePubSub } from '@videosdk.live/react-sdk';

interface ClassroomClientProps {
    cls: any;
    currentUser: any;
    initialSession: any;
    initialWhiteboards: any[];
    videoSdkToken: string;
}

function LocalMediaPreview({
    micEnabled,
    setMicEnabled,
    camEnabled,
    setCamEnabled,
    onPermissionChange,
}: {
    micEnabled: boolean
    setMicEnabled: (val: boolean) => void
    camEnabled: boolean
    setCamEnabled: (val: boolean) => void
    onPermissionChange?: (denied: boolean) => void
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [permissionError, setPermissionError] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let isCurrent = true;

        async function getMedia() {
            try {
                setPermissionError(false);
                onPermissionChange?.(false);

                // Stop any previous stream tracks first
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // If both are disabled, do not request any media stream
                if (!camEnabled && !micEnabled) {
                    if (isCurrent) {
                        setStream(null);
                        if (videoRef.current) {
                            videoRef.current.srcObject = null;
                        }
                    }
                    return;
                }

                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: camEnabled,
                    audio: micEnabled,
                });

                if (!isCurrent) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = mediaStream;
                setStream(mediaStream);
                if (videoRef.current && camEnabled) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                if (isCurrent) {
                    console.warn("Error accessing media devices for preview:", err);
                    setPermissionError(true);
                    onPermissionChange?.(true);
                }
            }
        }

        getMedia();

        return () => {
            isCurrent = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [camEnabled, micEnabled]);

    return (
        <div className="w-full h-full min-h-[320px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-lg group">
            {camEnabled && !permissionError ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-muted/20">
                    <div className="p-4 rounded-full bg-muted/50 mb-3 text-muted-foreground">
                        <HiOutlineVideoCamera className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {permissionError ? "Camera/Mic permission denied or unavailable" : "Camera is turned off"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                        Please check your browser permissions to enable audio and video preview.
                    </p>
                </div>
            )}

            {/* Device Setup Preview Badge */}
            <span className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm border border-border px-3 py-1 rounded-full text-[10px] font-semibold text-foreground tracking-wide uppercase shadow-sm">
                Device Preview
            </span>

            {/* Bottom Controls Overlay */}
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 z-10">
                <Button
                    size="icon"
                    variant={micEnabled ? 'outline' : 'destructive'}
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`h-11 w-11 rounded-full shadow-md cursor-pointer transition-all ${micEnabled
                        ? 'bg-background/90 hover:bg-background border-border text-foreground hover:scale-105'
                        : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 border-0'
                        }`}
                    title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                >
                    <HiOutlineMicrophone className="h-5 w-5" />
                </Button>
                <Button
                    size="icon"
                    variant={camEnabled ? 'outline' : 'destructive'}
                    onClick={() => setCamEnabled(!camEnabled)}
                    className={`h-11 w-11 rounded-full shadow-md cursor-pointer transition-all ${camEnabled
                        ? 'bg-background/90 hover:bg-background border-border text-foreground hover:scale-105'
                        : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 border-0'
                        }`}
                    title={camEnabled ? 'Turn off Camera' : 'Turn on Camera'}
                >
                    <HiOutlineVideoCamera className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

export function ClassroomClient({ cls, currentUser, initialSession, initialWhiteboards, videoSdkToken }: ClassroomClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isTutor = currentUser.accountType === 'tutor';

    // Session states
    const [session, setSession] = useState<any>(initialSession);
    const [isLive, setIsLive] = useState(initialSession?.status === 'live');
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Call controls initial state
    const [micEnabled, setMicEnabled] = useState(true);
    const [camEnabled, setCamEnabled] = useState(true);
    // True when the browser denied/blocked camera & mic access during preview — used
    // to warn the tutor that the video SDK won't work before they start the class.
    const [mediaDenied, setMediaDenied] = useState(false);

    // Sidebar and Whiteboards
    const [whiteboards, setWhiteboards] = useState<any[]>(initialWhiteboards);
    const [selectedWhiteboard, setSelectedWhiteboard] = useState<any | null>(null);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [newWbTitle, setNewWbTitle] = useState('');

    // Collapsible side tabs panel
    const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'tools'>('chat');
    const [isPanelOpen, setIsPanelOpen] = useState(true);

    const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
    const [activeStudentsCount, setActiveStudentsCount] = useState(0);

    // Keep the latest active count in a ref so the status-poll interval can read
    // it without re-subscribing (which would tear down/rebuild the interval on
    // every participant change).
    const activeStudentsCountRef = useRef(activeStudentsCount);
    useEffect(() => {
        activeStudentsCountRef.current = activeStudentsCount;
    }, [activeStudentsCount]);

    const toggleTab = (tab: 'chat' | 'participants' | 'tools') => {
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
            const found = whiteboards.find(w => String(w.id) === String(wbId));
            if (found) {
                setSelectedWhiteboard(found);
                setShowWhiteboard(true);
            }
        } else if (whiteboards.length > 0) {
            setSelectedWhiteboard(whiteboards[0]);
        }
    }, [searchParams, whiteboards]);

    // Refetch the whiteboard list for this class. Needed because students load a
    // static list at page render; if the tutor shares a board created afterwards,
    // it won't be in that list and would otherwise never display. Returns the
    // fresh list so callers can resolve a board immediately (setState is async).
    const refreshWhiteboards = async (): Promise<any[]> => {
        try {
            const res = await fetch(`/api/whiteboards?classId=${cls.id}`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data.whiteboards)) {
                    setWhiteboards(data.whiteboards);
                    return data.whiteboards;
                }
            }
        } catch (err) {
            console.error('Failed to refresh whiteboards:', err);
        }
        return whiteboards;
    };

    // Resolve a shared whiteboard by id, refetching the list once if it's not
    // already known locally.
    const resolveAndSelectWhiteboard = async (wbId: string) => {
        let found = whiteboards.find(w => String(w.id) === String(wbId));
        if (!found) {
            const refreshed = await refreshWhiteboards();
            found = refreshed.find(w => String(w.id) === String(wbId));
        }
        if (found) {
            setSelectedWhiteboard(found);
        }
    };

    // Sync whiteboard helper
    const syncWhiteboardStateToDB = async (show: boolean, wbId: string | null) => {
        const currentSession = sessionRef.current;
        if (!isTutor || !currentSession?.id) return;
        try {
            await fetch(`/api/live-sessions/${currentSession.id}/whiteboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    showWhiteboard: show,
                    activeWhiteboard: wbId
                })
            });
        } catch (err) {
            console.error("Failed to sync whiteboard state to DB:", err);
        }
    };

    // Student waiting room polling
    useEffect(() => {
        if (isLive) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/live-sessions/status?classId=${cls.id}`);
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (data?.status === 'live' && data?.sessionId) {
                        // Merge so we don't drop other session fields.
                        setSession((prev: any) => ({ ...prev, id: data.sessionId, roomId: data.roomId, status: 'live' }));
                        setIsLive(true);
                        // Sync whiteboard state immediately
                        setShowWhiteboard(data.showWhiteboard || false);
                        if (data.activeWhiteboard) {
                            resolveAndSelectWhiteboard(data.activeWhiteboard);
                        }
                        toast.success('Your tutor has started the class! Joining room...');
                    }
                }
            } catch (err) {
                console.error('Polling active session error:', err);
            }
        }, 3000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLive, cls.id]);

    // Register attendance and join live session
    useEffect(() => {
        if (isLive && session?.id) {
            const joinSession = async () => {
                try {
                    const res = await fetch('/api/live-sessions/join', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            classId: cls.id,
                            sessionId: session.id,
                        }),
                    });

                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        if (res.status === 403) {
                            setAuthError(data.error || 'Access Denied: You are not enrolled in this class.');
                            return;
                        }
                        throw new Error(data.error || 'Failed to join live session');
                    }
                } catch (err: any) {
                    console.error('Error joining live session and registering attendance:', err);
                    toast.error(err.message || 'Error joining classroom.');
                }
            };
            joinSession();
        }
    }, [isLive, session?.id, cls.id, isTutor, router]);

    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    // End session when tutor leaves page or closes tab
    // (Removed automatic end session on tab close to prevent accidental termination)

    // Track leave duration analytics for everyone
    useEffect(() => {
        const handleLeave = () => {
            const currentSession = sessionRef.current;
            if (currentSession?.id) {
                fetch('/api/live-sessions/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: currentSession.id }),
                    keepalive: true,
                });
            }
        };

        window.addEventListener('beforeunload', handleLeave);
        return () => {
            window.removeEventListener('beforeunload', handleLeave);
            handleLeave();
        };
    }, []);

    // Poll session status for active whiteboard updates, session termination & alert handling
    const tutorAlertedRef = useRef(false);
    useEffect(() => {
        if (!isLive || !session?.id) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/live-sessions/${session.id}/status?activeStudentsCount=${activeStudentsCountRef.current}`);
                if (res.ok) {
                    const data = await res.json().catch(() => ({}));

                    // Only the tutor should ever see/track their own credit balance.
                    if (isTutor && typeof data.remainingCredits === 'number') {
                        setRemainingCredits(data.remainingCredits);
                    }

                    // Handle session ended
                    if (data?.status === 'ended') {
                        clearInterval(interval);
                        if (isTutor) {
                            if (!tutorAlertedRef.current) {
                                tutorAlertedRef.current = true;
                                if (data.remainingCredits <= 0) {
                                    toast.error('The class has ended automatically because you have run out of credits.');
                                } else {
                                    toast.info('The live classroom session has ended.');
                                }
                                router.push(`/dashboard/tutor/classes/${cls.id}`);
                            }
                        } else {
                            // remainingCredits is the tutor's actual balance: 0 means the
                            // session auto-closed because they ran out of credits; anything
                            // above 0 means the tutor deliberately ended the class.
                            if (data.remainingCredits <= 0) {
                                toast.error('The class has ended because the tutor ran out of credits.');
                            } else {
                                toast.info('The tutor has ended the class.');
                            }
                            router.push('/dashboard/student');
                        }
                        return;
                    }

                    // Sync whiteboard state if changed
                    if (!isTutor) {
                        if (typeof data.showWhiteboard === 'boolean') {
                            setShowWhiteboard(data.showWhiteboard);
                        }
                        if (data.activeWhiteboard) {
                            resolveAndSelectWhiteboard(data.activeWhiteboard);
                        }
                    }
                }
            } catch (err) {
                console.error('Error polling live session status:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
        // activeStudentsCount is read via ref; whiteboards via refetch — keeping
        // them out of deps prevents the interval from constantly re-arming.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTutor, isLive, session?.id, router, cls.id]);

    const handleStartSession = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/live-sessions/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: cls.id }),
            });
            const data = await res.json().catch(() => ({}));
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

    // Returns true when the caller should disconnect from the media room, false
    // when the tutor cancelled the confirm (so we don't kill their camera).
    const handleEndSession = async (): Promise<boolean> => {
        if (!session) return false;
        if (!window.confirm('Are you sure you want to end this live session? This will bill credits and disconnect participants.')) return false;

        setIsLoading(true);
        try {
            const res = await fetch(`/api/live-sessions/${session.id}/end`, {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to end class.');
            }
            toast.success('Live session ended successfully.');
            router.push(`/dashboard/tutor/classes/${cls.id}`);
            return true;
        } catch (error: any) {
            toast.error(error.message || 'An error occurred.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveSession = async (): Promise<boolean> => {
        if (isTutor) {
            return await handleEndSession();
        }
        router.push('/dashboard/student');
        return true;
    };

    const handleCreateWhiteboard = async (title: string): Promise<any | null> => {
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
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setWhiteboards(prev => [...prev, data.whiteboard]);
                setSelectedWhiteboard(data.whiteboard);
                setShowWhiteboard(true);
                toast.success('New whiteboard created!');
                return data.whiteboard;
            }
            toast.error(data.error || 'Failed to create whiteboard');
            return null;
        } catch (err) {
            toast.error('Failed to create whiteboard');
            return null;
        }
    };

    if (authError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-muted/10 text-foreground p-4">
                <Card className="w-full max-w-md bg-card border border-border shadow-2xl p-8 rounded-2xl text-center space-y-6">
                    <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 animate-pulse">
                        <HiOutlineExclamationCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Classroom Unauthorized</h2>
                        <p className="text-sm text-muted-foreground">{authError}</p>
                    </div>
                    <Button
                        onClick={() => router.push(isTutor ? `/dashboard/tutor/classes/${cls.id}` : '/dashboard/student')}
                        className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold cursor-pointer py-2.5 rounded-lg border-0"
                    >
                        Go Back to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    // Render Waiting Room for Student or Pre-start screen for Tutor
    if (!isLive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-muted/10 text-foreground p-4 sm:p-6 md:p-10">
                <Card className="w-full max-w-4xl bg-card border-border shadow-2xl overflow-hidden rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
                        {/* Column 1: Local Device setup and camera feed preview */}
                        <div className="flex flex-col justify-center w-full h-full min-h-[300px]">
                            <LocalMediaPreview
                                micEnabled={micEnabled}
                                setMicEnabled={setMicEnabled}
                                camEnabled={camEnabled}
                                setCamEnabled={setCamEnabled}
                                onPermissionChange={setMediaDenied}
                            />
                        </div>

                        {/* Column 2: Meeting Context and Action buttons */}
                        <div className="flex flex-col justify-between space-y-6 py-2">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/20 text-secondary text-xs font-semibold select-none">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    {isTutor ? "Setup Live Class" : "Live Waiting Room"}
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{cls.title}</h2>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border py-1 px-3">
                                            Subject: {typeof cls.subject === 'object' && cls.subject ? cls.subject.name : (cls.subject || 'No Subject')}
                                        </Badge>
                                        <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border py-1 px-3 font-medium">
                                            Role: {isTutor ? "Tutor (Host)" : "Student"}
                                        </Badge>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground leading-relaxed pt-2">
                                    Test your camera and microphone options prior to entering the live class. Ensure that you are in a quiet, well-lit environment for the best interactive learning experience.
                                </p>
                            </div>

                            <div className="border-t border-border pt-6 space-y-4">
                                {isTutor ? (
                                    <div className="space-y-3">
                                        {mediaDenied && (
                                            <div className="flex items-start gap-3 text-sm bg-red-50/70 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 p-4 rounded-xl">
                                                <HiOutlineExclamationCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                                <p className="font-medium text-red-700 dark:text-red-400">
                                                    Camera and microphone access is blocked, so the live class video won&apos;t work. Allow access in your browser, then try again.
                                                </p>
                                            </div>
                                        )}
                                        <Button
                                            onClick={handleStartSession}
                                            disabled={isLoading || mediaDenied}
                                            className="w-full bg-secondary hover:bg-secondary/95 text-secondary-foreground font-semibold py-3 rounded-xl cursor-pointer text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Starting Class...' : mediaDenied ? 'Enable Camera & Mic to Start' : 'Start Live Classroom'}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-sm text-amber-800 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-xl shadow-inner">
                                            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                            <p className="font-medium text-amber-800 dark:text-amber-400">Waiting for your tutor to start the class...</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            This waiting screen will automatically redirect and connect when the tutor launches the class.
                                        </p>
                                    </div>
                                )}

                                <Button
                                    variant="ghost"
                                    onClick={() => router.push(isTutor ? `/dashboard/tutor/classes/${cls.id}` : '/dashboard/student')}
                                    className="w-full text-muted-foreground hover:text-foreground cursor-pointer text-xs py-2 hover:bg-muted/50 rounded-lg"
                                >
                                    Return to Dashboard
                                </Button>
                            </div>
                        </div>
                    </div>
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
                participantId: String(currentUser.id),
                debugMode: false,
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
                resolveAndSelectWhiteboard={resolveAndSelectWhiteboard}
                handleLeaveSession={handleLeaveSession}
                handleCreateWhiteboard={handleCreateWhiteboard}
                newWbTitle={newWbTitle}
                setNewWbTitle={setNewWbTitle}
                activeTab={activeTab}
                toggleTab={toggleTab}
                isPanelOpen={isPanelOpen}
                syncWhiteboardStateToDB={syncWhiteboardStateToDB}
                remainingCredits={remainingCredits}
                setActiveStudentsCount={setActiveStudentsCount}
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
    resolveAndSelectWhiteboard: (wbId: string) => Promise<void>;
    handleLeaveSession: () => Promise<boolean>;
    handleCreateWhiteboard: (title: string) => Promise<any | null>;
    newWbTitle: string;
    setNewWbTitle: (title: string) => void;
    activeTab: 'chat' | 'participants' | 'tools';
    toggleTab: (tab: 'chat' | 'participants' | 'tools') => void;
    isPanelOpen: boolean;
    syncWhiteboardStateToDB: (show: boolean, wbId: string | null) => Promise<void>;
    remainingCredits: number | null;
    setActiveStudentsCount: (count: number) => void;
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
    resolveAndSelectWhiteboard,
    handleLeaveSession,
    handleCreateWhiteboard,
    newWbTitle,
    setNewWbTitle,
    activeTab,
    toggleTab,
    isPanelOpen,
    syncWhiteboardStateToDB,
    remainingCredits,
    setActiveStudentsCount,
}: ClassroomMeetingViewProps) {
    const router = useRouter();
    const [isWhiteboardFullScreen, setIsWhiteboardFullScreen] = useState(false);
    const [createWbOpen, setCreateWbOpen] = useState(false);
    const [creatingWb, setCreatingWb] = useState(false);
    // Get expected tutor/students info from DB to build the grid
    const tutorId = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor.id : cls.tutor;
    const tutorInfo = typeof cls.tutor === 'object' && cls.tutor ? cls.tutor : null;
    const expectedStudents = cls.students || [];

    const {
        join,
        leave,
        toggleMic,
        toggleWebcam,
        toggleScreenShare,
        localScreenShareOn,
        localParticipant,
        localMicOn,
        localWebcamOn,
        presenterId,
        participants
    } = useMeeting({
        onMeetingJoined: () => {
            console.log("Connected to VideoSDK WebRTC room");
        },
        onMeetingLeft: () => {
            router.push(isTutor ? `/dashboard/tutor/classes/${cls.id}` : `/dashboard/${currentUser.accountType}`);
        },
        onMeetingStateChanged: (data: any) => {
            // Surface connection lifecycle so a dropped/expired connection isn't a
            // silent frozen screen. VideoSDK handles reconnection internally; we
            // just reflect it to the user.
            const state = data?.state;
            if (state === 'RECONNECTING') {
                toast.warning('Connection lost — reconnecting…');
            } else if (state === 'CONNECTED') {
                // no-op; back online
            } else if (state === 'CLOSED' || state === 'FAILED') {
                toast.error('The classroom connection was lost.');
            }
        },
        onError: (error) => {
            console.error("VideoSDK error event:", error);
            toast.error(`Media connection error: ${error.message}`);
        }
    });

    // Explicitly disconnect from the media room (stops the local camera/mic) and
    // then run the role-appropriate end/leave flow. Prevents the camera light
    // staying on after leaving and ghost participants lingering in the room.
    const handleExit = async () => {
        const proceed = await handleLeaveSession();
        if (proceed) {
            try { leave(); } catch { /* already disconnected */ }
        }
    };

    // Auto-join the meeting on mount, and leave on unmount. The deps MUST stay
    // empty: VideoSDK returns fresh join/leave references on every render, so
    // depending on them (the previous behaviour) re-ran this effect constantly,
    // tearing down and rebuilding the room on each render. That silently broke
    // chat, mic/camera toggling, and made each user only ever see themselves.
    useEffect(() => {
        join();
        // Stop local media on tab close too — the SDK's own beforeunload doesn't
        // reliably stop getUserMedia tracks, leaving the camera light on.
        const onUnload = () => {
            try { leave(); } catch { /* noop */ }
        };
        window.addEventListener('beforeunload', onUnload);
        return () => {
            window.removeEventListener('beforeunload', onUnload);
            leave();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track active participants list
    const participantIds = Array.from(participants.keys());

    // Local mic/camera state comes straight from the meeting (the local user is
    // not always present in the `participants` map), so the header toggles
    // always reflect — and control — the real device state.
    const isMicEnabled = localMicOn;
    const isCamEnabled = localWebcamOn;

    // De-duplicate by participant id ONLY. The previous version also merged
    // anyone who shared a display name, which made two different people with the
    // same first/display name (e.g. two "John"s) collapse into one — one of them
    // would vanish from the grid and participant list. Identity is the id; the
    // local participant is included explicitly because it's not guaranteed to be
    // present in the `participants` map.
    const uniqueParticipants = React.useMemo(() => {
        const byId = new Map<string, any>();
        if (localParticipant) {
            byId.set(String(localParticipant.id), localParticipant);
        }
        for (const p of participants.values()) {
            byId.set(String(p.id), p);
        }
        return Array.from(byId.values());
    }, [participants, localParticipant]);

    // Only a real screen share from the tutor (or, defensively, any presenter
    // while no whiteboard is being shared) should take over the main stage.
    // Students can no longer present (token is scoped), but guard anyway so a
    // stray presenter can't blank out the tutor's shared whiteboard.
    const presenterIsTutor = presenterId ? String(presenterId) === String(tutorId) : false;
    const showScreenShare = !!presenterId && (presenterIsTutor || !showWhiteboard);


    // Sync active student/parent count to the parent ClassroomClient
    useEffect(() => {
        const studentCount = uniqueParticipants.filter(p => String(p.id) !== String(tutorId)).length;
        setActiveStudentsCount(studentCount);
    }, [uniqueParticipants, setActiveStudentsCount, tutorId]);

    // Real-time Chat using VideoSDK PubSub
    const { publish, messages } = usePubSub("CHAT");
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Real-time Whiteboard Toggle using VideoSDK PubSub
    const { publish: publishWhiteboard, messages: whiteboardMessages } = usePubSub("WHITEBOARD_TOGGLE");

    // Scroll chat to bottom when new messages arrive
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Sync Whiteboard State across all participants in the meeting room
    useEffect(() => {
        if (whiteboardMessages && whiteboardMessages.length > 0) {
            const latestMsg = whiteboardMessages[whiteboardMessages.length - 1];
            try {
                const data = JSON.parse(latestMsg.message);
                if (typeof data.showWhiteboard === 'boolean') {
                    setShowWhiteboard(data.showWhiteboard);
                    if (data.whiteboardId) {
                        resolveAndSelectWhiteboard(data.whiteboardId);
                    }
                }
            } catch (e) {
                console.error("Error parsing whiteboard toggle message:", e);
            }
        }
        // Only react to new pubsub messages; resolveAndSelectWhiteboard always
        // reads the latest list via refetch, so it doesn't need to be a dep.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [whiteboardMessages]);

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

    const handleFormCreateWhiteboard = async (e: React.FormEvent) => {
        e.preventDefault();
        const title = newWbTitle.trim();
        if (!title || creatingWb) return;
        setCreatingWb(true);
        const wb = await handleCreateWhiteboard(title);
        setCreatingWb(false);
        if (wb) {
            // Immediately share the freshly created whiteboard with the whole class.
            if (isTutor) {
                publishWhiteboard(JSON.stringify({
                    showWhiteboard: true,
                    whiteboardId: wb.id,
                }), { persist: true });
                syncWhiteboardStateToDB(true, wb.id);
            }
            setNewWbTitle('');
            setCreateWbOpen(false);
        }
    };



    // Helper to check if a specific database user ID is in the current VideoSDK
    // participants Map. The map is keyed by String(user.id), so normalize.
    const isParticipantJoined = (userId: string | number) => participants.has(String(userId));

    // Collect any guest participant IDs that are NOT the tutor or an enrolled
    // student. Both sides must be strings — participantIds are strings while DB
    // ids are numbers, so a raw compare would flag every real participant.
    const expectedUserIds = [String(tutorId), ...expectedStudents.map((s: any) => String(s.id))];
    const guestParticipantIds = participantIds.filter(id => !expectedUserIds.includes(String(id)));

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Top Navigation / Status Header */}
            <header className="h-14 bg-background border-b border-border px-2 sm:px-4 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <h1 className="text-sm font-bold tracking-tight max-w-[200px] sm:max-w-xs truncate text-foreground">
                        {cls.title} <span className="text-muted-foreground font-normal">| Live Classroom</span>
                    </h1>
                    {isTutor && remainingCredits !== null && (
                        <Badge variant="outline" className={`text-[10px] font-bold py-0.5 px-2 rounded-full ${remainingCredits < 10 ? 'bg-red-500/10 border-red-500/25 text-red-500' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'}`}>
                            {remainingCredits === 1 ? '1 credit' : `${remainingCredits} credits`} left
                        </Badge>
                    )}

                    {/* Whiteboard Sync Toggle */}
                    <div className="flex items-center gap-2 border-l border-border pl-3 ml-3">
                        {isTutor ? (
                            <Button
                                size="sm"
                                variant={showWhiteboard ? "default" : "outline"}
                                onClick={() => {
                                    if (showWhiteboard) {
                                        // Currently sharing → stop sharing for everyone.
                                        publishWhiteboard(JSON.stringify({
                                            showWhiteboard: false,
                                            whiteboardId: selectedWhiteboard?.id
                                        }), { persist: true });
                                        syncWhiteboardStateToDB(false, selectedWhiteboard?.id || null);
                                    } else {
                                        // Not sharing → open the create-whiteboard popup.
                                        setCreateWbOpen(true);
                                    }
                                }}
                                className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer ${showWhiteboard ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : "border-border text-foreground"
                                    }`}
                            >
                                <HiOutlineDocumentText className="h-4 w-4 sm:mr-1.5" />
                                <span className="hidden sm:inline">
                                    {showWhiteboard ? "Close Whiteboard for All" : "Share Whiteboard with Class"}
                                </span>
                            </Button>
                        ) : (
                            <Badge variant={showWhiteboard ? "default" : "secondary"} className="h-6 text-[10px] gap-1 px-2.5">
                                <HiOutlineDocumentText className="h-3 w-3" />
                                Whiteboard: {showWhiteboard ? "Active" : "Inactive"}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Call Control Center */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
                        size="icon"
                        variant={localScreenShareOn ? 'secondary' : 'outline'}
                        onClick={() => toggleScreenShare()}
                        className={`h-9 w-9 rounded-full cursor-pointer ${localScreenShareOn ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90' : 'border-border text-foreground hover:bg-muted'}`}
                        title={localScreenShareOn ? 'Stop Presenting' : 'Share Screen'}
                    >
                        <HiOutlineTv className="h-4.5 w-4.5" />
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleExit}
                        className="rounded-full flex items-center gap-1 px-4 py-1.5 text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                        <HiOutlineArrowLeftOnRectangle className="h-4 w-4" />
                        {isTutor ? 'End Class' : 'Leave'}
                    </Button>
                </div>
            </header>

            {/* Main Classroom Split Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Left Area: Video Call Viewport & Shared Whiteboard */}
                <div className="flex-1 flex flex-col p-2 sm:p-4 space-y-4 overflow-hidden relative bg-muted/20">
                    {showScreenShare ? (
                        /* Screen Share Presenter Mode */
                        <div className="flex-1 flex flex-col min-h-0 relative">
                            {/* Small Video Avatars at top */}
                            <div className="flex gap-2 mb-2 bg-card/95 border border-border p-2 rounded-lg absolute top-4 left-4 z-20 shadow-md">
                                {uniqueParticipants.map((p: any, idx: number) => (
                                    <div key={p.id} className={idx > 0 ? "border-l border-border pl-2" : ""}>
                                        <SmallParticipantVideoView participantId={p.id} />
                                    </div>
                                ))}
                            </div>
                            <PresenterScreenShare presenterId={presenterId} />
                        </div>
                    ) : showWhiteboard && selectedWhiteboard ? (
                        /* Share Whiteboard Mode. When full screen, render through a
                           portal on document.body so it reliably covers the whole
                           viewport (escaping the overflow-hidden flex layout), and
                           remount the canvas via `key` so it re-measures to the new
                           full-screen size. */
                        (() => {
                            const board = (
                                <div className={isWhiteboardFullScreen
                                    ? 'fixed inset-0 z-[100] bg-background p-4 flex flex-col'
                                    : 'flex-1 flex flex-col min-h-0 relative'}>
                                    {/* Small Video Avatars at top */}
                                    {!isWhiteboardFullScreen && (
                                        <div className="flex gap-2 mb-2 bg-card/95 border border-border p-2 rounded-lg absolute top-4 left-4 z-20 shadow-md">
                                            {uniqueParticipants.map((p: any, idx: number) => (
                                                <div key={p.id} className={idx > 0 ? "border-l border-border pl-2" : ""}>
                                                    <SmallParticipantVideoView participantId={p.id} />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Full Screen Toggle Button */}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsWhiteboardFullScreen(!isWhiteboardFullScreen)}
                                        className="absolute top-4 right-4 z-30 bg-background/90 border border-border hover:bg-muted text-foreground flex items-center gap-1.5 shadow-sm"
                                    >
                                        {isWhiteboardFullScreen ? (
                                            <>
                                                <HiOutlineArrowsPointingIn className="h-4 w-4" />
                                                <span>Exit Full Screen</span>
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlineArrowsPointingOut className="h-4 w-4" />
                                                <span>Full Screen</span>
                                            </>
                                        )}
                                    </Button>

                                    {/* Whiteboard Canvas */}
                                    <div className={`flex-1 min-h-0 text-foreground ${isWhiteboardFullScreen ? 'pt-16' : 'pt-14'}`}>
                                        <WhiteboardCanvas
                                            key={isWhiteboardFullScreen ? 'whiteboard-fullscreen' : 'whiteboard-inline'}
                                            whiteboardId={selectedWhiteboard.id}
                                            isTutor={isTutor}
                                            initialSlides={selectedWhiteboard.slides}
                                        />
                                    </div>
                                </div>
                            );

                            if (isWhiteboardFullScreen && typeof document !== 'undefined') {
                                return createPortal(board, document.body);
                            }
                            return board;
                        })()
                    ) : (
                        /* Standard Grid Video Mode — column count adapts to the
                           number of participants so large classes don't get
                           squashed into a fixed 2-wide grid. */
                        <div className={`flex-1 grid gap-4 items-center justify-center p-4 ${uniqueParticipants.length <= 1
                            ? 'grid-cols-1'
                            : uniqueParticipants.length <= 4
                                ? 'grid-cols-1 sm:grid-cols-2'
                                : uniqueParticipants.length <= 9
                                    ? 'grid-cols-2 lg:grid-cols-3'
                                    : 'grid-cols-2 lg:grid-cols-4'
                            }`}>
                            {uniqueParticipants.map((p: any) => {
                                const isParticipantTutor = String(p.id) === String(tutorId);
                                const initials = p.displayName?.[0] || (isParticipantTutor ? 'T' : 'S');
                                return (
                                    <ParticipantVideoView
                                        key={p.id}
                                        participantId={p.id}
                                        displayName={p.displayName}
                                        isTutorUser={isParticipantTutor}
                                        avatarInitials={initials}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Collapsible Panel. On mobile it overlays the video area full-width
                    (so chat/participants are usable instead of a squished sliver);
                    on large screens it's a normal 320px side column. */}
                {isPanelOpen && (
                    <div className="absolute inset-y-0 left-0 right-14 z-30 border-l border-border bg-background flex flex-col shrink-0 animate-none lg:static lg:inset-auto lg:z-auto lg:w-80">
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
                                        className="h-9 bg-background border-border text-xs focus:ring-secondary focus:border-secondary text-foreground animate-none"
                                    />
                                    <Button type="submit" size="sm" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer h-9 text-xs">
                                        Send
                                    </Button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'participants' && (
                            <div className="flex-1 flex flex-col min-h-0 p-4 space-y-4">
                                <div className="border-b border-border pb-3 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                        <HiOutlineUserGroup className="h-4 w-4 text-muted-foreground" /> Participants ({uniqueParticipants.length})
                                    </h3>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                                    {uniqueParticipants.map((p: any) => {
                                        const isParticipantTutor = String(p.id) === String(tutorId);
                                        return (
                                            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-7 w-7 border border-border">
                                                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground font-bold">
                                                            {p.displayName?.[0] || 'P'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-foreground truncate max-w-[120px]">
                                                            {p.displayName} {p.local && '(You)'}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground">
                                                            {isParticipantTutor ? 'Tutor' : 'Student/Parent'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`p-1 rounded-full ${p.micOn ? 'text-emerald-500' : 'text-red-500'}`} title={p.micOn ? 'Mic On' : 'Mic Off'}>
                                                        <HiOutlineMicrophone className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className={`p-1 rounded-full ${p.webcamOn ? 'text-emerald-500' : 'text-red-500'}`} title={p.webcamOn ? 'Cam On' : 'Cam Off'}>
                                                        <HiOutlineVideoCamera className="h-3.5 w-3.5" />
                                                    </span>
                                                    {isTutor && !p.local && !isParticipantTutor && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to remove ${p.displayName} from the call?`)) {
                                                                    p.remove();
                                                                    toast.success(`${p.displayName} removed.`);
                                                                }
                                                            }}
                                                            className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 cursor-pointer ml-1"
                                                        >
                                                            Kick
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                                    if (isTutor) {
                                                        publishWhiteboard(JSON.stringify({
                                                            showWhiteboard: true,
                                                            whiteboardId: wb.id
                                                        }), { persist: true });
                                                        syncWhiteboardStateToDB(true, wb.id);
                                                    } else {
                                                        setSelectedWhiteboard(wb);
                                                        setShowWhiteboard(true);
                                                    }
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
                                            onClick={() => {
                                                if (isTutor) {
                                                    publishWhiteboard(JSON.stringify({
                                                        showWhiteboard: false
                                                    }), { persist: true });
                                                    syncWhiteboardStateToDB(false, null);
                                                } else {
                                                    setShowWhiteboard(false);
                                                }
                                            }}
                                            className="w-full text-xs border-border hover:bg-muted cursor-pointer mt-2 text-foreground"
                                        >
                                            Hide Whiteboard (View Cameras)
                                        </Button>
                                    )}

                                    {isTutor && (
                                        <div className="border-t border-border pt-3 mt-3">
                                            <Button
                                                size="sm"
                                                onClick={() => setCreateWbOpen(true)}
                                                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs cursor-pointer flex items-center justify-center gap-1 font-semibold"
                                            >
                                                <HiPlus className="h-3.5 w-3.5" /> Add Whiteboard
                                            </Button>
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
                        onClick={() => toggleTab('participants')}
                        className={`p-2.5 rounded-xl cursor-pointer transition-colors relative ${isPanelOpen && activeTab === 'participants'
                            ? 'bg-secondary text-secondary-foreground shadow-md shadow-secondary/20'
                            : 'text-muted-foreground hover:bg-primary/30 hover:text-foreground'
                            }`}
                        title="Participants"
                    >
                        <HiOutlineUserGroup className="h-5 w-5" />
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

            {/* Create Whiteboard Popup — opened from the header "Share Whiteboard
                with Class" button and from the Tools panel "Add Whiteboard" button. */}
            <Dialog open={createWbOpen} onOpenChange={(open) => { if (!creatingWb) setCreateWbOpen(open); }}>
                <DialogContent className="max-w-md">
                    <form onSubmit={handleFormCreateWhiteboard}>
                        <DialogHeader>
                            <DialogTitle>Create Whiteboard</DialogTitle>
                            <DialogDescription>
                                Give your whiteboard a title. It will open and be shared with the class right away.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Input
                                value={newWbTitle}
                                onChange={(e) => setNewWbTitle(e.target.value)}
                                placeholder="e.g. Lesson 1 — Sentence Structure"
                                autoFocus
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateWbOpen(false)}
                                disabled={creatingWb}
                                className="cursor-pointer"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={creatingWb || !newWbTitle.trim()}
                                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer gap-1"
                            >
                                <HiPlus className="h-4 w-4" />
                                {creatingWb ? 'Creating…' : 'Create & Share'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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

    // Handle video track streaming. Retry play() on failure so an autoplay-policy
    // rejection (common right after toggling a camera on) doesn't leave a
    // permanently black tile.
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        if (webcamOn && webcamStream) {
            el.srcObject = new MediaStream([webcamStream.track]);
            let cancelled = false;
            let timer: ReturnType<typeof setTimeout> | undefined;
            const tryPlay = (attempt = 0) => {
                el.play().catch((err) => {
                    if (cancelled) return;
                    if (attempt < 3) {
                        timer = setTimeout(() => tryPlay(attempt + 1), 300);
                    } else {
                        console.error('Webcam video play failed after retries:', err);
                    }
                });
            };
            tryPlay();
            return () => {
                cancelled = true;
                if (timer) clearTimeout(timer);
            };
        }
        el.srcObject = null;
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

// Presenter Screen Share View Component
function PresenterScreenShare({ presenterId }: { presenterId: string }) {
    const participantObj = useParticipant(presenterId);
    const screenShareStream = participantObj?.screenShareStream;
    const screenShareOn = participantObj?.screenShareOn;
    const displayName = participantObj?.displayName;
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (screenShareOn && screenShareStream?.track) {
                const mediaStream = new MediaStream([screenShareStream.track]);
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch((err) => console.error("Presenter screen share play failed:", err));
            } else {
                videoRef.current.srcObject = null;
            }
        }
    }, [screenShareStream, screenShareOn]);

    return (
        <div className="flex-1 h-full min-h-[300px] rounded-xl bg-black border border-border flex flex-col items-center justify-center relative overflow-hidden shadow-md">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
            />
            <span className="absolute bottom-3 left-3 bg-background/90 border border-border px-2 py-0.5 rounded text-xs text-foreground font-semibold flex items-center gap-1.5 z-10">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {displayName}'s Screen Presentation
            </span>
        </div>
    );
}
