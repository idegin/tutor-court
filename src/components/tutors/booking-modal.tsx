import React, { useState, useMemo, useEffect } from 'react';
import { HiXMark, HiCheck, HiCheckCircle } from 'react-icons/hi2';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Field, FieldContent, FieldError, FieldLabel } from '../ui/field';
import { computeBookingPrice } from '@/lib/booking-pricing';
import { formatNaira } from '@/lib/constants';

export interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tutorId: string;
    tutorName: string;
    pricePerHour: number;
    offeredSubjects?: string[];
    childrenOptions?: { id: string; name: string }[];
    onSuccess?: () => void;
    // Prefill from a prior booking (rebook). Dates are intentionally NOT seeded —
    // past dates fail validation, so the booker re-picks a fresh range.
    initialSubjects?: string[];
    initialDaysOfWeek?: string[];
    initialHoursPerDay?: number;
}

interface BookingValues {
    subjects: string[];
    message: string;
    startDate: string;
    endDate: string;
    hoursPerDay: number;
    daysOfWeek: string[];
}

type BookingErrors = Partial<Record<keyof BookingValues | 'form' | 'child', string>>;

const DAYS_OF_WEEK = [
    { label: 'Mon', value: 'monday' },
    { label: 'Tue', value: 'tuesday' },
    { label: 'Wed', value: 'wednesday' },
    { label: 'Thu', value: 'thursday' },
    { label: 'Fri', value: 'friday' },
    { label: 'Sat', value: 'saturday' },
    { label: 'Sun', value: 'sunday' },
];

export function BookingModal({ isOpen, onClose, tutorId, tutorName, pricePerHour, offeredSubjects = [], childrenOptions = [], onSuccess, initialSubjects, initialDaysOfWeek, initialHoursPerDay }: BookingModalProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Closing after a successful request triggers the parent's onSuccess (which
    // refreshes the page) — so the user actually sees the success step first.
    const handleClose = () => {
        if (isSubmitting) return; // don't tear down the modal mid-request
        if (submitted && onSuccess) onSuccess();
        else onClose();
    };

    // Close on Escape for keyboard/screen-reader users.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, submitted]);

    const needsChildSelection = childrenOptions.length > 1;
    const [selectedChildId, setSelectedChildId] = useState<string>(childrenOptions.length === 1 ? childrenOptions[0].id : '');

    const [values, setValues] = useState<BookingValues>({
        // Only seed subjects the tutor still offers, so every prefilled chip is
        // visible and deselectable in the UI.
        subjects: (initialSubjects ?? []).filter((s) => offeredSubjects.includes(s)),
        message: '',
        startDate: '',
        endDate: '',
        hoursPerDay: initialHoursPerDay && initialHoursPerDay >= 1 ? initialHoursPerDay : 1,
        daysOfWeek: initialDaysOfWeek ?? [],
    });

    const [errors, setErrors] = useState<BookingErrors>({});

    const handleValueChange = (field: keyof BookingValues, val: any) => {
        setValues(prev => ({ ...prev, [field]: val }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateStep1 = (): boolean => {
        const newErrors: BookingErrors = {};
        if (needsChildSelection && !selectedChildId) newErrors.child = 'Please select which child this booking is for.';
        if (values.subjects.length === 0) newErrors.subjects = 'Please select at least one subject.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: BookingErrors = {};
        if (!values.startDate) newErrors.startDate = 'Start date is required.';
        else {
            const start = new Date(values.startDate);
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            if (start < startOfToday) newErrors.startDate = 'Start date cannot be in the past.';
        }
        if (!values.endDate) newErrors.endDate = 'End date is required.';
        else if (new Date(values.endDate) < new Date(values.startDate)) newErrors.endDate = 'End date cannot be before start date.';

        if (values.hoursPerDay < 1 || values.hoursPerDay > 10) newErrors.hoursPerDay = 'Hours per day must be between 1 and 10.';
        if (values.daysOfWeek.length === 0) newErrors.daysOfWeek = 'Please select at least one day.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setStep(step + 1);
    };

    const handlePrev = () => setStep(step - 1);

    const price = useMemo(
        () =>
            computeBookingPrice({
                startDate: values.startDate,
                endDate: values.endDate,
                daysOfWeek: values.daysOfWeek,
                hoursPerDay: values.hoursPerDay,
                hourlyRate: pricePerHour,
            }),
        [values, pricePerHour],
    );

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setErrors({});

        try {
            const res = await fetch('/api/private/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tutorId,
                    ...(selectedChildId ? { studentId: selectedChildId } : {}),
                    ...values
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                // Only ever show a human-readable string — never a raw error
                // object/array (which would render as unreadable JSON).
                const message =
                    typeof data?.error === 'string' && data.error.trim()
                        ? data.error
                        : 'Something went wrong while creating your booking. Please try again.';
                setErrors({ form: message });
                setIsSubmitting(false);
                return;
            }

            setIsSubmitting(false);
            setSubmitted(true);
            setStep(4);
        } catch (error: any) {
            setErrors({ form: error?.message || 'An error occurred' });
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-lg bg-background border-[3px] border-foreground rounded-[2rem] overflow-hidden flex flex-col max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-label={`Book ${tutorName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {step < 4 ? (
                    <div className="flex items-center justify-between p-6 border-b-2 border-foreground bg-tutor-purple-50">
                        <h2 className="text-2xl font-black text-foreground">Book {tutorName.split(' ')[0]}</h2>
                        <button onClick={handleClose} className="p-1 hover:bg-foreground hover:text-background rounded transition-colors text-foreground">
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

                            {needsChildSelection && (
                                <Field data-invalid={Boolean(errors.child)} className="gap-2">
                                    <FieldLabel className="font-bold text-foreground">
                                        Which child? <span className="text-tutor-red-500">*</span>
                                    </FieldLabel>
                                    <FieldContent>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {childrenOptions.map((child) => {
                                                const isSelected = selectedChildId === child.id;
                                                return (
                                                    <button
                                                        key={child.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedChildId(child.id);
                                                            if (errors.child) setErrors(prev => ({ ...prev, child: undefined }));
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-full border-[2px] text-sm font-bold transition-all flex items-center gap-1.5",
                                                            isSelected
                                                                ? "border-foreground bg-tutor-purple-100 text-tutor-purple-800"
                                                                : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                                                        )}
                                                    >
                                                        {isSelected && <HiCheck className="w-4 h-4 text-tutor-purple-800" />}
                                                        {child.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.child}</FieldError>
                                    </FieldContent>
                                </Field>
                            )}

                            <Field data-invalid={Boolean(errors.subjects)} className="gap-2">
                                <FieldLabel className="font-bold text-foreground">
                                    Subjects / Topics <span className="text-muted-foreground font-normal ml-1">(Select multiple)</span>
                                </FieldLabel>
                                <FieldContent>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {offeredSubjects.map((subject) => {
                                            const isSelected = values.subjects.includes(subject);
                                            return (
                                                <button
                                                    key={subject}
                                                    type="button"
                                                    onClick={() => {
                                                        const newSubjects = isSelected
                                                            ? values.subjects.filter(s => s !== subject)
                                                            : [...values.subjects, subject];
                                                        handleValueChange('subjects', newSubjects);
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-full border-[2px] text-sm font-bold transition-all flex items-center gap-1.5",
                                                        isSelected
                                                            ? "border-foreground bg-tutor-purple-100 text-tutor-purple-800"
                                                            : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {isSelected && <HiCheck className="w-4 h-4 text-tutor-purple-800" />}
                                                    {subject}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.subjects}</FieldError>
                                </FieldContent>
                            </Field>

                            <Field className="gap-2">
                                <FieldLabel className="font-bold text-foreground">Message to Tutor</FieldLabel>
                                <FieldContent>
                                    <Textarea
                                        placeholder="Share your learning goals..."
                                        rows={4}
                                        className="w-full p-4 text-sm font-bold transition-all rounded-xl"
                                        value={values.message}
                                        onChange={(e) => handleValueChange('message', e.target.value)}
                                    />
                                </FieldContent>
                            </Field>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-black text-foreground">Schedule</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <Field data-invalid={Boolean(errors.startDate)} className="gap-2">
                                    <FieldLabel className="font-bold text-foreground">Start Date</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="date"
                                            className="w-full p-3 text-sm font-bold h-12 rounded-xl"
                                            value={values.startDate}
                                            onChange={(e) => handleValueChange('startDate', e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                        <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.startDate}</FieldError>
                                    </FieldContent>
                                </Field>
                                <Field data-invalid={Boolean(errors.endDate)} className="gap-2">
                                    <FieldLabel className="font-bold text-foreground">End Date</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="date"
                                            className="w-full p-3 text-sm font-bold h-12 rounded-xl"
                                            value={values.endDate}
                                            onChange={(e) => handleValueChange('endDate', e.target.value)}
                                            min={values.startDate || new Date().toISOString().split('T')[0]}
                                        />
                                        <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.endDate}</FieldError>
                                    </FieldContent>
                                </Field>
                            </div>

                            <Field data-invalid={Boolean(errors.hoursPerDay)} className="gap-2">
                                <FieldLabel className="font-bold text-foreground">Hours per Day</FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="10"
                                        className="w-full p-3 text-sm font-bold h-12 rounded-xl"
                                        value={values.hoursPerDay}
                                        onChange={(e) => handleValueChange('hoursPerDay', parseInt(e.target.value) || 0)}
                                    />
                                    <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.hoursPerDay}</FieldError>
                                </FieldContent>
                            </Field>

                            <Field data-invalid={Boolean(errors.daysOfWeek)} className="gap-2">
                                <FieldLabel className="font-bold text-foreground">Days of the Week</FieldLabel>
                                <FieldContent>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS_OF_WEEK.map(day => {
                                            const isSelected = values.daysOfWeek.includes(day.value);
                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => {
                                                        const newDays = isSelected
                                                            ? values.daysOfWeek.filter(d => d !== day.value)
                                                            : [...values.daysOfWeek, day.value];
                                                        handleValueChange('daysOfWeek', newDays);
                                                    }}
                                                    className={cn(
                                                        "px-4 py-2 rounded-lg border-2 text-sm font-bold transition-colors",
                                                        isSelected
                                                            ? "bg-foreground text-background border-foreground"
                                                            : "bg-background text-muted-foreground border-border hover:border-foreground"
                                                    )}
                                                >
                                                    {day.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError className="text-destructive font-semibold text-sm mt-1">{errors.daysOfWeek}</FieldError>
                                </FieldContent>
                            </Field>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            <h3 className="text-xl font-black text-foreground">Summary</h3>

                            {errors.form && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl border-2 border-red-200 font-semibold text-sm">
                                    {errors.form}
                                </div>
                            )}

                            <div className="bg-muted p-6 rounded-xl border-[3px] border-foreground flex flex-col gap-4">
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-muted-foreground">Sessions</span>
                                    <span className="text-foreground">{price.sessions}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-muted-foreground">Hours per day</span>
                                    <span className="text-foreground">{price.hoursPerDay} hr</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold">
                                    <span className="text-muted-foreground">Rate</span>
                                    <span className="text-foreground">{formatNaira(price.hourlyRate)}/hr</span>
                                </div>
                                <div className="h-[2px] bg-foreground/20 w-full my-2"></div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-lg font-black">
                                        <span className="text-foreground">Total</span>
                                        <span className="text-foreground">{formatNaira(price.totalPrice)}</span>
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground text-right">
                                        {price.sessions} sessions × {price.hoursPerDay}h × {formatNaira(price.hourlyRate)}/h
                                    </p>
                                </div>
                            </div>
                            {!price.valid && (
                                <p className="text-xs font-bold text-tutor-red-500 text-center">
                                    {price.hourlyRate <= 0
                                        ? "This tutor hasn't set an hourly rate yet, so a booking can't be priced. Please try another tutor."
                                        : 'No sessions fall within this date range and schedule. Adjust your dates or selected days.'}
                                </p>
                            )}
                            <p className="text-xs font-bold text-muted-foreground text-center">
                                You won&apos;t be charged yet. The tutor needs to confirm the booking first.
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
                                We&apos;ll notify you once they accept.
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t-2 border-foreground bg-background flex gap-4">
                    {step < 4 ? (
                        <>
                            {step > 1 ? (
                                <Button onClick={handlePrev} disabled={isSubmitting} className="px-6 py-4 rounded-xl border-[3px] border-foreground font-black text-foreground bg-secondary/20 hover:bg-muted transition-colors">
                                    Back
                                </Button>
                            ) : (
                                <div className="w-[88px]"></div>
                            )}

                            <Button
                                onClick={step < 3 ? handleNext : handleSubmit}
                                disabled={isSubmitting || (step === 3 && !price.valid)}
                                className="flex-1 px-6 py-4 rounded-xl border-[3px] border-foreground bg-tutor-red-500 hover:bg-tutor-orange-400 text-white font-black transition-colors text-lg disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Sending Request...' : (step < 3 ? 'Continue' : 'Submit Request')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={handleClose}
                            className="w-full px-6 py-4 rounded-xl border-[3px] border-foreground bg-foreground text-background font-black transition-colors text-lg hover:bg-foreground/90"
                        >
                            View My Bookings
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
