'use client';

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HiOutlinePlus } from 'react-icons/hi2';
import { useOptions } from '@/components/providers/options-provider';
import { useRouter } from 'next13-progressbar';
import { z } from 'zod';

const createClassSchema = z.object({
    title: z.string()
        .trim()
        .min(3, "Title must be at least 3 characters")
        .max(100, "Title must be less than 100 characters"),
    subject: z.string({ required_error: "Please select a subject" })
        .min(1, "Please select a subject"),
    description: z.string()
        .trim()
        .min(10, "Description must be at least 10 characters")
        .max(500, "Description must be less than 500 characters"),
});

type FormErrors = z.inferFlattenedErrors<typeof createClassSchema>['fieldErrors'];

export function CreateClassModal() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<FormErrors>({});
    const router = useRouter();
    const { subjects } = useOptions();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const result = createClassSchema.safeParse({ title, subject, description });

        if (!result.success) {
            setErrors(result.error.flatten().fieldErrors);
            return;
        }

        // Generate random ID for prototype purposes
        const randomId = Math.random().toString(36).substring(2, 9);

        // Reset state
        setOpen(false);
        setTitle('');
        setSubject('');
        setDescription('');
        setErrors({});

        router.push(`/dashboard/tutor/classes/edit/${randomId}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="shadow-none flex-shrink-0">
                    <HiOutlinePlus className="mr-2 h-4 w-4" />
                    Add New Class
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md border-border/60 bg-background shadow-none rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Create New Class</DialogTitle>
                    <DialogDescription className="text-muted-foreground mt-1">
                        Fill in the details below to start setting up a new class.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className={`text-sm font-semibold ${errors.title ? 'text-destructive' : 'text-foreground'}`}>Class Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Advanced Calculus Prep"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                if (errors.title) setErrors({ ...errors, title: undefined });
                            }}
                            className={`bg-background shadow-none ${errors.title ? 'border-destructive focus-visible:ring-destructive/30' : 'border-border focus-visible:ring-primary/30'}`}
                        />
                        {errors.title && (
                            <p className="text-[0.8rem] font-medium text-destructive">{errors.title[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject" className={`text-sm font-semibold ${errors.subject ? 'text-destructive' : 'text-foreground'}`}>Subject</Label>
                        <Select value={subject} onValueChange={(val) => {
                            setSubject(val);
                            if (errors.subject) setErrors({ ...errors, subject: undefined });
                        }}>
                            <SelectTrigger className={`bg-background shadow-none w-full ${errors.subject ? 'border-destructive focus:ring-destructive/30' : 'border-border focus:ring-primary/30'}`}>
                                <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-background shadow-none">
                                {subjects.length > 0 ? (
                                    subjects.map((sub: any) => (
                                        <SelectItem key={sub.id || sub.value || sub} value={sub.id || sub.value || sub.name || sub}>
                                            {sub.name || sub.label || sub.title || sub}
                                        </SelectItem>
                                    ))
                                ) : (
                                    // Fallback if subjects aren't loaded in options provider
                                    <>
                                        <SelectItem value="mathematics">Mathematics</SelectItem>
                                        <SelectItem value="physics">Physics</SelectItem>
                                        <SelectItem value="chemistry">Chemistry</SelectItem>
                                        <SelectItem value="biology">Biology</SelectItem>
                                        <SelectItem value="english">English</SelectItem>
                                        <SelectItem value="history">History</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                        {errors.subject && (
                            <p className="text-[0.8rem] font-medium text-destructive">{errors.subject[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className={`text-sm font-semibold ${errors.description ? 'text-destructive' : 'text-foreground'}`}>Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Briefly describe what this class is about..."
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                if (errors.description) setErrors({ ...errors, description: undefined });
                            }}
                            className={`min-h-[100px] resize-none bg-background shadow-none ${errors.description ? 'border-destructive focus-visible:ring-destructive/30' : 'border-border focus-visible:ring-primary/30'}`}
                        />
                        {errors.description && (
                            <p className="text-[0.8rem] font-medium text-destructive">{errors.description[0]}</p>
                        )}
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOpen(false);
                                setErrors({});
                            }}
                            className="shadow-none border-border/60 hover:bg-muted"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="shadow-none"
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
