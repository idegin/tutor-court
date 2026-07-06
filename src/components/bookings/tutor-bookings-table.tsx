"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    HiOutlineMagnifyingGlass as Search,
    HiOutlineUser as User,
    HiOutlineAcademicCap as GraduationCap,
    HiOutlineCalendarDays as CalendarDays,
    HiOutlineClock as Clock,
    HiOutlineCheck as Check,
    HiOutlineXMark as XMark,
} from "react-icons/hi2";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatNaira } from "@/lib/constants";
import { countSessions } from "@/lib/booking-pricing";

// Booking dates are day-only, stored at UTC midnight — format in UTC so the day
// never shifts for viewers west of UTC.
const fmtUTCDate = (iso: string, withYear = true) =>
    new Date(iso).toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "short",
        day: "numeric",
        ...(withYear ? { year: "numeric" as const } : {}),
    });

const DAY_SHORT: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
};

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
];

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400",
    confirmed: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400",
    in_progress: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400",
    completed: "bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 dark:text-blue-400",
    cancelled: "bg-muted text-muted-foreground hover:bg-muted/80",
    refunded: "bg-muted text-muted-foreground hover:bg-muted/80",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
};

function fullName(u: any): string {
    if (!u) return "Unknown";
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || u.email || "Unknown";
}

function initials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export function TutorBookingsTable({ bookings = [] }: { bookings?: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [typeFilter, setTypeFilter] = React.useState("all");
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    const rows = React.useMemo(() => {
        return bookings.map((b: any) => {
            const student = typeof b.student === "object" ? b.student : null;
            const parent = typeof b.parent === "object" ? b.parent : null;
            const bookerUser = student || parent;
            const bookerName = fullName(bookerUser);
            const bookedByParent = Boolean(b.parent);
            const subjectNames: string[] = (b.subjects || [])
                .map((s: any) => (typeof s === "object" ? s?.name : s))
                .filter(Boolean);
            const sessions = countSessions(b.date, b.endDate, b.daysOfWeek || []);
            const type = bookedByParent ? "parent" : "student";
            return {
                raw: b,
                id: b.id,
                bookerName,
                bookerEmail: bookerUser?.email || "",
                avatarUrl: bookerUser?.avatar?.url || undefined,
                bookedByParent,
                type,
                subjectNames,
                sessions,
                status: b.status,
            };
        });
    }, [bookings]);

    const filteredData = rows.filter((item) => {
        const haystack = `${item.bookerName} ${item.bookerEmail} ${item.subjectNames.join(" ")}`.toLowerCase();
        const matchesSearch = haystack.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        return matchesSearch && matchesStatus && matchesType;
    });

    const runAction = async (id: string, action: "accept" | "decline") => {
        setLoadingId(id);
        try {
            const res = await fetch(`/api/private/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Something went wrong");
                return;
            }
            toast.success(action === "accept" ? "Booking accepted" : "Booking declined");
            router.refresh();
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Your Bookings</h2>
                <p className="text-muted-foreground">Review and respond to booking requests from students and parents.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 mt-8 w-full justify-between items-start md:items-center">
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search bookers or subjects..."
                        className="pl-9 bg-background border-border shadow-none focus-visible:ring-muted-foreground font-medium h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-[130px] border-border shadow-none h-10 bg-background text-foreground">
                            <SelectValue placeholder="Booker" />
                        </SelectTrigger>
                        <SelectContent className="shadow-none border-border">
                            <SelectItem value="all">All Bookers</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[160px] border-border shadow-none h-10 bg-background text-foreground">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="shadow-none border-border">
                            {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card className="shadow-none border border-border rounded-xl overflow-hidden bg-card flex-1 py-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 hover:bg-muted/50">
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="font-medium text-muted-foreground h-12">Booker</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12 w-[220px]">Subjects</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12">Schedule</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12">Price</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12 w-[110px]">Status</TableHead>
                                <TableHead className="text-right font-medium text-muted-foreground h-12 w-[200px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        {rows.length === 0
                                            ? "You don't have any booking requests yet."
                                            : "No bookings match your search or filters."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((booking) => (
                                    <TableRow key={booking.id} className="border-b border-border hover:bg-muted/30 transition-colors group align-top">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-border">
                                                    <AvatarImage src={booking.avatarUrl} alt={booking.bookerName} />
                                                    <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                                                        {initials(booking.bookerName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-[150px] max-w-[220px]">
                                                    <span className="font-medium text-foreground truncate">{booking.bookerName}</span>
                                                    {booking.bookerEmail && (
                                                        <span className="text-xs text-muted-foreground truncate">{booking.bookerEmail}</span>
                                                    )}
                                                    <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        {booking.bookedByParent ? (
                                                            <>
                                                                <User className="h-3 w-3 text-purple-500" /> Booked by parent
                                                            </>
                                                        ) : (
                                                            <>
                                                                <GraduationCap className="h-3 w-3 text-blue-500" /> Student
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-wrap gap-1.5 max-w-[220px]">
                                                {booking.subjectNames.length === 0 ? (
                                                    <span className="text-sm text-muted-foreground">—</span>
                                                ) : (
                                                    booking.subjectNames.map((name: string, i: number) => (
                                                        <span key={i} className="inline-flex items-center rounded-full bg-tutor-purple-50 px-2 py-0.5 text-[11px] font-semibold text-tutor-purple-700">
                                                            {name}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col gap-1 text-sm">
                                                <div className="flex items-center gap-1.5 text-foreground/80">
                                                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>
                                                        {booking.raw.date ? fmtUTCDate(booking.raw.date, false) : "—"}
                                                        {booking.raw.endDate ? ` – ${fmtUTCDate(booking.raw.endDate)}` : ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    <span>
                                                        {(booking.raw.daysOfWeek || []).map((d: string) => DAY_SHORT[d] || d).join(", ") || "—"} · {booking.raw.hoursPerDay}h/day
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{booking.sessions} session{booking.sessions !== 1 ? "s" : ""}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="font-semibold text-foreground">{formatNaira(booking.raw.price || 0)}</span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium shadow-none px-2.5 py-0.5 rounded-full ${STATUS_STYLES[booking.status] || "bg-muted text-muted-foreground"}`}
                                            >
                                                {STATUS_LABEL[booking.status] || booking.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            {booking.status === "pending" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
                                                        disabled={loadingId === booking.id}
                                                        onClick={() => runAction(booking.id, "accept")}
                                                    >
                                                        <Check className="h-4 w-4" /> Accept
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 border-border text-destructive hover:bg-destructive/10 shadow-none"
                                                                disabled={loadingId === booking.id}
                                                            >
                                                                <XMark className="h-4 w-4" /> Decline
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Decline this booking?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will notify {booking.bookerName} that you can&apos;t take this booking. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Keep</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-white hover:bg-destructive/90"
                                                                    onClick={() => runAction(booking.id, "decline")}
                                                                >
                                                                    Decline booking
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">No actions</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                <div>
                    Showing <span className="font-medium text-foreground">{filteredData.length}</span> of <span className="font-medium text-foreground">{rows.length}</span> bookings
                </div>
            </div>
        </div>
    );
}
