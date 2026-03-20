import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    HiOutlineBookOpen,
    HiOutlineUser,
    HiOutlineCalendar,
    HiOutlinePencilSquare,
    HiOutlineEllipsisVertical,
    HiOutlineVideoCamera,
    HiOutlineClock,
    HiOutlineAcademicCap,
    HiOutlineUsers,
    HiOutlineCheckCircle
} from 'react-icons/hi2';

export interface MockClass {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    subjectName?: string;
    tutorName?: string;
    isPublished: boolean;
    updatedAt: string;
    type: 'one-on-one' | 'group' | 'self-paced';
    minAge?: number;
    maxAge?: number;
    durationInMinutes?: number;
    learningOutcomes?: string[];
}

interface ClassCardProps {
    classData: MockClass;
}

export function TutorClassCard({ classData }: ClassCardProps) {
    const formatType = (type: string) => {
        switch (type) {
            case 'one-on-one': return '1-on-1';
            case 'group': return 'Group';
            case 'self-paced': return 'Self-Paced';
            default: return type;
        }
    }

    return (
        <Card className="shadow-none border-border overflow-hidden flex flex-col h-full hover:border-primary/30 transition-colors py-0 space-y-0">
            {/* Thumbnail Header */}
            <div className="relative h-40 bg-muted shrink-0 w-full overflow-hidden">
                {classData.thumbnail ? (
                    <img
                        src={classData.thumbnail}
                        alt={classData.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-primary/5">
                        <HiOutlineVideoCamera className="h-16 w-16" />
                    </div>
                )}

                <div className="absolute top-3 right-3 flex gap-2">
                    <Badge variant={classData.isPublished ? "default" : "secondary"} className="shadow-none font-medium">
                        {classData.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                </div>
            </div>


            <CardContent className="flex-1 px-4 py-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {classData.subjectName && (
                                <Badge variant="outline" className="text-xs bg-muted/50 border-none font-normal shadow-none text-muted-foreground mb-1">
                                    {classData.subjectName}
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs border-secondary/20 text-secondary font-normal shadow-none mb-1">
                                {formatType(classData.type)}
                            </Badge>
                        </div>
                        <h3 className="font-bold text-lg leading-tight tracking-tight line-clamp-1">{classData.name}</h3>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                    {classData.description}
                </p>

                <div className="flex flex-col gap-3 text-sm border-border/50 pt-3 mt-1">
                    <div className="grid grid-cols-2 gap-2">
                        {classData.durationInMinutes && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <HiOutlineClock className="h-4 w-4 shrink-0" />
                                <span className="truncate">{classData.durationInMinutes} mins</span>
                            </div>
                        )}
                        {(classData.minAge || classData.maxAge) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <HiOutlineUsers className="h-4 w-4 shrink-0" />
                                <span className="truncate">Ages {classData.minAge || 'Any'}-{classData.maxAge || 'Any'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="flex items-center gap-4 pb-4 px-4 pt-3 border-t border-border/10">
                <Button variant="outline" className='flex-1 shadow-none'>
                    <HiOutlinePencilSquare className="mr-2 h-4 w-4" />
                    Edit
                </Button>
                <Button className="flex-1 shadow-none">
                    View
                </Button>
            </CardFooter>
        </Card>
    );
}
