import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineClock } from 'react-icons/hi2';
import { useOptions } from '@/components/providers/options-provider';


type TimeSlot = {
    from: string;
    to: string;
};

type DaySchedule = {
    enabled: boolean;
    slots: TimeSlot[];
};

type ScheduleState = Record<string, DaySchedule>;

const DEFAULT_SCHEDULE: ScheduleState = {
    Monday: { enabled: true, slots: [{ from: '09:00 AM', to: '05:00 PM' }] },
    Tuesday: { enabled: true, slots: [{ from: '10:00 AM', to: '12:00 PM' }, { from: '02:00 PM', to: '06:00 PM' }] },
    Wednesday: { enabled: false, slots: [{ from: '09:00 AM', to: '05:00 PM' }] },
    Thursday: { enabled: true, slots: [{ from: '09:00 AM', to: '05:00 PM' }] },
    Friday: { enabled: true, slots: [{ from: '09:00 AM', to: '03:00 PM' }] },
    Saturday: { enabled: false, slots: [{ from: '09:00 AM', to: '05:00 PM' }] },
    Sunday: { enabled: false, slots: [{ from: '09:00 AM', to: '05:00 PM' }] },
};

export function ScheduleRoutineBuilder() {
    const { timeOptions, days } = useOptions();
    const [schedule, setSchedule] = useState<ScheduleState>(DEFAULT_SCHEDULE);

    const toggleDay = (day: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: { ...prev[day], enabled: !prev[day].enabled }
        }));
    };

    const addSlot = (day: string) => {
        setSchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                slots: [...prev[day].slots, { from: '09:00 AM', to: '05:00 PM' }]
            }
        }));
    };

    const removeSlot = (day: string, index: number) => {
        setSchedule(prev => {
            const newSlots = [...prev[day].slots];
            newSlots.splice(index, 1);
            return {
                ...prev,
                [day]: { ...prev[day], slots: newSlots }
            };
        });
    };

    const updateSlot = (day: string, index: number, field: keyof TimeSlot, value: string) => {
        setSchedule(prev => {
            const newSlots = [...prev[day].slots];
            newSlots[index] = { ...newSlots[index], [field]: value };
            return {
                ...prev,
                [day]: { ...prev[day], slots: newSlots }
            };
        });
    };

    return (
        <div className="bg-card rounded-3xl shadow-none border-none flex flex-col gap-6 w-full md:p-8">
            <div className="mb-2">
                <h2 className="text-[26px] font-black text-foreground tracking-[0px] mb-2">Weekly Routine</h2>
                <p className="text-muted-foreground font-medium text-[17px]">
                    Define your standard availability for this class type.
                </p>
            </div>

            <div className="flex flex-col gap-4">
                {days.map((day) => {
                    const { enabled, slots } = schedule[day];
                    const isMultiple = slots.length > 1;

                    return (
                        <div
                            key={day}
                            className={`rounded-[20px] p-6 transition-colors ${!enabled ? 'bg-muted/40 opacity-70' : isMultiple ? 'bg-primary/5 border border-primary/20' : 'bg-muted/80 border border-transparent'}`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start lg:items-center gap-4">
                                {/* Left: Toggle & Day */}
                                <div className="flex items-center gap-5 w-44 shrink-0">
                                    <Switch checked={enabled} onCheckedChange={() => toggleDay(day)} className="data-[state=checked]:bg-primary" />
                                    <span className="font-extrabold text-[17px] text-foreground">{day}</span>
                                </div>

                                {/* Right: Slots or Unavailable */}
                                <div className="flex-1 flex flex-col gap-4">
                                    {!enabled ? (
                                        <div className="flex items-center h-[46px]">
                                            <span className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground/80">Unavailable</span>
                                        </div>
                                    ) : (
                                        slots.map((slot, index) => (
                                            <div key={index} className="flex flex-wrap items-center gap-4">
                                                {/* From Select */}
                                                <div className="relative w-32 sm:w-36">
                                                    <Select value={slot.from} onValueChange={(val) => updateSlot(day, index, 'from', val)}>
                                                        <SelectTrigger className="w-full bg-background border border-border shadow-none rounded-[18px] py-6 pl-5 pr-10 font-bold text-[14px] focus:ring-1 focus:ring-primary/40 [&>span>svg]:hidden [&>svg]:hidden">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <HiOutlineClock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground pointer-events-none" />
                                                        <SelectContent position="popper" className="max-h-[300px] shadow-none rounded-xl">
                                                            {timeOptions?.map(time => (
                                                                <SelectItem key={time} value={time} className="font-medium">{time}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <span className="text-muted-foreground/80 font-bold text-lg">-</span>

                                                {/* To Select */}
                                                <div className="relative w-32 sm:w-36">
                                                    <Select value={slot.to} onValueChange={(val) => updateSlot(day, index, 'to', val)}>
                                                        <SelectTrigger className="w-full bg-background border border-border shadow-none rounded-[18px] py-6 pl-5 pr-10 font-bold text-[14px] focus:ring-1 focus:ring-primary/40 [&>span>svg]:hidden [&>svg]:hidden">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <HiOutlineClock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground pointer-events-none" />
                                                        <SelectContent position="popper" className="max-h-[300px] shadow-none rounded-xl">
                                                            {timeOptions?.map(time => (
                                                                <SelectItem key={time} value={time} className="font-medium">{time}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex items-center gap-3 ml-2">
                                                    {slots.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSlot(day, index)}
                                                            className="w-[42px] h-[42px] flex items-center justify-center rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                                                        >
                                                            <HiOutlineTrash className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                    {index === slots.length - 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => addSlot(day)}
                                                            className="w-[42px] h-[42px] flex items-center justify-center rounded-full text-primary hover:bg-primary/20 transition-colors"
                                                        >
                                                            <HiOutlinePlus className="w-[22px] h-[22px] lg:w-[26px] lg:h-[26px]" style={{ strokeWidth: 1.5 }} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
