import React from 'react'
import { HiMagnifyingGlass, HiChevronDown } from 'react-icons/hi2'

export function SiteHero() {
    return (
        <div className="relative min-h-[80vh] flex flex-col items-center pt-24 pb-32 overflow-hidden bg-card">
            {/* Decorative Background Circles */}
            <div className="absolute right-[-5%] top-[10%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-tutor-purple-50 rounded-full z-0 pointer-events-none"></div>
            <div className="absolute left-[5%] bottom-[5%] w-[100px] h-[100px] md:w-[200px] md:h-[200px] bg-primary/20 rounded-full z-0 pointer-events-none"></div>

            <div className="container relative z-10 px-4 md:px-8 mx-auto flex flex-col justify-center max-w-7xl">
                <div className="max-w-3xl pt-10">
                    <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-black tracking-tight text-foreground leading-[1.05] mb-6">
                        Fine qualified <br className="hidden md:block" />
                        <span className="relative inline-block">
                            <span className="italic text-primary relative z-10">tutors</span>
                            <span className="absolute bottom-2 left-0 w-full h-[10px] bg-tutor-purple-200 z-0 rounded-sm"></span>
                        </span>
                        ,<br className="hidden md:block" /> curated for you.
                    </h1>

                    <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-xl font-medium leading-relaxed">
                        Expert tutors tailored to your learning style. Find, book,
                        and excel with TutorCourt's editorial experience.
                    </p>

                    <div className="bg-card rounded-full p-2 md:p-3 border-2 border-foreground flex flex-col md:flex-row items-center w-full max-w-4xl relative z-10">
                        {/* Subject */}
                        <div className="flex-1 w-full md:w-auto px-6 py-3 cursor-pointer group">
                            <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1">Subject</div>
                            <div className="text-foreground font-bold text-lg group-hover:text-primary transition-colors">Mathematics</div>
                        </div>

                        <div className="hidden md:block w-px h-12 bg-border"></div>

                        {/* Gender */}
                        <div className="flex-1 w-full md:w-auto px-6 py-3 cursor-pointer group">
                            <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1">Gender</div>
                            <div className="text-foreground font-bold text-lg group-hover:text-primary transition-colors">No Preference</div>
                        </div>

                        <div className="hidden md:block w-px h-12 bg-border"></div>

                        {/* Level */}
                        <div className="flex-1 w-full md:w-auto px-6 py-3 cursor-pointer group flex items-center justify-between">
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mb-1">Level</div>
                                <div className="text-foreground font-bold text-lg group-hover:text-primary transition-colors">Secondary</div>
                            </div>
                            <HiChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                        {/* Submit Button */}
                        <button className="w-full md:w-auto mt-4 md:mt-0 bg-tutor-red-500 hover:bg-tutor-red-600 text-white rounded-full px-8 py-4 flex items-center justify-center space-x-2 font-bold text-base transition-colors">
                            <HiMagnifyingGlass className="w-5 h-5" />
                            <span>Find Tutors</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
