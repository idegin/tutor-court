import React from 'react';
import { HiOutlinePhoto, HiOutlineLightBulb, HiMiniStar, HiOutlineUserGroup } from 'react-icons/hi2';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClassLivePreviewProps {
    title?: string;
    subject?: string;
    tutorName?: string;
}

export function ClassLivePreview({
    title = 'Untitled Class',
    subject = 'MATHEMATICS',
    tutorName = 'Dr. Aris Thorne'
}: ClassLivePreviewProps) {
    return (
        <div className="flex flex-col gap-6 w-full max-w-md mx-auto xl:mx-0 xl:sticky xl:top-24">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="uppercase text-xs font-bold text-muted-foreground tracking-widest">Live Preview</h3>
                <span className="bg-secondary/20 text-secondary font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full">
                    Student View
                </span>
            </div>

            {/* Preview Card */}
            <div className="bg-card border rounded-3xl overflow-hidden flex flex-col">
                {/* Image Placeholder */}
                <div className="bg-muted/40 aspect-[4/3] w-full relative flex items-center justify-center">
                    <div className="absolute top-4 left-4 bg-background border border-border/50 text-foreground text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
                        New Class
                    </div>
                    <HiOutlinePhoto className="w-16 h-16 text-border" />
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                            <span className="text-primary font-extrabold text-xs tracking-widest uppercase">
                                {subject}
                            </span>
                            <h4 className="text-2xl font-black text-foreground tracking-tight line-clamp-2">
                                {title}
                            </h4>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Starting at</span>
                            <span className="text-xl font-black text-tutor-red-400">$0.00</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-1">
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                            <AvatarImage src="/avatars/dr-aris.png" alt={tutorName} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">AT</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-foreground text-sm">{tutorName}</span>
                    </div>

                    <div className="grid grid-cols-2 mt-4 pt-4 border-t border-border/50 items-center">
                        <div className="flex items-center gap-1.5">
                            <HiMiniStar className="w-5 h-5 text-tutor-red-400" />
                            <span className="font-bold text-sm text-foreground">5.0</span>
                            <span className="text-muted-foreground text-sm font-medium">(0 reviews)</span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 text-foreground font-bold text-sm">
                            <HiOutlineUserGroup className="w-5 h-5 text-muted-foreground" />
                            <span>12 Spots Left</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-tutor-purple-50 border border-tutor-purple-100 rounded-3xl p-6 flex gap-4 md:items-start mt-2">
                <div className="flex-shrink-0 mt-0.5">
                    <HiOutlineLightBulb className="w-6 h-6 text-tutor-purple-400" />
                </div>
                <div className="space-y-1.5">
                    <h5 className="font-bold text-foreground">Pro Tip</h5>
                    <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                        Adding a high-quality thumbnail image can increase student engagement by up to 40%.
                    </p>
                </div>
            </div>
        </div>
    );
}