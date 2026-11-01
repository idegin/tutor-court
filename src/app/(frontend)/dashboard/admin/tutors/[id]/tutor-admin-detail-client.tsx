'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    HiOutlineSparkles,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';

type TutorDetailData = {
    id: string;
    name: string;
    email: string;
    isApproved: boolean;
    isVerified: boolean;
    onboardingCompleted: boolean;
};

export function TutorAdminDetailClient({ data }: { data: TutorDetailData }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reject / Revoke dialog
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Credit dialog
    const [creditOpen, setCreditOpen] = useState(false);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNote, setCreditNote] = useState('');

    // Verify warning dialog
    const [verifyOpen, setVerifyOpen] = useState(false);

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

    const handleVerifyConfirm = async () => {
        setVerifyOpen(false);
        setLoading('verify');
        setError(null);
        try {
            await post(`/api/private/admin/tutors/${data.id}/verify`, { verified: !data.isVerified });
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleApprove = async () => {
        setLoading('approve');
        setError(null);
        try {
            await post(`/api/private/admin/tutors/${data.id}/approve`, { approved: true });
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const handleRejectConfirm = async () => {
        setLoading('reject');
        setRejectOpen(false);
        setError(null);
        try {
            await post(`/api/private/admin/tutors/${data.id}/approve`, {
                approved: false,
                rejectionReason: rejectReason,
                revoke: data.isApproved,
            });
            router.refresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
            setRejectReason('');
        }
    };

    const handleCreditConfirm = async () => {
        const amount = parseFloat(creditAmount);
        if (!amount || amount <= 0) return;
        setLoading('credit');
        setCreditOpen(false);
        setError(null);
        try {
            await post(`/api/private/admin/tutors/${data.id}/credit`, {
                amount,
                note: creditNote.trim() || undefined,
            });
            router.refresh();
            setCreditAmount('');
            setCreditNote('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Admin actions</span>

                <div className="flex flex-wrap gap-2">
                    {/* Verify toggle — requires explicit confirmation */}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={() => setVerifyOpen(true)}
                        className={
                            data.isVerified
                                ? 'h-8 text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 shadow-none'
                                : 'h-8 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 shadow-none'
                        }
                    >
                        <HiOutlineCheckBadge className="mr-1 h-3.5 w-3.5" />
                        {loading === 'verify' ? '…' : data.isVerified ? 'Remove verification' : 'Mark as verified'}
                    </Button>

                    {/* Give Credit */}
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={loading !== null}
                        onClick={() => setCreditOpen(true)}
                        className="h-8 text-xs font-semibold text-violet-700 border-violet-300 bg-violet-50 hover:bg-violet-100 shadow-none"
                    >
                        <HiOutlineSparkles className="mr-1 h-3.5 w-3.5" />
                        {loading === 'credit' ? '…' : 'Give credits'}
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

                {error && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <HiOutlineExclamationTriangle className="h-3.5 w-3.5 shrink-0" />
                        {error}
                    </p>
                )}
            </div>

            {/* Verify warning dialog */}
            <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HiOutlineExclamationTriangle className="h-5 w-5 text-amber-500" />
                            {data.isVerified ? 'Remove Verification' : 'Verify Tutor'}
                        </DialogTitle>
                        <DialogDescription>
                            {data.isVerified
                                ? `This will remove the Verified badge from ${data.name}'s profile. They will be notified by email.`
                                : `This will grant ${data.name} a Verified badge on their public profile. Only verify tutors who have completed identity checks or meet your verification standards.`}
                        </DialogDescription>
                    </DialogHeader>
                    {!data.isVerified && (
                        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                            <strong>Before verifying:</strong> Ensure you have reviewed this tutor&apos;s identity, qualifications, and background.
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setVerifyOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleVerifyConfirm}
                            className={data.isVerified
                                ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'}
                        >
                            {data.isVerified ? 'Remove Verification' : 'Confirm Verification'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject / Revoke dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HiOutlineExclamationTriangle className="h-5 w-5 text-red-500" />
                            {data.isApproved ? 'Revoke Approval' : 'Reject Application'}
                        </DialogTitle>
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

            {/* Give Credits dialog */}
            <Dialog open={creditOpen} onOpenChange={setCreditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HiOutlineSparkles className="h-5 w-5 text-violet-500" />
                            Give Credits to {data.name}
                        </DialogTitle>
                        <DialogDescription>
                            Credits will be added to this tutor&apos;s wallet and they will receive an email notification.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Credit amount</label>
                            <Input
                                type="number"
                                min="1"
                                step="1"
                                value={creditAmount}
                                onChange={(e) => setCreditAmount(e.target.value)}
                                placeholder="e.g. 500"
                                className="shadow-none"
                            />
                            <p className="text-xs text-muted-foreground">Enter the number of credits to add.</p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">
                                Note <span className="text-muted-foreground font-normal">(optional — included in email)</span>
                            </label>
                            <Textarea
                                value={creditNote}
                                onChange={(e) => setCreditNote(e.target.value)}
                                placeholder="e.g. Thank you for your continued contribution to our platform!"
                                rows={3}
                                className="shadow-none resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setCreditOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                            onClick={handleCreditConfirm}
                            className="bg-violet-600 hover:bg-violet-700 text-white font-bold"
                        >
                            Give {creditAmount ? parseInt(creditAmount).toLocaleString() : '—'} Credits
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
