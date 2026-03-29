'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { HiOutlineDocumentDuplicate, HiCheck, HiUserPlus } from 'react-icons/hi2';

interface InviteParentProps {
    tutorId: string;
}

export function InviteParent({ tutorId }: InviteParentProps) {
    const [copied, setCopied] = React.useState(false);
    const [hostUrl, setHostUrl] = React.useState('');

    React.useEffect(() => {
        setHostUrl(window.location.origin);
    }, []);

    const inviteUrl = `${hostUrl}/invitation/tutor/${tutorId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button 
                    className="bg-tutor-purple-600 hover:bg-tutor-purple-700 text-tutor-purple-50 border-0 shadow-none font-medium flex items-center gap-2 h-9 px-4 rounded-md transition-colors"
                >
                    <HiUserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">Invite Parent</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-border shadow-none bg-background">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">Invite a Parent</DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-2">
                        Share this link with parents. They can click the link to connect securely with your profile.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-4 relative">
                    <Input
                        readOnly
                        value={hostUrl ? inviteUrl : ''}
                        className="flex-1 bg-muted/50 border-input text-foreground pr-12 focus-visible:ring-tutor-purple-500 shadow-none"
                    />
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80 shadow-none"
                        onClick={copyToClipboard}
                    >
                        {copied ? <HiCheck className="h-4 w-4 text-tutor-purple-600" /> : <HiOutlineDocumentDuplicate className="h-4 w-4" />}
                        <span className="sr-only">Copy</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
