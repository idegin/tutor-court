import React from 'react';

export interface SubjectProps {
    name: string;
    icon?: React.ReactNode;
    colorClass: string;
}

export interface TutorAboutProps {
    description: React.ReactNode;
    subjects: SubjectProps[];
    videoUrl?: string;
}

export function TutorAbout({ description, subjects, videoUrl }: TutorAboutProps) {
    return (
        <div className="flex flex-col gap-12">
            <section>
                <h2 className="text-3xl font-black text-foreground mb-6">About Me</h2>
                <div className="text-lg font-medium text-muted-foreground leading-relaxed space-y-6">
                    {description}
                </div>
            </section>

            <section>
                <h2 className="text-3xl font-black text-foreground mb-6">Subjects</h2>
                <div className="flex flex-wrap gap-4">
                    {subjects.map((subject, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-5 py-3 rounded-xl border-[3px] border-foreground font-bold ${subject.colorClass}`}>
                            {subject.icon}
                            <span>{subject.name}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-3xl font-black text-foreground mb-6">Meet Your Tutor</h2>
                <div className="relative w-full aspect-video bg-muted rounded-[2rem] border-[3px] border-foreground overflow-hidden flex items-center justify-center">
                    {videoUrl ? (
                        <iframe
                            src={videoUrl}
                            title="Tutor Intro Video"
                            className="w-full h-full object-cover"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                            <button className="w-20 h-20 bg-primary rounded-full flex items-center justify-center border-[3px] border-foreground hover:scale-105 transition-transform">
                                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-foreground border-b-[12px] border-b-transparent ml-2"></div>
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
