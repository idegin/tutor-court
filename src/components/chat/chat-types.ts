export interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
    status: 'online' | 'offline' | 'away';
    role?: string;
    email?: string;
}

export interface Message {
    id: string;
    content: string;
    senderId: string;
    timestamp: string;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'group' | 'channel';
    name?: string; // For groups/channels
    participants: ChatUser[];
    lastMessage?: Message;
    unreadCount?: number;
}
