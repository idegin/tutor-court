import React from 'react';
import { Conversation, ChatUser } from './chat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    HiOutlinePhone, 
    HiOutlineVideoCamera, 
    HiOutlineUserCircle, 
    HiOutlineBell, 
    HiOutlineBellSlash,
    HiOutlinePhoto,
    HiOutlineDocumentText,
    HiOutlineLink,
    HiOutlineChevronRight,
    HiOutlineNoSymbol,
    HiOutlineXMark
} from 'react-icons/hi2';

interface ChatInfoProps {
    conversation?: Conversation;
    currentUser: ChatUser;
    onClose: () => void;
    isLoading?: boolean;
}

export function ChatInfo({ conversation, currentUser, onClose, isLoading }: ChatInfoProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-card border-l border-border/50 w-full sm:w-80 lg:w-96 shrink-0 absolute right-0 sm:relative z-20 transition-transform duration-300 transform-none">
                <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
                    <h2 className="text-sm font-bold tracking-tight">Details</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground mr-1 h-9 w-9 xl:hidden hover:bg-muted/80">
                        <HiOutlineXMark className="h-5 w-5" />
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8 flex flex-col items-center">
                    <div className="flex flex-col items-center gap-3 w-full">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <div className="flex gap-4 mt-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                    </div>
                    
                    <div className="w-full space-y-4">
                        <Skeleton className="h-12 w-full rounded-md" />
                        <Skeleton className="h-12 w-full rounded-md" />
                        <Skeleton className="h-12 w-full rounded-md" />
                        <Skeleton className="h-12 w-full rounded-md" />
                    </div>
                </div>
            </div>
        );
    }

    if (!conversation) return null;

    const isGroup = conversation.type === 'group' || conversation.type === 'channel';
    const displayUser = isGroup ? null : conversation.participants[0];
    const title = isGroup ? conversation.name : displayUser?.name;
    const subtitle = isGroup ? `${conversation.participants.length} members` : displayUser?.role === 'tutor' ? 'Tutor' : 'Parent';

    return (
        <div className="flex flex-col h-full bg-card border-l border-border/50 w-full sm:w-80 lg:w-96 shrink-0 absolute right-0 sm:relative z-20 transition-transform duration-300">
            {/* Header */}
            <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
                <h2 className="text-sm font-bold tracking-tight">Details</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground mr-1 h-9 w-9 xl:hidden hover:bg-muted/80">
                    <HiOutlineXMark className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto pb-8">
                {/* Profile Section */}
                <div className="flex flex-col items-center p-6 border-b border-border">
                    <Avatar className="h-24 w-24 mb-4 ring-2 ring-background ring-offset-2 ring-offset-primary/10">
                        <AvatarImage src={displayUser?.avatar} />
                        <AvatarFallback className="bg-primary/5 text-primary text-xl font-medium">
                            {title?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    
                    <h3 className="text-lg font-bold tracking-tight text-center truncate w-full">{title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{subtitle}</p>

                    <div className="flex items-center gap-6 mt-6">
                        <div className="flex flex-col items-center gap-1.5">
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 shadow-none text-foreground">
                                <HiOutlineUserCircle className="h-5 w-5" />
                            </Button>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mr-0.5">Profile</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 shadow-none text-foreground">
                                <HiOutlineBellSlash className="h-5 w-5" />
                            </Button>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Mute</span>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                            <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 shadow-none text-foreground">
                                <HiOutlinePhone className="h-5 w-5" />
                            </Button>
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Call</span>
                        </div>
                    </div>
                </div>

                {/* Shared Content */}
                <div className="p-4 space-y-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">Shared Content</h4>
                    
                    <Button variant="ghost" className="w-full justify-between h-12 font-normal rounded-md shadow-none px-2 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <HiOutlinePhoto className="h-4 w-4" />
                            </div>
                            <span className="text-sm">Photos & Videos</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-xs">24</span>
                            <HiOutlineChevronRight className="h-4 w-4" />
                        </div>
                    </Button>

                    <Button variant="ghost" className="w-full justify-between h-12 font-normal rounded-md shadow-none px-2 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                <HiOutlineDocumentText className="h-4 w-4" />
                            </div>
                            <span className="text-sm">Files & Documents</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-xs">12</span>
                            <HiOutlineChevronRight className="h-4 w-4" />
                        </div>
                    </Button>

                    <Button variant="ghost" className="w-full justify-between h-12 font-normal rounded-md shadow-none px-2 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                                <HiOutlineLink className="h-4 w-4" />
                            </div>
                            <span className="text-sm">Shared Links</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-xs">156</span>
                            <HiOutlineChevronRight className="h-4 w-4" />
                        </div>
                    </Button>
                </div>

                {/* Actions */}
                <div className="p-4 mt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 px-2">Privacy & Support</h4>
                    
                    <Button variant="ghost" className="w-full justify-start h-12 font-normal rounded-md shadow-none px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <HiOutlineNoSymbol className="h-5 w-5 mr-3" />
                        <span className="text-sm">Block User</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
