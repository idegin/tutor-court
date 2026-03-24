import React, { useState } from 'react';
import { HiXMark, HiCheck, HiCheckCircle } from 'react-icons/hi2';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorName: string;
    pricePerHour: number;
    offeredSubjects?: string[];
}

export function BookingModal({ isOpen, onClose, tutorName, pricePerHour, offeredSubjects = [] }: BookingModalProps) {
    const [step, setStep] = useState(1);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleNext = () => setStep(step + 1);
    const handlePrev = () => setStep(step - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setStep(4); // Move to success step
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-background border-[3px] border-foreground rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh]">
                {step < 4 ? (
                    <div className="flex items-center justify-between p-6 border-b-2 border-foreground bg-tutor-purple">
                        <h2 className="text-2xl font-black text-foreground">Book {tutorName.split(' ')[0]}</h2>
                        <button onClick={onClose} className="p-1 hover:bg-foreground hover:text-background rounded transition-colors text-foreground">
                            <HiXMark className="w-6 h-6" />
                        </button>
                    </div>
                ) : null}

                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    {step < 4 && (
                        <div className="flex gap-2 mb-8">
                            <div className={`h-2 flex-1 rounded ${step >= 1 ? 'bg-foreground' : 'bg-muted border-2 border-border'}`}></div>
                            <div className={`h-2 flex-1 rounded ${step >= 2 ? 'bg-foreground' : 'bg-muted border-2 border-border'}`}></div>
                            <div className={`h-2 flex-1 rounded ${step >= 3 ? 'bg-foreground' : 'bg-muted border-2 border-border'}`}></div>
                        </div>
                    )}
                    {step === 1 && (
                        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-black text-foreground">Engagement Details</h3>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">Subjects / Topics <span className="text-muted-foreground font-normal">(Select multiple)</span></label>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {offeredSubjects.map((subject) => {
                                        const isSelected = selectedSubjects.includes(subject);
                                        return (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedSubjects(prev => prev.filter(s => s !== subject));
                                                    } else {
                                                        setSelectedSubjects(prev => [...prev, subject]);
                                                    }
                                                }}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full border-[2px] text-sm font-bold transition-all flex items-center gap-1.5",
                                                    isSelected
                                                        ? "border-foreground bg-tutor-purple-500 text-foreground"
                                                        : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                                                )}
                                            >
                                                {isSelected && <HiCheck className="w-4 h-4 text-foreground" />}
                                                {subject}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">Message to Tutor</label>
                                <Textarea placeholder="Share your learning goals..." rows={4} className="w-full p-4 text-sm font-bold transition-all" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-black text-foreground">Schedule</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-foreground">Start Date</label>
                                    <Input type="date" className="w-full p-3 text-sm font-bold" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-bold text-foreground">End Date</label>
                                    <Input type="date" className="w-full p-3 text-sm font-bold" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">Hours per Day</label>
                                <Input type="number" min="1" max="10" defaultValue="1" className="w-full p-3 text-sm font-bold" />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-foreground">Days of the Week</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                        <button key={day} className="px-4 py-2 rounded-lg border-2 border-foreground text-sm font-bold hover:bg-tutor-orange-400 transition-colors">
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-black text-foreground">Summary</h3>
                            <div className="bg-muted p-6 rounded-xl border-[3px] border-foreground flex flex-col gap-4">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-muted-foreground">Rate</span>
                                    <span className="text-foreground">₦{pricePerHour.toLocaleString()}/hr</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-muted-foreground">Estimated Hours</span>
                                    <span className="text-foreground">12 hrs</span>
                                </div>
                                <div className="h-[2px] bg-foreground/20 w-full my-2"></div>
                                <div className="flex justify-between items-center text-lg font-black">
                                    <span className="text-foreground">Total Estimate</span>
                                    <span className="text-foreground">₦{(pricePerHour * 12).toLocaleString()}</span>
                                </div>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground text-center">
                                You won't be charged yet. The tutor needs to confirm the booking first.
                            </p>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6 animate-in zoom-in fade-in duration-300 text-center">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center border-[3px] border-foreground mb-4">
                                <HiCheckCircle className="w-16 h-16 text-green-600" />
                            </div>
                            <h3 className="text-3xl font-black text-foreground">Request Sent!</h3>
                            <p className="text-sm font-bold text-muted-foreground max-w-sm">
                                Your booking request has been successfully sent to <span className="text-foreground">{tutorName}</span>.
                                We'll notify you once they accept.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t-2 border-foreground bg-background flex gap-4">
                    {step < 4 ? (
                        <>
                            {step > 1 ? (
                                <Button onClick={handlePrev} className="px-6 py-4 rounded-xl border-[3px] border-foreground font-black text-foreground bg-secondary/20 hover:bg-muted transition-colors">
                                    Back
                                </Button>
                            ) : (
                                <div className="w-[88px]"></div> // Spacer
                            )}

                            <Button
                                onClick={step < 3 ? handleNext : handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-4 rounded-xl border-3 border-foreground text-foreground font-black transition-colors text-lg"
                            >
                                {isSubmitting ? 'Sending Request...' : (step < 3 ? 'Continue' : 'Submit Request')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onClose}
                            className="w-full px-6 py-4 rounded-xl border-[3px] border-foreground bg-foreground text-background font-black transition-colors text-lg hover:bg-foreground/90"
                        >
                            Close
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
