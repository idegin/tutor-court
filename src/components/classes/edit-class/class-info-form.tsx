'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HiOutlinePhoto, HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2';
import { useOptions } from '@/components/providers/options-provider';

export function ClassInfoForm() {
    const { subjects } = useOptions();
    const [outcomes, setOutcomes] = useState<string[]>(['']);

    const addOutcome = () => {
        setOutcomes([...outcomes, '']);
    };

    const updateOutcome = (index: number, value: string) => {
        const newOutcomes = [...outcomes];
        newOutcomes[index] = value;
        setOutcomes(newOutcomes);
    };

    const removeOutcome = (index: number) => {
        const newOutcomes = outcomes.filter((_, i) => i !== index);
        setOutcomes(newOutcomes);
    };

    return (
        <div className="bg-card border rounded-3xl p-8 flex flex-col gap-8">
            {/* THUMBNAIL UPLOAD */}
            <div className="space-y-3">
                <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Class Thumbnail</Label>
                <button
                    type="button"
                    className="w-full flex-col flex items-center justify-center p-12 border-2 border-dashed border-border/80 rounded-2xl bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                    <HiOutlinePhoto className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <span className="text-sm font-semibold text-foreground/80 mb-1">Click to upload image</span>
                    <span className="text-xs text-muted-foreground font-medium">PNG, JPG up to 10MB</span>
                </button>
            </div>

            {/* CLASS TITLE */}
            <div className="space-y-3">
                <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Class Title</Label>
                <Input
                    placeholder="e.g. Advanced Calculus Masterclass"
                    className="bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border"
                />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-3">
                <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Description</Label>
                <Textarea
                    placeholder="Briefly describe what students will learn..."
                    className="min-h-[140px] resize-none bg-muted/30 border-none shadow-none text-base py-4 px-4 rounded-xl font-medium placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border"
                />
            </div>

            {/* TWO COLUMNS: SUBJECT & CLASS TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Subject</Label>
                    <Select>
                        <SelectTrigger className="w-full bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium focus:ring-1 focus:ring-border">
                            <SelectValue placeholder="Select Subject" />
                        </SelectTrigger>
                        <SelectContent className="border-border shadow-none rounded-xl">
                            {subjects?.map((subject: any) => (
                                <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-3">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Class Type</Label>
                    <Select>
                        <SelectTrigger className="w-full bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium focus:ring-1 focus:ring-border">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="border-border shadow-none rounded-xl">
                            <SelectItem value="one-on-one">One on One</SelectItem>
                            <SelectItem value="group">Group Class</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* AGE RANGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Min Age</Label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 5"
                        className="bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border"
                    />
                </div>
                <div className="space-y-3">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Max Age</Label>
                    <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 18"
                        className="bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border"
                    />
                </div>
            </div>

            {/* LEARNING OUTCOMES */}
            <div className="space-y-4 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                    <Label className="uppercase text-xs font-bold text-muted-foreground tracking-wider">Learning Outcomes</Label>
                </div>
                
                <div className="space-y-3">
                    {outcomes.map((outcome, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <Input
                                placeholder={`e.g. Understand the basics of...`}
                                value={outcome}
                                onChange={(e) => updateOutcome(index, e.target.value)}
                                className="bg-muted/30 border-none shadow-none text-base py-6 rounded-xl font-medium placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-border flex-1"
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeOutcome(index)}
                                className="h-12 w-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <HiOutlineXMark className="h-5 w-5" />
                            </Button>
                        </div>
                    ))}
                    <Button 
                        type="button" 
                        variant="outline"
                        onClick={addOutcome}
                        className="w-full h-12 text-sm font-bold border-dashed border-2 border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-none rounded-xl mt-2 bg-transparent"
                    >
                        <HiOutlinePlus className="mr-2 h-4 w-4" />
                        Add New Outcome
                    </Button>
                </div>
            </div>

            {/* SUBMIT */}
            <div className="pt-6 border-t border-border/50">
                <Button className="w-full h-12 text-base font-bold rounded-2xl shadow-none bg-primary hover:bg-primary/90 text-primary-foreground">
                    Save Class Details
                </Button>
            </div>
        </div>
    );
}