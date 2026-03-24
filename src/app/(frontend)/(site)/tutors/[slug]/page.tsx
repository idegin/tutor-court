import React from 'react';
import { TutorHero } from '@/components/tutors/tutor-hero';
import { TutorAbout } from '@/components/tutors/tutor-about';
import { TutorBookingSidebar } from '@/components/tutors/tutor-booking-sidebar';
import { SimilarTutors } from '@/components/tutors/similar-tutors';
import { HiBeaker, HiCalculator, HiBolt, HiChartBar } from 'react-icons/hi2';

// Mock Data
const MOCK_TUTOR = {
    id: "dr-chioma-adebayo",
    name: "Dr. Chioma Adebayo",
    title: "Senior Research Fellow & Quantitative Specialist",
    rating: 4.9,
    reviews: 128,
    pricePerHour: 12500,
    imageUrl: "https://i.pravatar.cc/300?img=47",
    coverImageUrl: "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/preschool-tutor-service-banner-design-template-00d3fc803b78ce48f1034ff3b7382dab_screen.jpg?ts=1698451931",
    isVerified: true,
    responseTimeText: "2 hours",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    description: (
        <>
            <p>
                With over a decade of experience in theoretical physics and applied mathematics, I specialize in bridging the gap between complex academic theories and practical understanding. My approach is rooted in the "Academic Curator" philosophy—selecting only the most vital concepts to master first.
            </p>
            <p>
                I hold a PhD from Imperial College London and have published 15+ peer-reviewed papers. My goal is to empower students not just to pass exams, but to develop a fundamental intuition for how the universe operates at a mathematical level.
            </p>
        </>
    ),
    subjects: [
        {
            name: 'Quantum Mechanics',
            icon: <HiBeaker className="w-5 h-5" />,
            colorClass: 'bg-tutor-purple-100 text-tutor-purple-800'
        },
        {
            name: 'Advanced Calculus',
            icon: <HiCalculator className="w-5 h-5" />,
            colorClass: 'bg-green-100 text-green-800'
        },
        {
            name: 'Theoretical Physics',
            icon: <HiBolt className="w-5 h-5" />,
            colorClass: 'bg-muted text-foreground'
        },
        {
            name: 'Statistical Modeling',
            icon: <HiChartBar className="w-5 h-5" />,
            colorClass: 'bg-tutor-red-100 text-tutor-red-600'
        }
    ]
};

const MOCK_SIMILAR_TUTORS = [
    {
        id: "dr-marcus",
        name: "Dr. Marcus Arinze",
        title: "Data Science & Machine Learning",
        rating: 4.8,
        priceText: "₦10k/hr",
        imageUrl: "https://i.pravatar.cc/300?img=11"
    },
    {
        id: "sarah-jenkins",
        name: "Sarah Jenkins",
        title: "Organic Chemistry Specialist",
        rating: 5.0,
        priceText: "₦8.5k/hr",
        imageUrl: "https://i.pravatar.cc/300?img=5"
    },
    {
        id: "prof-david",
        name: "Prof. David Okon",
        title: "Macroeconomics & Finance",
        rating: 4.9,
        priceText: "₦15k/hr",
        imageUrl: "https://i.pravatar.cc/300?img=68"
    },
    {
        id: "elena-petrova",
        name: "Elena Petrova",
        title: "Computational Linguistics",
        rating: 4.7,
        priceText: "₦11k/hr",
        imageUrl: "https://i.pravatar.cc/300?img=20"
    }
];

export default function TutorDetailsPage() {
    return (
        <div className="w-full bg-background min-h-screen pb-24">
            <TutorHero
                name={MOCK_TUTOR.name}
                title={MOCK_TUTOR.title}
                rating={MOCK_TUTOR.rating}
                reviews={MOCK_TUTOR.reviews}
                pricePerHour={MOCK_TUTOR.pricePerHour}
                imageUrl={MOCK_TUTOR.imageUrl}
                coverImageUrl={MOCK_TUTOR.coverImageUrl}
                isVerified={MOCK_TUTOR.isVerified}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12 pt-20">
                <div className="lg:col-span-2">
                    <TutorAbout
                        description={MOCK_TUTOR.description}
                        subjects={MOCK_TUTOR.subjects}
                        videoUrl={MOCK_TUTOR.videoUrl}
                    />
                </div>

                <div className="lg:col-span-1">
                    <TutorBookingSidebar
                        tutorName={MOCK_TUTOR.name}
                        headline={MOCK_TUTOR.title}
                        avatarUrl={MOCK_TUTOR.imageUrl}
                        pricePerHour={MOCK_TUTOR.pricePerHour}
                        responseTimeText={MOCK_TUTOR.responseTimeText}
                    />
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <SimilarTutors tutors={MOCK_SIMILAR_TUTORS} />
            </div>
        </div>
    );
}
