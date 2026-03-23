import React from 'react';
import Link from 'next/link';

export function CallToAction() {
    return (
        <section className="py-24 px-4 md:px-8 bg-card">
            <div className="container mx-auto max-w-7xl">
                <div className="relative overflow-hidden bg-primary rounded-[3rem] border-2 border-foreground px-6 py-20 text-center flex flex-col items-center">
                    {/* Decorative Shapes */}
                    <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-tutor-red-500 rounded-full" />
                    <div className="absolute -top-16 -right-16 w-48 h-48 bg-tutor-purple-200 rounded-full" />

                    <div className="relative z-10 max-w-4xl w-full">
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground mb-6 leading-tight">
                            Ready to reach your potential?
                        </h2>

                        <p className="text-lg md:text-xl font-bold text-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                            Join the hundreds of students and elite educators who have found their perfect academic match today.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                            <Link
                                href="/find-tutors"
                                className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-black py-4 px-10 rounded-full text-lg transition-colors"
                            >
                                Start Searching Now
                            </Link>

                            <Link
                                href="/auth/register?type=tutor"
                                className="w-full sm:w-auto bg-background text-foreground hover:bg-background/90 font-black py-4 px-10 rounded-full text-lg transition-colors border-2 border-foreground"
                            >
                                Become a Tutor
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
