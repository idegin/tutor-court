import React from 'react';
import { Metadata } from 'next';
import { ChatLayout } from '@/components/chat/chat-layout';
import { ChatUser, Conversation, Message } from '@/components/chat/chat-types';

export const metadata: Metadata = {
    title: 'Messages | Tutor Court',
    description: 'Chat with parents and students',
};

// Mock data to hydrate the chat UI
const currentUser: ChatUser = {
    id: 'user-1',
    name: 'Sarah Tutor',
    avatar: '/user-placeholder.png',
    status: 'online',
    role: 'tutor'
};

const mockConversations: Conversation[] = [
    {
        id: 'conv-1',
        type: 'direct',
        participants: [
            { id: 'parent-1', name: 'John Doe', avatar: '/user-placeholder.png', status: 'online', role: 'parent' }
        ],
        lastMessage: {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'parent-1',
            content: 'Are we still on for tomorrow at 4 PM?',
            timestamp: '10:30 AM',
            isRead: false
        },
        unreadCount: 2,
        updatedAt: '10:30 AM'
    },
    {
        id: 'conv-2',
        type: 'direct',
        participants: [
            { id: 'parent-2', name: 'Emily Smith', avatar: '/user-placeholder.png', status: 'offline', role: 'parent' }
        ],
        lastMessage: {
            id: 'msg-2',
            conversationId: 'conv-2',
            senderId: 'user-1',
            content: 'Great progress today!',
            timestamp: 'Yesterday',
            isRead: true
        },
        unreadCount: 0,
        updatedAt: 'Yesterday'
    },
    {
        id: 'conv-4',
        type: 'group',
        name: 'Math Exam Prep Group',
        participants: [
            { id: 'student-1', name: 'Alex Johnson', avatar: '/user-placeholder.png', status: 'online', role: 'student' },
            { id: 'student-2', name: 'Bella Swift', avatar: '/user-placeholder.png', status: 'away', role: 'student' },
            { id: 'student-3', name: 'Chris Lee', avatar: '/user-placeholder.png', status: 'offline', role: 'student' }
        ],
        lastMessage: {
            id: 'msg-4',
            conversationId: 'conv-4',
            senderId: 'student-1',
            content: 'Can someone explain question 4 from the practice test?',
            timestamp: '2:15 PM',
            isRead: false
        },
        unreadCount: 5,
        updatedAt: '2:15 PM'
    },
    {
        id: 'conv-5',
        type: 'channel',
        name: 'Announcements',
        participants: [
            { id: 'admin-1', name: 'Admin', avatar: '/user-placeholder.png', status: 'online', role: 'admin' }
        ],
        lastMessage: {
            id: 'msg-5',
            conversationId: 'conv-5',
            senderId: 'admin-1',
            content: 'Platform maintenance scheduled for this weekend.',
            timestamp: 'Mon',
            isRead: true
        },
        unreadCount: 0,
        updatedAt: 'Mon'
    },
    {
        id: 'conv-3',
        type: 'direct',
        participants: [
            { id: 'parent-3', name: 'Michael Johnson', avatar: '/user-placeholder.png', status: 'offline', role: 'parent' }
        ],
        lastMessage: {
            id: 'msg-3',
            conversationId: 'conv-3',
            senderId: 'parent-3',
            content: 'Can we reschedule to next week?',
            timestamp: 'Tuesday',
            isRead: true
        },
        unreadCount: 0,
        updatedAt: 'Tuesday'
    }
];

const mockMessages: Record<string, Message[]> = {
    'conv-1': [
        {
            id: 'msg-prev-1',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Hi John, I have reviewed the latest assignment.',
            timestamp: '09:00 AM',
            isRead: true
        },
        {
            id: 'msg-prev-2',
            conversationId: 'conv-1',
            senderId: 'parent-1',
            content: 'Thanks Sarah, how did he do?',
            timestamp: '09:15 AM',
            isRead: true
        },
        {
            id: 'msg-prev-3',
            conversationId: 'conv-1',
            senderId: 'user-1',
            content: 'Much better! He really understood the core concepts this time around.',
            timestamp: '09:20 AM',
            isRead: true
        },
        {
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'parent-1',
            content: 'Are we still on for tomorrow at 4 PM?',
            timestamp: '10:30 AM',
            isRead: false
        }
    ],
    'conv-2': [
        {
            id: 'msg-2',
            conversationId: 'conv-2',
            senderId: 'user-1',
            content: 'Great progress today!',
            timestamp: 'Yesterday',
            isRead: true
        }
    ],
    'conv-3': [
        {
            id: 'msg-3',
            conversationId: 'conv-3',
            senderId: 'parent-3',
            content: 'Can we reschedule to next week?',
            timestamp: 'Tuesday',
            isRead: true
        }
    ],
    'conv-4': [
        {
            id: 'msg-4-start',
            conversationId: 'conv-4',
            senderId: 'user-1',
            content: 'Welcome everyone! We will use this group to prep for the final exam.',
            timestamp: '10:00 AM',
            isRead: true
        },
        {
            id: 'msg-4-re',
            conversationId: 'conv-4',
            senderId: 'student-2',
            content: 'Awesome, thanks Sarah!',
            timestamp: '10:15 AM',
            isRead: true
        },
        {
            id: 'msg-4-re2',
            conversationId: 'conv-4',
            senderId: 'student-3',
            content: 'Hi all! Looking forward to it.',
            timestamp: '11:00 AM',
            isRead: true
        },
        {
            id: 'msg-4',
            conversationId: 'conv-4',
            senderId: 'student-1',
            content: 'Can someone explain question 4 from the practice test?',
            timestamp: '2:15 PM',
            isRead: false
        }
    ],
    'conv-5': [
        {
            id: 'msg-5',
            conversationId: 'conv-5',
            senderId: 'admin-1',
            content: 'Platform maintenance scheduled for this weekend. Please be aware the site might be down for an hour.',
            timestamp: 'Mon',
            isRead: true
        }
    ]
};

export default function TutorMessagesPage() {
    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-col">
            <ChatLayout
                currentUser={currentUser}
                initialConversations={mockConversations}
                initialMessages={mockMessages}
            />
        </div>
    );
}