'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineMagnifyingGlass,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { formatDistanceToNow } from 'date-fns';

export type TutorRow = {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    subjects: string[];
    isApproved: boolean;
    onboardingCompleted: boolean;
    createdAt: string;
    slug: string;
};

type Tab = 'all' | 'pending';

type Props = {
    tutors: TutorRow[];
    totalDocs: number;
    currentPage: number;
    totalPages: number;
    currentTab: Tab;
    currentSearch: string;
    pendingCount: number;
};

export function TutorsPageClient({
    tutors,
    totalDocs,
    currentPage,
    totalPages,
    currentTab,
    currentSearch,
    pendingCount,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [searchInput, setSearchInput] = useState(currentSearch);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        setSearchInput(currentSearch);
    }, [currentSearch]);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [rejectTutor, setRejectTutor] = useState<TutorRow | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const updateUrl = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (value === null || value === '') {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            }
            startTransition(() => {
                router.push(`${pathname}?${params.toString()}`);
            });
        },
        [pathname, router, searchParams],
    );

    const handleTabChange = (tab: Tab) => {
        updateUrl({ tab, page: '1', search: null });
        setSearchInput('');
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateUrl({ search: searchInput || null, page: '1' });
    };

    const handleApprove = async (tutor: TutorRow) => {
        setActionLoading(tutor.id);
        try {
            const res = await fetch(`/api/private/admin/tutors/${tutor.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved: true }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to approve');
            }
            router.refresh();
        } catch (err: any) {
            console.error('[approve]', err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectOpen = (tutor: TutorRow) => {
        setRejectTutor(tutor);
        setRejectReason('');
        setRejectDialogOpen(true);
    };

    const handleRejectConfirm = async () => {
        if (!rejectTutor) return;
        setActionLoading(rejectTutor.id);
        setRejectDialogOpen(false);
        try {
            const res = await fetch(`/api/private/admin/tutors/${rejectTutor.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved: false,
                    rejectionReason: rejectReason,
                    revoke: rejectTutor.isApproved,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject');
            }
            router.refresh();
        } catch (err: any) {
            console.error('[reject]', err.message);
        } finally {
            setActionLoading(null);
            setRejectTutor(null);
        }
    };

    const statusBadge = (tutor: TutorRow) => {
        if (tutor.isApproved) {
            return (
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 font-medium shadow-none rounded-full text-xs">
                    Approved
                </Badge>
            );
        }
        if (tutor.onboardingCompleted) {
            return (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 font-medium shadow-none rounded-full text-xs">
                    Pending Review
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-border bg-muted text-muted-foreground font-medium shadow-none rounded-full text-xs">
                Onboarding
            </Badge>
        );
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                <button
                    onClick={() => handleTabChange('all')}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        currentTab === 'all'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    All Tutors
                    <span className="ml-1.5 text-xs text-muted-foreground">({totalDocs})</span>
                </button>
                <button
                    onClick={() => handleTabChange('pending')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                        currentTab === 'pending'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                >
                    Pending Applications
                    {pendingCount > 0 && (
                        <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {currentTab === 'pending' && pendingCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-medium">
                    {pendingCount} tutor{pendingCount !== 1 ? 's' : ''} awaiting review — approve or reject each application below.
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search by name…"
                        className="pl-9 h-10 shadow-none"
                    />
                </div>
                <Button type="submit" size="sm" variant="outline" className="shadow-none h-10" disabled={isPending}>
                    Search
                </Button>
                {currentSearch && (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10 text-muted-foreground"
                        onClick={() => {
                            setSearchInput('');
                            updateUrl({ search: null, page: '1' });
                        }}
                    >
                        Clear
                    </Button>
                )}
            </form>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="font-semibold">Tutor</TableHead>
                            <TableHead className="font-semibold">Subjects</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Joined</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tutors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    {currentSearch
                                        ? `No tutors found for "${currentSearch}".`
                                        : currentTab === 'pending'
                                        ? 'No pending applications right now.'
                                        : 'No tutors have joined yet.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            tutors.map((tutor) => (
                                <TableRow key={tutor.id} className={actionLoading === tutor.id ? 'opacity-50 pointer-events-none' : ''}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border shrink-0">
                                                <AvatarImage src={tutor.avatarUrl} />
                                                <AvatarFallback className="bg-muted text-xs font-bold">
                                                    {tutor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate max-w-[160px]">{tutor.name}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{tutor.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {tutor.subjects.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {tutor.subjects.slice(0, 2).map((s) => (
                                                    <Badge key={s} variant="outline" className="text-[11px] font-normal shadow-none rounded-md">
                                                        {s}
                                                    </Badge>
                                                ))}
                                                {tutor.subjects.length > 2 && (
                                                    <Badge variant="outline" className="text-[11px] font-normal shadow-none rounded-md text-muted-foreground">
                                                        +{tutor.subjects.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>{statusBadge(tutor)}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(tutor.createdAt), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {tutor.onboardingCompleted && !tutor.isApproved && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 shadow-none"
                                                        onClick={() => handleApprove(tutor)}
                                                        disabled={actionLoading === tutor.id}
                                                    >
                                                        <HiOutlineCheckCircle className="mr-1 h-3.5 w-3.5" />
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-semibold text-red-700 border-red-300 bg-red-50 hover:bg-red-100 shadow-none"
                                                        onClick={() => handleRejectOpen(tutor)}
                                                        disabled={actionLoading === tutor.id}
                                                    >
                                                        <HiOutlineXCircle className="mr-1 h-3.5 w-3.5" />
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {tutor.isApproved && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-semibold text-red-700 border-red-300 bg-red-50 hover:bg-red-100 shadow-none"
                                                    onClick={() => handleRejectOpen(tutor)}
                                                    disabled={actionLoading === tutor.id}
                                                >
                                                    <HiOutlineXCircle className="mr-1 h-3.5 w-3.5" />
                                                    Revoke
                                                </Button>
                                            )}
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                            >
                                                <Link href={`/tutors/${tutor.slug}`} target="_blank">
                                                    <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5" />
                                                    <span className="sr-only">View profile</span>
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="shadow-none h-8"
                            disabled={currentPage <= 1 || isPending}
                            onClick={() => updateUrl({ page: String(currentPage - 1) })}
                        >
                            <HiOutlineChevronLeft className="h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shadow-none h-8"
                            disabled={currentPage >= totalPages || isPending}
                            onClick={() => updateUrl({ page: String(currentPage + 1) })}
                        >
                            Next
                            <HiOutlineChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Reject/Revoke Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {rejectTutor?.isApproved ? 'Revoke Approval' : 'Reject Application'}
                        </DialogTitle>
                        <DialogDescription>
                            {rejectTutor?.isApproved
                                ? `This will revoke ${rejectTutor.name}'s approved status and send them back to onboarding. They will be notified by email.`
                                : `This will reject ${rejectTutor?.name}'s application and send them back to onboarding. They will be notified by email.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-sm font-semibold">
                            Reason <span className="text-muted-foreground font-normal">(optional — included in the email)</span>
                        </label>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Missing teaching certifications, incomplete bio, profile photo quality…"
                            rows={4}
                            className="shadow-none resize-none"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            className="shadow-none"
                            onClick={() => setRejectDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="font-bold"
                            onClick={handleRejectConfirm}
                        >
                            {rejectTutor?.isApproved ? 'Revoke Approval' : 'Reject Application'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
