'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    HiOutlineMagnifyingGlass,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineNoSymbol,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineArrowTopRightOnSquare,
} from 'react-icons/hi2';
import { formatDistanceToNow } from 'date-fns';

export type UserRow = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountType: string;
    isActive: boolean;
    avatarUrl?: string;
    createdAt: string;
    slug?: string;
};

const ACCOUNT_TYPE_TABS = ['all', 'tutor', 'parent', 'student', 'admin'] as const;
type AccountTypeTab = typeof ACCOUNT_TYPE_TABS[number];

const TYPE_BADGE: Record<string, string> = {
    tutor: 'border-violet-300 bg-violet-50 text-violet-700',
    parent: 'border-blue-300 bg-blue-50 text-blue-700',
    student: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    admin: 'border-rose-300 bg-rose-50 text-rose-700',
};

type Props = {
    users: UserRow[];
    totalDocs: number;
    currentPage: number;
    totalPages: number;
    currentTab: AccountTypeTab;
    currentSearch: string;
};

export function UsersPageClient({
    users,
    totalDocs,
    currentPage,
    totalPages,
    currentTab,
    currentSearch,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [searchInput, setSearchInput] = useState(currentSearch);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    // Suspend dialog
    const [suspendUser, setSuspendUser] = useState<UserRow | null>(null);
    const [suspendReason, setSuspendReason] = useState('');
    // Unsuspend dialog
    const [unsuspendUser, setUnsuspendUser] = useState<UserRow | null>(null);

    useEffect(() => { setSearchInput(currentSearch); }, [currentSearch]);

    const updateUrl = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            for (const [key, value] of Object.entries(updates)) {
                if (!value) params.delete(key);
                else params.set(key, value);
            }
            startTransition(() => router.push(`${pathname}?${params.toString()}`));
        },
        [pathname, router, searchParams],
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateUrl({ search: searchInput || null, page: '1' });
    };

    const handleSuspendConfirm = async () => {
        if (!suspendUser) return;
        setActionLoading(suspendUser.id);
        setGlobalError(null);
        setSuspendUser(null);
        try {
            const res = await fetch(`/api/private/admin/users/${suspendUser.id}/suspend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspend: true, reason: suspendReason.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) { setGlobalError(data.error || 'Failed'); return; }
            router.refresh();
        } catch (e: any) {
            setGlobalError(e.message);
        } finally {
            setActionLoading(null);
            setSuspendReason('');
        }
    };

    const handleUnsuspendConfirm = async () => {
        if (!unsuspendUser) return;
        setActionLoading(unsuspendUser.id);
        setGlobalError(null);
        setUnsuspendUser(null);
        try {
            const res = await fetch(`/api/private/admin/users/${unsuspendUser.id}/suspend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspend: false }),
            });
            const data = await res.json();
            if (!res.ok) { setGlobalError(data.error || 'Failed'); return; }
            router.refresh();
        } catch (e: any) {
            setGlobalError(e.message);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Account type tabs */}
            <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
                {ACCOUNT_TYPE_TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => updateUrl({ tab: tab === 'all' ? null : tab, page: '1', search: null })}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                            currentTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'all' ? 'All Users' : tab.charAt(0).toUpperCase() + tab.slice(1) + 's'}
                    </button>
                ))}
            </div>

            {globalError && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                    {globalError}
                </div>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
                <div className="relative flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search by name or email…"
                        className="pl-9 h-10 shadow-none"
                    />
                </div>
                <Button type="submit" size="sm" variant="outline" className="shadow-none h-10" disabled={isPending}>
                    Search
                </Button>
                {currentSearch && (
                    <Button type="button" size="sm" variant="ghost" className="h-10 text-muted-foreground"
                        onClick={() => { setSearchInput(''); updateUrl({ search: null, page: '1' }); }}>
                        Clear
                    </Button>
                )}
            </form>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="font-semibold">User</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Joined</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                                    {currentSearch ? `No users match "${currentSearch}".` : 'No users found.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map(user => (
                                <TableRow key={user.id} className={actionLoading === user.id ? 'opacity-50 pointer-events-none' : ''}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-border shrink-0">
                                                <AvatarImage src={user.avatarUrl} />
                                                <AvatarFallback className="bg-muted text-xs font-bold">
                                                    {[user.firstName[0], user.lastName[0]].join('').toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate max-w-[160px]">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-xs font-medium shadow-none rounded-full ${TYPE_BADGE[user.accountType] || ''}`}>
                                            {user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <Badge variant="outline" className="text-xs font-medium shadow-none rounded-full border-emerald-300 bg-emerald-50 text-emerald-700">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs font-medium shadow-none rounded-full border-red-300 bg-red-50 text-red-700">
                                                Suspended
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {user.accountType === 'tutor' && user.slug && (
                                                <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                                    <a href={`/tutors/${user.slug}`} target="_blank" rel="noreferrer">
                                                        <HiOutlineArrowTopRightOnSquare className="h-3.5 w-3.5" />
                                                        <span className="sr-only">View profile</span>
                                                    </a>
                                                </Button>
                                            )}
                                            {user.isActive ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 shadow-none"
                                                    disabled={user.accountType === 'admin' || !!actionLoading}
                                                    onClick={() => { setSuspendReason(''); setSuspendUser(user); }}
                                                >
                                                    <HiOutlineNoSymbol className="mr-1 h-3.5 w-3.5" />
                                                    Suspend
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 shadow-none"
                                                    disabled={!!actionLoading}
                                                    onClick={() => setUnsuspendUser(user)}
                                                >
                                                    <HiOutlineCheckCircle className="mr-1 h-3.5 w-3.5" />
                                                    Unsuspend
                                                </Button>
                                            )}
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
                    <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages} · {totalDocs} total</p>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="shadow-none h-8" disabled={currentPage <= 1 || isPending}
                            onClick={() => updateUrl({ page: String(currentPage - 1) })}>
                            <HiOutlineChevronLeft className="h-4 w-4" /> Previous
                        </Button>
                        <Button variant="outline" size="sm" className="shadow-none h-8" disabled={currentPage >= totalPages || isPending}
                            onClick={() => updateUrl({ page: String(currentPage + 1) })}>
                            Next <HiOutlineChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Suspend AlertDialog */}
            <AlertDialog open={!!suspendUser} onOpenChange={open => !open && setSuspendUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <HiOutlineExclamationTriangle className="h-5 w-5 text-amber-500" />
                            Suspend {suspendUser?.firstName} {suspendUser?.lastName}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will immediately block their access to TutorCourt. They will be notified by email and will see a suspension message when they try to log in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-1.5 px-0 pb-2">
                        <label className="text-sm font-semibold">
                            Reason <span className="text-muted-foreground font-normal">(optional — sent in the email)</span>
                        </label>
                        <Textarea
                            value={suspendReason}
                            onChange={e => setSuspendReason(e.target.value)}
                            placeholder="e.g. Violation of community guidelines, fraudulent activity…"
                            rows={3}
                            className="shadow-none resize-none"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="shadow-none">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            onClick={handleSuspendConfirm}
                        >
                            Suspend Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Unsuspend AlertDialog */}
            <AlertDialog open={!!unsuspendUser} onOpenChange={open => !open && setUnsuspendUser(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Reinstate {unsuspendUser?.firstName} {unsuspendUser?.lastName}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will restore their full access to TutorCourt. They will receive an email confirming their account has been reinstated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="shadow-none">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={handleUnsuspendConfirm}
                        >
                            Reinstate Account
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
