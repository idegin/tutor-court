import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HiOutlinePhoto } from 'react-icons/hi2';

export function ClassInfoForm() {
    return (
        <div className="bg-card border-none rounded-3xl p-8 flex flex-col gap-8 shadow-sm">
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
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="physics">Physics</SelectItem>
                            <SelectItem value="chemistry">Chemistry</SelectItem>
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
                            <SelectItem value="self-paced">Self Paced</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* SUBMIT */}
            <div className="pt-4">
                <Button className="w-full py-7 text-base font-bold rounded-2xl shadow-none bg-primary hover:bg-primary/90 text-primary-foreground">
                    Save Class Details
                </Button>
            </div>
        </div>
    );
}