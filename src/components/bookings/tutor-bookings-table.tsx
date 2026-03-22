"use client";

import * as React from "react";
import { format } from "date-fns";
import {
    HiOutlineMagnifyingGlass as Search,
    HiOutlineFunnel as Filter,
    HiOutlineEllipsisHorizontal as MoreHorizontal,
    HiOutlineUser as User,
    HiOutlineAcademicCap as GraduationCap,
    HiOutlineCalendarDays as CalendarDays,
    HiOutlineClock as Clock,
    HiOutlinePlayCircle as PlayCircle
} from "react-icons/hi2";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Mock Data
const data = [
    {
        id: "BKG-7829",
        class: "A-Level Mathematics (Pure)",
        type: "student",
        user: {
            name: "Olivia Chen",
            email: "olivia.c@example.com",
            avatar: "https://i.pravatar.cc/150?u=olivia",
            intro: "Year 12 Science student prepping for University.",
        },
        startDate: new Date("2024-04-15"),
        hoursPerDay: 2,
        weeks: 12,
        status: "active",
    },
    {
        id: "BKG-3412",
        class: "GCSE Science Prep",
        type: "parent",
        user: {
            name: "Marcus Johnson",
            email: "marcus.j@example.com",
            avatar: "https://i.pravatar.cc/150?u=marcus",
            intro: "Booking for my son Leo in Year 10.",
        },
        startDate: new Date("2024-04-18"),
        hoursPerDay: 1.5,
        weeks: 8,
        status: "upcoming",
    },
    {
        id: "BKG-9011",
        class: "11+ Entrance Exams",
        type: "parent",
        user: {
            name: "Sarah Williams",
            email: "sarah.w@example.com",
            avatar: "https://i.pravatar.cc/150?u=sarah",
            intro: "Daughter preparing for grammar school entry.",
        },
        startDate: new Date("2024-03-01"),
        hoursPerDay: 1,
        weeks: 24,
        status: "active",
    },
    {
        id: "BKG-1123",
        class: "University Physics Tutoring",
        type: "student",
        user: {
            name: "David Kim",
            email: "david.k@example.com",
            avatar: "https://i.pravatar.cc/150?u=david",
            intro: "Undergrad struggling with Quantum Mechanics.",
        },
        startDate: new Date("2024-05-02"),
        hoursPerDay: 3,
        weeks: 4,
        status: "upcoming",
    },
    {
        id: "BKG-5542",
        class: "French A-Level Conservational",
        type: "student",
        user: {
            name: "Emma Watson",
            email: "emma.w@example.com",
            avatar: "https://i.pravatar.cc/150?u=emma",
            intro: "Need brushing up on spoken French before exams.",
        },
        startDate: new Date("2023-11-10"),
        hoursPerDay: 1,
        weeks: 16,
        status: "completed",
    }
];

export function TutorBookingsTable() {
    const [searchTerm, setSearchTerm] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [typeFilter, setTypeFilter] = React.useState("all");

    const filteredData = data.filter((item) => {
        const matchesSearch = item.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.class.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesType = typeFilter === "all" || item.type === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">Your Bookings</h2>
                <p className="text-muted-foreground">Manage your active and upcoming class sessions.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 mt-8 w-full justify-between items-start md:items-center">
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search classes or users..."
                        className="pl-9 bg-background border-border shadow-none focus-visible:ring-muted-foreground font-medium h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full md:w-[130px] border-border shadow-none h-10 bg-background text-foreground">
                            <SelectValue placeholder="User Type" />
                        </SelectTrigger>
                        <SelectContent className="shadow-none border-border">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[150px] border-border shadow-none h-10 bg-background text-foreground">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="shadow-none border-border">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 border-border shadow-none bg-background text-muted-foreground">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="shadow-none border border-border rounded-xl overflow-hidden bg-card flex-1">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50 hover:bg-muted/50">
                            <TableRow className="border-b border-border hover:bg-transparent">
                                <TableHead className="font-medium text-muted-foreground h-12">User</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12 w-[100px]">Type</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12 w-[250px]">Class</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12">Start Date</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12">Schedule</TableHead>
                                <TableHead className="font-medium text-muted-foreground h-12 w-[100px]">Status</TableHead>
                                <TableHead className="text-right font-medium text-muted-foreground h-12 w-[80px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No bookings found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredData.map((booking) => (
                                    <TableRow key={booking.id} className="border-b border-border hover:bg-muted/30 transition-colors group">
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-border">
                                                    <AvatarImage src={booking.user.avatar} alt={booking.user.name} />
                                                    <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                                                        {booking.user.name.split(' ').map(n => n[0]).join('')}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col min-w-[150px] max-w-[220px]">
                                                    <span className="font-medium text-foreground truncate">{booking.user.name}</span>
                                                    <span className="text-xs text-muted-foreground truncate" title={booking.user.intro}>
                                                        {booking.user.intro}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                {booking.type === 'student' ? (
                                                    <GraduationCap className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <User className="h-4 w-4 text-purple-500" />
                                                )}
                                                <span className="text-sm capitalize">{booking.type}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground/90 line-clamp-2">
                                                {booking.class}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5 font-mono">{booking.id}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-foreground/80">
                                                <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{format(booking.startDate, "MMM d, yyyy")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-sm text-foreground/80">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{booking.hoursPerDay} hrs/session</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <CalendarDays className="h-3.5 w-3.5 text-[inherit]" />
                                                    <span>{booking.weeks} weeks total</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={`font-medium shadow-none px-2.5 py-0.5 rounded-full capitalize ${booking.status === 'active' ? 'bg-primary/10 text-primary hover:bg-primary/20' :
                                                    booking.status === 'upcoming' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 dark:text-amber-400' :
                                                        'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    }`}
                                            >
                                                {booking.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-sm border-border rounded-xl">
                                                    <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem className="cursor-pointer font-medium text-sm">View details</DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer font-medium text-sm">Message user</DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-border" />
                                                    <DropdownMenuItem className="cursor-pointer text-sm">Edit schedule</DropdownMenuItem>
                                                    {booking.status === 'upcoming' && (
                                                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 text-sm">
                                                            Cancel booking
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Pagination (Simplified visually) */}
            <div className="flex items-center justify-between mt-6 text-sm text-muted-foreground">
                <div>
                    Showing <span className="font-medium text-foreground">{filteredData.length}</span> of <span className="font-medium text-foreground">{data.length}</span> bookings
                </div>
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="shadow-none border-border h-8" disabled>
                        Previous
                    </Button>
                    <Button variant="outline" size="sm" className="shadow-none border-border h-8">
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
