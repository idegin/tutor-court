import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';

export function ScheduleLivePreview() {
    const [date, setDate] = useState<Date | undefined>(new Date(2023, 9, 11)); // Oct 11, 2023 for visual parity with design

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Live Preview Card */}
            <div className="bg-tutor-purple-200 rounded-3xl p-8 shadow-none border-none w-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[22px] font-extrabold text-foreground uppercase tracking-wider leading-tight">
                        STUDENT<br />VIEW
                    </h3>
                    <div className="bg-background/40 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-foreground">
                        Live Preview
                    </div>
                </div>

                <div className="bg-card rounded-3xl p-6 shadow-sm border-none">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="mx-auto bg-transparent p-0 w-full"
                        classNames={{
                            months: "w-full",
                            month: "w-full gap-4 flex flex-col",
                            table: "w-full border-collapse",
                            head_row: "flex w-full mt-4 mb-2",
                            head_cell: "text-muted-foreground w-10 sm:w-11 font-black text-[11px] uppercase tracking-wider flex items-center justify-center m-0",
                            row: "flex w-full mb-1",
                            cell: "text-center p-0 flex items-center justify-center relative [&:has([aria-selected])]:bg-transparent",
                            day: "w-10 h-10 sm:w-11 sm:h-11 mx-auto rounded-full font-bold text-[15px] flex items-center justify-center hover:bg-muted/50 transition-colors text-foreground",
                            day_selected: "bg-primary !text-primary-foreground ring-4 ring-primary/30 hover:bg-primary/90 relative z-10 rounded-full flex items-center justify-center",
                            day_today: "bg-transparent font-bold !text-foreground",
                            day_outside: "text-muted-foreground/30 opacity-50 font-medium",
                            nav: "flex items-center gap-2",
                            nav_button: "w-10 h-10 rounded-full border border-border flex items-center justify-center bg-transparent hover:bg-muted/20 transition-colors [&>svg]:w-5 [&>svg]:h-5",
                            caption: "flex justify-between items-center w-full mb-2 px-1 relative",
                            caption_label: "text-lg font-black text-foreground"
                        }}
                    />

                    <div className="mt-8 pt-6 border-t border-border">
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground mb-4">
                            Available slots for Oct 11
                        </h4>
                        <div className="flex flex-wrap gap-2.5">
                            {['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM'].map((time, i) => (
                                <button
                                    key={i}
                                    className="px-5 py-2.5 bg-muted border border-border rounded-full text-[13px] font-black text-foreground hover:bg-muted/80 transition-colors"
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tip Card */}
            <div className="bg-primary rounded-3xl p-8 shadow-none border-none">
                <h4 className="text-[22px] font-extrabold text-primary-foreground mb-3 flex items-center gap-3">
                    Scheduling Tip
                </h4>
                <p className="text-primary-foreground/90 font-bold text-[15px] leading-relaxed">
                    Classes with at least 3 available slots per day have a 45% higher booking rate from new students.
                </p>
            </div>
        </div>
    );
}
