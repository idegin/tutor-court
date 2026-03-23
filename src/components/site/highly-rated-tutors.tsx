import React from 'react';
import { HiStar, HiChevronRight } from 'react-icons/hi2';

export function HighlyRatedTutors() {
    return (
        <section className="py-24 px-4 md:px-8 bg-background">
            <div className="container mx-auto max-w-7xl">
                <div className="mb-12">
                    <h3 className="text-xs font-black tracking-widest text-tutor-red-500 uppercase mb-3">
                        Elite Educators
                    </h3>
                    <h2 className="text-4xl md:text-5xl font-black text-foreground max-w-2xl leading-tight">
                        Highest Rated Tutors This Month
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* Main Large Card */}
                    <div className="lg:col-span-8 bg-primary/10 rounded-[2rem] border-2 border-foreground p-6 md:p-10 flex flex-col md:flex-row gap-8">
                        {/* Image Side */}
                        <div className="w-full md:w-5/12 flex-shrink-0 relative flex items-center justify-center">
                            {/* Tilted frame mimicking rotation */}
                            <div className="relative w-full aspect-[4/5] max-w-[320px] mx-auto group">
                                <div className="absolute inset-0 bg-secondary rounded-[2.5rem] border-2 border-foreground overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600"
                                        alt="Dr. Chioma Adebayo"
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                {/* Rating Badge */}
                                <div className="absolute bottom-6 left-[-10px] md:left-[-15px] bg-card border-2 border-foreground rounded-full px-5 py-2.5 flex items-center gap-1.5 z-10">
                                    <HiStar className="w-4 h-4 text-tutor-red-500" />
                                    <span className="text-sm font-bold text-card-foreground">4.9 <span className="text-sm font-semibold text-foreground">(240 reviews)</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Content Side */}
                        <div className="w-full md:w-7/12 flex flex-col justify-center">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <span className="px-3 py-1.5 bg-primary text-foreground text-[10px] font-bold tracking-wider uppercase rounded-full">
                                    Physics Specialist
                                </span>
                                <span className="px-3 py-1.5 bg-tutor-purple-200 text-foreground text-[10px] font-bold tracking-wider uppercase rounded-full">
                                    PhD Holder
                                </span>
                            </div>

                            <h3 className="text-4xl md:text-5xl font-black text-card-foreground leading-tight mb-4">
                                Dr. Chioma <br />Adebayo
                            </h3>

                            <p className="text-muted-foreground font-medium leading-relaxed mb-8">
                                Expert in Quantum Mechanics and Advanced Calculus. Over 10 years of experience helping students bridge the gap between theory and application.
                            </p>

                            <div className="mt-auto">
                                <p className="text-sm font-bold text-muted-foreground/60 mb-1">Hourly Rate</p>
                                <div className="text-3xl font-black text-card-foreground mb-6 flex items-baseline">
                                    ₦12,500<span className="text-base font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <button className="bg-foreground hover:bg-foreground/90 text-background font-bold py-4 px-8 rounded-[1.2rem] w-full md:w-auto transition-colors">
                                    Book a Free Consultation
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Smaller Cards Column */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Small Card 1 */}
                        <div className="bg-card rounded-[2rem] border-2 border-foreground p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-[#F6DFA9] border-2 border-foreground rounded-[1.2rem] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=150"
                                        alt="David Okoro"
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-card-foreground leading-none mb-1">David Okoro</h4>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <HiStar className="w-3.5 h-3.5 text-tutor-red-500" />
                                        <span className="text-xs font-bold text-card-foreground">4.8 <span className="text-foreground font-semibold">(112 reviews)</span></span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6 flex-grow">
                                Creative Writing & Literature. I focus on developing a student's unique voice through intensive analysis.
                            </p>

                            <div className="flex items-baseline justify-between mt-auto">
                                <div className="text-xl font-black text-card-foreground flex items-baseline">
                                    ₦6,000<span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <button className="flex items-center gap-1 text-sm font-black text-card-foreground hover:text-primary transition-colors">
                                    Profile <HiChevronRight className="w-4 h-4 stroke-[3]" />
                                </button>
                            </div>
                        </div>

                        {/* Small Card 2 */}
                        <div className="bg-tutor-purple-50 rounded-[2rem] border-2 border-foreground p-6 md:p-8 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-[#eebf99] border-2 border-foreground rounded-[1.2rem] overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    <img
                                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
                                        alt="Fatima Bello"
                                        className="w-full h-full object-cover opacity-90"
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-card-foreground leading-none mb-1">Fatima Bello</h4>
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <HiStar className="w-3.5 h-3.5 text-tutor-red-500" />
                                        <span className="text-xs font-bold text-card-foreground">5.0 <span className="text-foreground font-semibold">(89 reviews)</span></span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6 flex-grow">
                                Mathematics and Statistics. Simplified approach to complex equations for WAEC/JAMB prep.
                            </p>

                            <div className="flex items-baseline justify-between mt-auto">
                                <div className="text-xl font-black text-card-foreground flex items-baseline">
                                    ₦8,500<span className="text-sm font-semibold text-muted-foreground/60 ml-0.5">/hr</span>
                                </div>
                                <button className="flex items-center gap-1 text-sm font-black text-card-foreground hover:text-primary transition-colors">
                                    Profile <HiChevronRight className="w-4 h-4 stroke-[3]" />
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
