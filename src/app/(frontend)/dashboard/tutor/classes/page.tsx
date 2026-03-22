import React from 'react';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TutorClassCard, MockClass } from '@/components/classes/tutor-classes/tutor-class-card';
import { CreateClassModal } from './create-class-modal';
import {
    HiOutlinePlus,
    HiOutlineMagnifyingGlass,
    HiOutlineArrowPath
} from 'react-icons/hi2';

export const metadata: Metadata = {
    title: 'My Classes | Tutor Court',
    description: 'Manage your tutoring classes and student interactions.',
};

// High-quality mock data
const mockClasses: MockClass[] = [
    {
        id: 'cls-1',
        title: 'Advanced Calculus Prep',
        description: 'Intensive preparation for end-of-year calculus exams. Covers limits, derivatives, and integrals with real-world applications.',
        subjectName: 'Mathematics',
        tutorName: 'Sarah Tutor',
        isPublished: true,
        updatedAt: 'Oct 24, 2023',
        thumbnail: 'https://images.unsplash.com/photo-1635070041073-e36e1bf005c3?q=80&w=600&auto=format&fit=crop',
        type: 'one-on-one',
        minAge: 16,
        maxAge: 19,
        durationInMinutes: 60,
        learningOutcomes: ['Understand Limits', 'Calculate Derivatives', 'Apply Integrals'],
    },
    {
        id: 'cls-2',
        title: 'Introduction to Physics',
        description: 'Basic mechanics, kinematics, and energy principles designed for high school juniors and seniors.',
        subjectName: 'Physics',
        tutorName: 'Sarah Tutor',
        isPublished: true,
        updatedAt: 'Nov 02, 2023',
        thumbnail: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=600&auto=format&fit=crop',
        type: 'group',
        minAge: 15,
        maxAge: 18,
        durationInMinutes: 90,
        learningOutcomes: ['Newton\'s Laws', 'Kinematic Equations', 'Conservation of Energy'],
    },
    {
        id: 'cls-3',
        title: 'English Literature Mastery',
        description: 'Deep dive into 19th-century literature. Students will learn critical analysis and advanced essay writing.',
        subjectName: 'English',
        tutorName: 'Sarah Tutor',
        isPublished: false,
        updatedAt: 'Nov 15, 2023',
        thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop',
        type: 'self-paced',
        durationInMinutes: 120,
        learningOutcomes: ['Theme Analysis', 'Historical Context', 'Advanced Essay Shaping', 'Rhetorical Devices'],
    },
    {
        id: 'cls-4',
        title: 'AP Chemistry Basics',
        description: 'Foundation course for students preparing to take AP Chemistry next semester. Focuses on atomic structure and stoichiometry.',
        subjectName: 'Chemistry',
        tutorName: 'Sarah Tutor',
        isPublished: true,
        updatedAt: 'Dec 05, 2023',
        thumbnail: 'https://images.unsplash.com/photo-1603126854425-412f1224213d?q=80&w=600&auto=format&fit=crop',
        type: 'one-on-one',
        durationInMinutes: 45,
        learningOutcomes: ['Atomic Theory', 'Chemical Bonding', 'Stoichiometry Steps'],
    },
    {
        id: 'cls-5',
        title: 'Spanish Conversation',
        description: 'Intermediate conversational Spanish for students looking to improve their speaking and listening comprehension.',
        subjectName: 'Languages',
        tutorName: 'Sarah Tutor',
        isPublished: true,
        updatedAt: 'Dec 12, 2023',
        thumbnail: 'https://images.unsplash.com/photo-1546410531-bea4edad81fa?q=80&w=600&auto=format&fit=crop',
        type: 'group',
        minAge: 12,
        durationInMinutes: 60,
        learningOutcomes: ['Fluid Conversation', 'Accent Reduction', 'Verb Conjugation on the fly'],
    },
    {
        id: 'cls-6',
        title: 'SAT Test Prep',
        description: 'Comprehensive SAT preparation covering both math and evidence-based reading/writing sections.',
        subjectName: 'Test Prep',
        tutorName: 'Sarah Tutor',
        isPublished: false,
        updatedAt: 'Jan 10, 2024',
        type: 'group',
        minAge: 15,
        maxAge: 18,
        durationInMinutes: 120,
        learningOutcomes: ['Math Strategies', 'Reading Comprehension', 'Time Management'],
    }
];

export default function TutorClassesPage() {
    return (
        <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10 p-4 md:p-6 lg:p-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">My Classes</h1>
                    <p className="text-muted-foreground mt-1 text-sm">Create, manage, and monitor all your active subject classes.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative w-full sm:w-64">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search classes..."
                            className="pl-9 bg-background shadow-none border-border"
                        />
                    </div>
                    <CreateClassModal />
                </div>
            </div>

            {/* Classes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockClasses.map((cls) => (
                    <TutorClassCard key={cls.id} classData={cls} />
                ))}
            </div>

            {/* Load More Button */}
            <div className="mt-8 flex justify-center w-full">
                <Button variant="outline" className="shadow-none bg-background border-border text-muted-foreground hover:text-foreground">
                    <HiOutlineArrowPath className="mr-2 h-4 w-4" />
                    Load More Classes
                </Button>
            </div>
        </div>
    );
}