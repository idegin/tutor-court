import React from 'react';
import { Conversation } from './chat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HiOutlineMagnifyingGlass, HiOutlinePencilSquare, HiOutlineHashtag, HiOutlineXMark, HiOutlineUsers } from 'react-icons/hi2';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatSidebarProps {
    conversations: Conversation[];
    activeConversationId?: string;
    onSelectConversation: (id: string) => void;
    isLoading?: boolean;
    onCloseMobile?: () => void;
}

export function ChatSidebar({ conversations, activeConversationId, onSelectConversation, isLoading, onCloseMobile }: ChatSidebarProps) {
    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-card">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <div className="p-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="flex-1 p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex gap-3 items-center">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 h-16">
                <h2 className="text-xl font-bold tracking-tight">Messages</h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <HiOutlinePencilSquare className="h-5 w-5" />
                    </Button>
                    {onCloseMobile && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden text-muted-foreground" onClick={onCloseMobile}>
                            <HiOutlineXMark className="h-5 w-5" />
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="p-4 shrink-0">
                <div className="relative">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search messages..." 
                        className="pl-9 bg-muted/50 border-transparent focus-visible:ring-1 shadow-none h-10" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full">
                <div className="px-2 space-y-0.5">
                    {conversations.map((conv) => {
                        const isActive = activeConversationId === conv.id;
                        
                        const displayUser = conv.participants[0];
                        const displayName = conv.type === 'direct' ? displayUser?.name : conv.name;
                        const avatarStr = displayUser?.name?.substring(0, 2).toUpperCase() || 'GR';

                        return (
                            <button
                                key={conv.id}
                                onClick={() => onSelectConversation(conv.id)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                                    isActive 
                                        ? 'bg-primary/10 text-primary' 
                                        : 'hover:bg-muted/50 text-foreground'
                                }`}
                            >
                                <div className="relative shrink-0">
                                    {conv.type === 'channel' ? (
                                        <div className={`h-10 w-10 flex flex-col items-center justify-center rounded-full bg-muted text-muted-foreground ${isActive ? 'bg-primary/20 text-primary' : ''}`}>
                                            <HiOutlineHashtag className="h-5 w-5" />
                                        </div>
                                    ) : conv.type === 'group' ? (
                                        <div className={`h-10 w-10 flex flex-col items-center justify-center rounded-full bg-muted text-muted-foreground ${isActive ? 'bg-primary/20 text-primary' : ''}`}>
                                            <HiOutlineUsers className="h-5 w-5" />
                                        </div>
                                    ) : (
                                        <Avatar className="h-10 w-10 border border-border">
                                            <AvatarImage src={displayUser?.avatar} alt={displayUser?.name} />
                                            <AvatarFallback className={isActive ? 'bg-primary/20 text-primary' : 'bg-muted'}>{avatarStr}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    
                                    {conv.type === 'direct' && displayUser?.status === 'online' && (
                                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <span className={`text-sm  text-foreground tracking-tight truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>
                                            {displayName}
                                        </span>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                                {conv.lastMessage.timestamp}
                                            </span>
                                        )}
                                    </div>
                                    {conv.lastMessage && (
                                        <p className={`text-xs truncate ${conv.unreadCount ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                            {conv.lastMessage.content}
                                        </p>
                                    )}
                                </div>
                                {!!conv.unreadCount && conv.unreadCount > 0 && (
                                    <div className="h-5 min-w-5 shrink-0 px-1.5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                                        {conv.unreadCount}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
