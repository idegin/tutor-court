"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    HiOutlineCalendarDays,
    HiOutlineClock,
    HiOutlineBookOpen,
    HiOutlineChatBubbleLeftRight,
    HiOutlineMagnifyingGlass,
} from "react-icons/hi2";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const DAY_SHORT: Record<string, string> = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
};

const STATUS_STYLES: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    in_progress: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    completed: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    cancelled: "bg-muted text-muted-foreground border-border",
    refunded: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
};

function tutorDisplayName(tutor: any): string {
    if (!tutor || typeof tutor !== "object") return "Tutor";
    const u = tutor.user;
    const name = u && typeof u === "object" ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "";
    return name || tutor.headline || "Tutor";
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

export function MyBookingsList({
    bookings = [],
    role,
}: {
    bookings?: any[];
    role: "parent" | "student";
}) {
    const router = useRouter();
    const [loadingId, setLoadingId] = React.useState<string | null>(null);

    const cancelBooking = async (id: string) => {
        setLoadingId(id);
        try {
            const res = await fetch(`/api/private/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel" }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Something went wrong");
                return;
            }
            toast.success("Booking cancelled");
            router.refresh();
        } catch (err: any) {
            toast.error(err?.message || "Something went wrong");
        } finally {
            setLoadingId(null);
        }
    };

    if (bookings.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 text-center bg-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tutor-purple-50 text-tutor-purple-600">
                    <HiOutlineMagnifyingGlass className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">You haven&apos;t booked any tutors yet</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-md">
                    Browse our tutors and send a booking request to get started.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/tutors">Find a tutor</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {bookings.map((b: any) => {
                const tutor = b.tutor;
                const name = tutorDisplayName(tutor);
                const avatarUrl =
                    tutor && typeof tutor === "object" && typeof tutor.user === "object"
                        ? tutor.user?.avatar?.url
                        : undefined;
                const subjectNames: string[] = (b.subjects || [])
                    .map((s: any) => (typeof s === "object" ? s?.name : s))
                    .filter(Boolean);
                const sessions = countSessions(b.date, b.endDate, b.daysOfWeek || []);
                const canCancel = b.status === "pending" || b.status === "confirmed";

                return (
                    <Card key={b.id} className="flex flex-col border border-border bg-card shadow-sm rounded-2xl overflow-hidden py-0">
                        <div className="h-1.5 bg-gradient-to-r from-tutor-purple-500 to-tutor-purple-600" />
                        <CardContent className="flex flex-1 flex-col gap-4 p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-11 w-11 border border-border">
                                        <AvatarImage src={avatarUrl} alt={name} />
                                        <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                                            {initials(name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-bold text-foreground leading-tight">{name}</p>
                                        {tutor?.headline && (
                                            <p className="text-xs text-muted-foreground line-clamp-1">{tutor.headline}</p>
                                        )}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={`shrink-0 font-medium border ${STATUS_STYLES[b.status] || "bg-muted text-muted-foreground border-border"}`}
                                >
                                    {STATUS_LABEL[b.status] || b.status}
                                </Badge>
                            </div>

                            {subjectNames.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <HiOutlineBookOpen className="h-4 w-4 text-tutor-purple-500" />
                                    {subjectNames.map((s, i) => (
                                        <span key={i} className="inline-flex items-center rounded-full bg-tutor-purple-50 px-2 py-0.5 text-[11px] font-semibold text-tutor-purple-700">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1.5 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <HiOutlineCalendarDays className="h-4 w-4 shrink-0 text-tutor-purple-500" />
                                    <span>
                                        {b.date ? format(new Date(b.date), "MMM d, yyyy") : "—"}
                                        {b.endDate ? ` – ${format(new Date(b.endDate), "MMM d, yyyy")}` : ""}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <HiOutlineClock className="h-4 w-4 shrink-0 text-tutor-purple-500" />
                                    <span>
                                        {(b.daysOfWeek || []).map((d: string) => DAY_SHORT[d] || d).join(", ") || "—"} · {b.hoursPerDay}h/day · {sessions} session{sessions !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>

                            {b.message && (
                                <div className="flex items-start gap-1.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                                    <HiOutlineChatBubbleLeftRight className="mt-0.5 h-4 w-4 shrink-0 text-tutor-purple-500" />
                                    <span className="line-clamp-3">{b.message}</span>
                                </div>
                            )}

                            <div className="mt-auto flex items-center justify-between border-t pt-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</p>
                                    <p className="text-lg font-black text-foreground">{formatNaira(b.price || 0)}</p>
                                </div>
                                {canCancel && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-border text-destructive hover:bg-destructive/10"
                                                disabled={loadingId === b.id}
                                            >
                                                Cancel booking
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will cancel your booking with {name}. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Keep booking</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-white hover:bg-destructive/90"
                                                    onClick={() => cancelBooking(b.id)}
                                                >
                                                    Cancel booking
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
