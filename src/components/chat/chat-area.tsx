import React from 'react';
import { Conversation, Message, ChatUser } from './chat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    HiOutlineInformationCircle, 
    HiOutlinePhone, 
    HiOutlineVideoCamera, 
    HiOutlinePaperClip, 
    HiOutlineFaceSmile,
    HiOutlinePaperAirplane,
    HiOutlineEllipsisHorizontal,
    HiOutlineBars3BottomLeft
} from 'react-icons/hi2';

interface ChatAreaProps {
    conversation?: Conversation;
    messages: Message[];
    currentUser: ChatUser;
    onToggleSidebar: () => void;
    onToggleInfo: () => void;
    isLoading?: boolean;
}

export function ChatArea({ conversation, messages, currentUser, onToggleSidebar, onToggleInfo, isLoading }: ChatAreaProps) {
    if (isLoading) {
        return (
            <div className="flex flex-1 w-full flex-col h-full bg-background border-x border-border/50">
                <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
                <div className="flex-1 p-4 flex flex-col justify-end gap-6">
                    <div className="flex items-end gap-2 w-3/4">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-20 w-full rounded-2xl rounded-bl-sm" />
                    </div>
                    <div className="flex items-end gap-2 w-3/4 self-end flex-row-reverse">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-16 w-full rounded-2xl rounded-br-sm bg-primary/20" />
                    </div>
                    <div className="flex items-end gap-2 w-1/2">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <Skeleton className="h-12 w-full rounded-2xl rounded-bl-sm" />
                    </div>
                </div>
                <div className="p-4 border-t border-border shrink-0">
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            </div>
        );
    }

    if (!conversation) {
        return (
            <div className="flex flex-1 w-full flex-col h-full bg-background border-x border-border/50 items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                    <HiOutlineInformationCircle className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">No conversation selected</h3>
                <p className="text-muted-foreground mt-2">Select a chat from the sidebar to start messaging.</p>
                <Button variant="outline" className="mt-6 md:hidden shadow-none" onClick={onToggleSidebar}>
                    View Messages
                </Button>
            </div>
        );
    }

    const displayUser = conversation.participants[0];
    const isGroup = conversation.type === 'group' || conversation.type === 'channel';
    const title = isGroup ? conversation.name : displayUser?.name;

    return (
        <div className="flex flex-1 w-full flex-col h-full bg-background border-x border-border/50 relative">
            {/* Header */}
            <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-10 sticky top-0">
                <div className="flex flex-1 items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-2 shrink-0 text-muted-foreground" onClick={onToggleSidebar}>
                        <HiOutlineBars3BottomLeft className="h-6 w-6" />
                    </Button>
                    
                    <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={!isGroup ? displayUser?.avatar : undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                            {isGroup ? 'GR' : displayUser?.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 pr-4">
                        <h2 className="text-sm font-bold tracking-tight truncate">{title}</h2>
                        <div className="flex items-center text-xs text-muted-foreground gap-1.5 truncate">
                            {!isGroup && displayUser?.status === 'online' && (
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                            <span className="truncate">
                                {isGroup ? `${conversation.participants.length} members` : displayUser?.status === 'online' ? 'Active Now' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex text-muted-foreground hover:text-foreground">
                        <HiOutlinePhone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex text-muted-foreground hover:text-foreground">
                        <HiOutlineVideoCamera className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={onToggleInfo}>
                        <HiOutlineInformationCircle className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground">
                        <HiOutlineEllipsisHorizontal className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col">
                <div className="text-center my-4">
                    <span className="bg-muted px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Today
                    </span>
                </div>

                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const sender = isMe ? currentUser : conversation.participants.find(p => p.id === msg.senderId);
                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);

                    return (
                        <div key={msg.id} className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end flex-row-reverse' : ''}`}>
                            {!isMe && (
                                <div className="w-8 shrink-0">
                                    {showAvatar && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={sender?.avatar} />
                                            <AvatarFallback className="text-[10px] bg-muted">{sender?.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )}
                            
                            <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                                {showAvatar && <span className="text-[10px] text-muted-foreground ml-1">{sender?.name}</span>}
                                
                                <div className={`px-4 py-2.5 text-sm ${
                                    isMe 
                                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm' 
                                        : 'bg-muted/60 text-foreground rounded-2xl rounded-bl-sm border border-border/50'
                                }`}>
                                    {msg.content}
                                </div>
                                <span className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border shrink-0">
                <div className="relative flex items-center bg-muted/40 border border-border/60 rounded-full px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full hover:bg-muted">
                        <HiOutlineFaceSmile className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground rounded-full hover:bg-muted ml-0.5">
                        <HiOutlinePaperClip className="h-5 w-5" />
                    </Button>
                    
                    <Input 
                        placeholder="Write a message..." 
                        className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 px-2 h-9 text-sm"
                    />
                    
                    <Button size="icon" className="h-9 w-9 shrink-0 rounded-full ml-2 shadow-none flex items-center justify-center bg-primary hover:bg-primary/90">
                        <HiOutlinePaperAirplane className="h-4 w-4 -ml-0.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
