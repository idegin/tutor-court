'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    HiOutlineTrash,
    HiOutlineExclamationTriangle,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineUsers,
} from 'react-icons/hi2';
import { format } from 'date-fns';

const STATUS_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<string, string> = {
    scheduled: 'border-blue-300 bg-blue-50 text-blue-700',
    active: 'border-emerald-300 bg-emerald-50 text-emerald-700',
    completed: 'border-border bg-muted text-muted-foreground',
    cancelled: 'border-red-300 bg-red-50 text-red-700',
};

export type ClassRow = {
    id: string;
    title: string;
    tutorName: string;
    tutorEmail: string;
    subject: string;
    classType: string;
    status: string;
    studentCount: number;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
};

type Props = {
    classes: ClassRow[];
    totalDocs: number;
    currentPage: number;
    totalPages: number;
    currentStatus: string;
};

export function ClassesAdminClient({ classes, totalDocs, currentPage, totalPages, currentStatus }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [deleteClass, setDeleteClass] = useState<ClassRow | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);

    const updateUrl = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        for (const [key, val] of Object.entries(updates)) {
            if (!val) params.delete(key);
            else params.set(key, val);
        }
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
    };

    const handleDelete = async () => {
        if (!deleteClass) return;
        setLoading('delete-' + deleteClass.id);
        setGlobalError(null);
        try {
            const res = await fetch(`/api/private/admin/classes/${deleteClass.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) {
                setGlobalError(data.error || 'Delete failed');
                setDeleteClass(null);
                return;
            }
            setDeleteClass(null);
            router.refresh();
        } catch (e: any) {
            setGlobalError(e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Status filter tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                {STATUS_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => updateUrl({ status: opt.value || null, page: '1' })}
                        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                            currentStatus === opt.value
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>

            {globalError && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <HiOutlineExclamationTriangle className="h-4 w-4 shrink-0" />
                    {globalError}
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent bg-muted/30">
                            <TableHead className="font-semibold">Class</TableHead>
                            <TableHead className="font-semibold">Tutor</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Students</TableHead>
                            <TableHead className="font-semibold">Start</TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                                    No classes found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map(cls => (
                                <TableRow key={cls.id} className={loading === 'delete-' + cls.id ? 'opacity-50 pointer-events-none' : ''}>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm font-semibold">{cls.title}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{cls.classType.replace('-', ' ')}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm font-medium">{cls.tutorName}</p>
                                            <p className="text-xs text-muted-foreground">{cls.tutorEmail}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-xs font-medium shadow-none rounded-full ${STATUS_STYLES[cls.status] || ''}`}>
                                            {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <HiOutlineUsers className="h-3.5 w-3.5" />
                                            {cls.studentCount}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {cls.startDate ? format(new Date(cls.startDate), 'dd MMM yyyy') : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                            onClick={() => setDeleteClass(cls)}
                                            disabled={!!loading}
                                        >
                                            <HiOutlineTrash className="h-3.5 w-3.5" />
                                            <span className="sr-only">Delete</span>
                                        </Button>
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
                        Page {currentPage} of {totalPages} · {totalDocs} total
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

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteClass} onOpenChange={open => !open && setDeleteClass(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <HiOutlineExclamationTriangle className="h-5 w-5 text-red-500" />
                            Delete Class
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{deleteClass?.title}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                        This action is permanent and will remove the class and all associated data. Active classes with enrolled students should be cancelled first.
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="shadow-none" onClick={() => setDeleteClass(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="font-bold"
                            disabled={!!loading}
                            onClick={handleDelete}
                        >
                            {loading ? 'Deleting…' : 'Delete Class'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
