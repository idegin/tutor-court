'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HiOutlineIdentification } from 'react-icons/hi2';

interface TutorOnboardingGateModalProps {
    open: boolean;
    onClose: () => void;
    featureLabel?: string;
}

export function TutorOnboardingGateModal({
    open,
    onClose,
    featureLabel = 'use this feature',
}: TutorOnboardingGateModalProps) {
    const router = useRouter();

    const handleComplete = () => {
        onClose();
        router.push('/tutor-onboarding');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader className="items-center text-center gap-3 pb-2">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-tutor-purple-50 border border-tutor-purple-100">
                        <HiOutlineIdentification className="w-7 h-7 text-tutor-purple-600" />
                    </div>
                    <DialogTitle className="text-lg font-semibold">
                        Complete Your Tutor Profile
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground text-center">
                        You need to finish setting up your tutor profile before you can{' '}
                        {featureLabel}. It only takes a few minutes and helps students find
                        and book your classes.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto cursor-pointer"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleComplete}
                        className="w-full sm:w-auto bg-tutor-purple-600 hover:bg-tutor-purple-700 text-white cursor-pointer"
                    >
                        Complete Profile Now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
