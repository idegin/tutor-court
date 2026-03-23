import React from 'react';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi2';

const reviews = [
    {
        id: 1,
        quote: "Finding a tutor who actually understands how my son learns was a challenge until we found TutorCourt. His grades in Physics jumped from a C to an A within one term.",
        author: "Mrs. Funmi Balogun",
        role: "Parent of Year 11 Student",
        avatarUrl: "https://xsgames.co/randomusers/assets/avatars/female/11.jpg"
    }
];

export function ReviewsSection() {
    return (
        <section className="py-24 px-4 md:px-8 bg-card overflow-hidden">
            <div className="container mx-auto max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">

                    {/* Left: Text & Review Card */}
                    <div className="flex flex-col relative z-10">
                        {/* Decorative Quote Mark */}
                        <div className="absolute -top-12 -left-8 text-primary/10 pointer-events-none pb-4">
                            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                        </div>

                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-4 leading-tight relative mt-6 max-w-xl">
                            Trusted by over <br />
                            <span className="text-tutor-red-500">2,000+</span> parents <br />
                            across Nigeria.
                        </h2>

                        {/* Navigation Arrows */}
                        <div className="flex gap-3 mb-6 self-end mr-4 relative translate-y-2 z-20">
                            <button className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-foreground bg-background hover:bg-muted transition-colors">
                                <HiArrowLeft className="w-5 h-5 text-foreground stroke-[3]" />
                            </button>
                            <button className="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-foreground bg-foreground hover:bg-foreground/90 transition-colors">
                                <HiArrowRight className="w-5 h-5 text-background stroke-[3]" />
                            </button>
                        </div>

                        {/* Active Review Card */}
                        <div className="bg-primary/10 rounded-[2.5rem] border-[3px] border-foreground p-8 md:p-10 relative">
                            <p className="text-lg md:text-xl font-semibold italic text-foreground mb-8 leading-relaxed">
                                "{reviews[0].quote}"
                            </p>

                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-tutor-red-100 dark:bg-tutor-red-900 border-[3px] border-foreground rounded-[1rem] overflow-hidden flex-shrink-0 p-1">
                                    <img
                                        src={reviews[0].avatarUrl}
                                        alt={reviews[0].author}
                                        className="w-full h-full object-cover rounded-lg"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-foreground leading-none mb-1">
                                        {reviews[0].author}
                                    </h4>
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        {reviews[0].role}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Abstract Collage of Images */}
                    <div className="relative h-[600px] lg:h-[700px] w-full flex items-center justify-center">

                        {/* Top Right Box (Smiling Boy) */}
                        <div className="absolute top-[2%] right-[5%] w-[45%] h-[40%] bg-primary rounded-[2rem] border-[3px] border-foreground overflow-hidden z-10 transform translate-x-4 -translate-y-4">
                            <img
                                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800"
                                alt="Student smiling"
                                className="w-full h-full object-cover opacity-90"
                            />
                        </div>

                        {/* Middle Left Box (Group studying) */}
                        <div className="absolute top-[15%] left-[5%] w-[60%] h-[45%] bg-tutor-purple-200 dark:bg-tutor-purple-800 rounded-[2.5rem] border-[3px] border-foreground overflow-hidden z-20 shadow-none transform -rotate-3 hover:rotate-0 transition-transform duration-500 origin-bottom-right">
                            <img
                                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800"
                                alt="Study group"
                                className="w-full h-full object-cover opacity-95"
                            />
                        </div>

                        {/* Bottom Right Box (Teacher) */}
                        <div className="absolute bottom-[5%] right-[5%] w-[55%] h-[45%] bg-tutor-red-200 dark:bg-tutor-red-900 rounded-[2.5rem] border-[3px] border-foreground overflow-hidden z-30 transform rotate-2 hover:rotate-0 transition-transform duration-500 origin-top-left">
                            <img
                                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800"
                                alt="Teacher teaching"
                                className="w-full h-full object-cover opacity-90"
                            />
                        </div>

                        {/* Bottom Left Box (Laptop) */}
                        <div className="absolute bottom-[10%] left-[10%] w-[40%] h-[35%] bg-muted rounded-[2rem] border-[3px] border-foreground overflow-hidden z-10">
                            <img
                                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800"
                                alt="Student desk"
                                className="w-full h-full object-cover grayscale opacity-90"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}