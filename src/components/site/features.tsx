import React from 'react'
import {
    HiVideoCamera,
    HiPresentationChartLine,
    HiClipboardDocumentCheck,
    HiShieldCheck
} from 'react-icons/hi2'

const features = [
    {
        title: 'Online Lessons',
        description: 'Interactive virtual classrooms with whiteboard support and session recording.',
        icon: HiVideoCamera,
        iconBg: 'bg-primary/20 dark:bg-primary/10',
        iconColor: 'text-primary'
    },
    {
        title: 'Progress Tracking',
        description: 'Detailed reports for parents and tutors to monitor academic growth over time.',
        icon: HiPresentationChartLine,
        iconBg: 'bg-tutor-purple-100 dark:bg-tutor-purple-900/50',
        iconColor: 'text-tutor-purple-800 dark:text-tutor-purple-300'
    },
    {
        title: 'Assessments',
        description: 'Curated tests and quizzes to identify gaps and reinforce learning concepts.',
        icon: HiClipboardDocumentCheck,
        iconBg: 'bg-tutor-red-100 dark:bg-tutor-red-900/50',
        iconColor: 'text-tutor-red-800 dark:text-tutor-red-300'
    },
    {
        title: 'Escrow Payments',
        description: 'Secure fund handling ensures tutors get paid and parents get quality service.',
        icon: HiShieldCheck,
        iconBg: 'bg-muted',
        iconColor: 'text-foreground'
    }
]

export function FeaturesSection() {
    return (
        <section className="py-24 bg-card">
            <div className="container mx-auto px-4 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left content */}
                    <div>
                        <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase mb-4">Features</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-12 leading-tight">
                            Everything you need to excel in your studies.
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-12">
                            {features.map((feature, index) => (
                                <div key={index} className="flex flex-col">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 ${feature.iconBg}`}>
                                        <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm md:text-[1.05rem]">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right content (Image with overlay) */}
                    <div className="relative h-[500px] md:h-[600px] lg:h-[700px] w-full flex items-center justify-center lg:justify-end mt-12 lg:mt-0">
                        <div className="w-[90%] md:w-[85%] h-full rounded-[2.5rem] border-[3px] border-foreground overflow-hidden relative z-10 bg-muted">
                            <img
                                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
                                alt="Student studying with laptop"
                                className="w-full h-full object-cover grayscale opacity-90"
                            />
                        </div>

                        {/* Overlapping Stats Card */}
                        <div className="absolute left-0 lg:-left-8 bottom-12 z-20 bg-primary p-6 md:p-8 rounded-[2rem] border-[3px] border-foreground w-[280px] md:w-[320px]">
                            <h4 className="text-xl md:text-2xl font-black text-primary-foreground mb-3">
                                98% Success Rate
                            </h4>
                            <p className="text-primary-foreground/90 font-medium text-sm md:text-base leading-relaxed">
                                Our students report significant grade improvements within 3 months.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
