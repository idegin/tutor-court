'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    HiOutlineCheckBadge,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
} from 'react-icons/hi2';

type TutorDetailData = {
    id: string;
    name: string;
    isApproved: boolean;
    isVerified: boolean;
    onboardingCompleted: boolean;
};

export function TutorAdminDetailClient({ data }: { data: TutorDetailData }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const post = async (url: string, body: object) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const d = await res.json();
            throw new Error(d.error || 'Request failed');
        }
        return res.json();
    };

    const handleVerify = async () => {
        setLoading('verify');
        try {
            await post(`/api/private/admin/tutors/${data.id}/verify`, { verified: !data.isVerified });
            router.refresh();
        } catch (e: any) {
            console.error(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleApprove = async () => {
        setLoading('approve');
        try {
            await post(`/api/private/admin/tutors/${data.id}/approve`, { approved: true });
            router.refresh();
        } catch (e: any) {
            console.error(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleRejectConfirm = async () => {
        setLoading('reject');
        setRejectOpen(false);
        try {
            await post(`/api/private/admin/tutors/${data.id}/approve`, {
                approved: false,
                rejectionReason: rejectReason,
                revoke: data.isApproved,
            });
            router.refresh();
        } catch (e: any) {
            console.error(e.message);
        } finally {
            setLoading(null);
            setRejectReason('');
        }
    };

    return (
        <>
            <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <span className="text-sm font-semibold text-foreground self-center mr-2">Admin actions</span>

                {/* Verify toggle */}
                <Button
                    size="sm"
                    variant="outline"
                    disabled={loading !== null}
                    onClick={handleVerify}
                    className={
                        data.isVerified
                            ? 'h-8 text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 shadow-none'
                            : 'h-8 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 shadow-none'
                    }
                >
                    <HiOutlineCheckBadge className="mr-1 h-3.5 w-3.5" />
                    {loading === 'verify' ? '…' : data.isVerified ? 'Remove verification' : 'Mark as verified'}
                </Button>

                {/* Approve (only when not yet approved and onboarding done) */}
                {data.onboardingCompleted && !data.isApproved && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={handleApprove}
                        className="h-8 text-xs font-semibold text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-none"
                    >
                        <HiOutlineCheckCircle className="mr-1 h-3.5 w-3.5" />
                        {loading === 'approve' ? '…' : 'Approve'}
                    </Button>
                )}

                {/* Reject / Revoke */}
                {(data.isApproved || (data.onboardingCompleted && !data.isApproved)) && (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={() => { setRejectReason(''); setRejectOpen(true); }}
                        className="h-8 text-xs font-semibold text-red-700 border-red-300 bg-red-50 hover:bg-red-100 shadow-none"
                    >
                        <HiOutlineXCircle className="mr-1 h-3.5 w-3.5" />
                        {loading === 'reject' ? '…' : data.isApproved ? 'Revoke approval' : 'Reject'}
                    </Button>
                )}
            </div>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{data.isApproved ? 'Revoke Approval' : 'Reject Application'}</DialogTitle>
                        <DialogDescription>
                            {data.isApproved
                                ? `This will revoke ${data.name}'s approved status and notify them by email.`
                                : `This will reject ${data.name}'s application and notify them by email.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-semibold">
                            Reason <span className="text-muted-foreground font-normal">(optional — included in the email)</span>
                        </label>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Missing certifications, incomplete bio…"
                            rows={4}
                            className="shadow-none resize-none"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setRejectOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="font-bold" onClick={handleRejectConfirm}>
                            {data.isApproved ? 'Revoke Approval' : 'Reject Application'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
