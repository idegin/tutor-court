'use client';

import React, { useState, useEffect } from 'react';
import { Conversation, Message, ChatUser } from './chat-types';
import { ChatSidebar } from './chat-sidebar';
import { ChatArea } from './chat-area';
import { ChatInfo } from './chat-info';

interface ChatLayoutProps {
    currentUser: ChatUser;
    initialConversations?: Conversation[];
    initialMessages?: Record<string, Message[]>;
}

export function ChatLayout({ currentUser, initialConversations = [], initialMessages = {} }: ChatLayoutProps) {
    const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
    const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(initialMessages);
    const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
    
    // UI state
    const [showSidebar, setShowSidebar] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Simple mock loading state
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setMounted(true);
        // Simulate loading delay for the skeleton
        const timer = setTimeout(() => {
            setIsLoading(false);
            if (initialConversations.length > 0) {
                setActiveConversationId(initialConversations[0].id);
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, [initialConversations]);

    const handleSelectConversation = (id: string) => {
        setActiveConversationId(id);
        setShowSidebar(false);
    };

    const handleToggleSidebar = () => setShowSidebar(!showSidebar);
    const handleToggleInfo = () => setShowInfo(!showInfo);
    const handleCloseInfo = () => setShowInfo(false);

    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const activeMessages = activeConversationId ? (messagesMap[activeConversationId] || []) : [];

    // Ensure hydratation consistency
    if (!mounted) return null;

    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-background overflow-hidden relative border-t border-border">
            {/* Sidebar Column */}
            <div className={`
                ${showSidebar ? 'flex' : 'hidden'} 
                md:flex flex-col h-full w-full md:w-80 lg:w-96 shrink-0 z-20 absolute md:relative bg-background transition-all
            `}>
                <ChatSidebar 
                    conversations={conversations}
                    activeConversationId={activeConversationId}
                    onSelectConversation={handleSelectConversation}
                    isLoading={isLoading}
                    onCloseMobile={() => setShowSidebar(false)}
                />
            </div>

            {/* Main Chat Area Column */}
            <div className={`
                flex-1 h-full min-w-0 transition-all 
                ${showSidebar ? 'hidden md:flex' : 'flex'}
            `}>
                <ChatArea 
                    conversation={activeConversation}
                    messages={activeMessages}
                    currentUser={currentUser}
                    onToggleSidebar={handleToggleSidebar}
                    onToggleInfo={handleToggleInfo}
                    isLoading={isLoading}
                />
            </div>

            {/* Info Column */}
            {activeConversation && showInfo && (
                <div className="hidden lg:flex flex-col h-full w-80 shrink-0 border-l border-border bg-background transition-all">
                    <ChatInfo 
                        conversation={activeConversation}
                        currentUser={currentUser}
                        onClose={handleCloseInfo}
                        isLoading={isLoading}
                    />
                </div>
            )}
            
            {/* Mobile Info Overlay */}
            {activeConversation && showInfo && (
                <div className="lg:hidden absolute inset-0 z-30 flex justify-end bg-background/80 backdrop-blur-sm">
                    <div className="w-full sm:w-80 h-full bg-background border-l border-border shadow-none">
                        <ChatInfo 
                            conversation={activeConversation}
                            currentUser={currentUser}
                            onClose={handleCloseInfo}
                            isLoading={isLoading}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
