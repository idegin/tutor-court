"use client";

import { useState } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { WelcomeStep } from "@/components/tutor-onboarding/welcome-step";
import { AccountBasicsStep } from "@/components/tutor-onboarding/account-basics-step";
import { TeachingProfileStep } from "@/components/tutor-onboarding/teaching-profile-step";
import { PreferencesStep } from "@/components/tutor-onboarding/preferences-step";
import { HiUser as User, HiBookOpen as BookOpen, HiClock as Clock } from "react-icons/hi2";

export default function TutorOnboarding() {
    const [step, setStep] = useState(0);

    const steps = [
        {
            id: 0,
            component: <WelcomeStep onNext={() => setStep(1)} />,
            panelContext: "welcome"
        },
        {
            id: 1,
            component: <AccountBasicsStep onNext={() => setStep(2)} onBack={() => setStep(0)} />,
            panelContext: "basics"
        },
        {
            id: 2,
            component: <TeachingProfileStep onNext={() => setStep(3)} onBack={() => setStep(1)} />,
            panelContext: "teaching"
        },
        {
            id: 3,
            component: <PreferencesStep onComplete={() => console.log('Finish!')} onBack={() => setStep(2)} />,
            panelContext: "preferences"
        }
    ];

    const currentStepConfig = steps[step];

    const renderPanelContent = () => {
        switch (currentStepConfig.panelContext) {
            case "welcome":
                return (
                    <div className="flex h-full w-full flex-col justify-end pb-12">
                        <div className="relative w-full max-w-[480px] overflow-hidden rounded-[2rem] border border-border bg-card/60 p-10 pb-12 shadow-2xl backdrop-blur-md">
                            <div className="mb-6">
                                <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                            </div>
                            <h2 className="text-[1.75rem] font-bold leading-snug tracking-wide text-foreground">
                                "TutorCourt provided me with the tools to reach students globally, expanding my teaching business exponentially."
                            </h2>
                            <div className="mt-8 flex items-center gap-4">
                                <div className="h-0.5 w-6 bg-primary" />
                                <p className="text-base font-medium text-muted-foreground">
                                    Sarah Jenkins, Mathematics Tutor
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case "basics":
                return (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl transition duration-1000 group-hover:bg-primary/40"></div>
                            <div className="relative flex aspect-square w-[340px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-10 text-center shadow-2xl backdrop-blur-md transition-all duration-500 ease-out hover:scale-105">
                                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    <User size={48} className="drop-shadow-md" />
                                </div>
                                <h3 className="mb-3 text-2xl font-bold text-foreground">Your Profile</h3>
                                <p className="text-muted-foreground">A complete profile attracts top students. Make your first impression count.</p>
                            </div>
                        </div>
                    </div>
                );
            case "teaching":
                return (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl transition duration-1000 group-hover:bg-primary/40"></div>
                            <div className="relative flex aspect-square w-[340px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-10 text-center shadow-2xl backdrop-blur-md transition-all duration-500 ease-out hover:scale-105">
                                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    <BookOpen size={48} className="drop-shadow-md" />
                                </div>
                                <h3 className="mb-3 text-2xl font-bold text-foreground">Your Expertise</h3>
                                <p className="text-muted-foreground">Detail your teaching methods to find students who match your style perfectly.</p>
                            </div>
                        </div>
                    </div>
                );
            case "preferences":
                return (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-1 rounded-2xl bg-primary/20 blur-xl transition duration-1000 group-hover:bg-primary/40"></div>
                            <div className="relative flex aspect-square w-[340px] flex-col items-center justify-center rounded-3xl border border-border bg-card/60 p-10 text-center shadow-2xl backdrop-blur-md transition-all duration-500 ease-out hover:scale-105">
                                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                                    <Clock size={48} className="drop-shadow-md" />
                                </div>
                                <h3 className="mb-3 text-2xl font-bold text-foreground">Availability</h3>
                                <p className="text-muted-foreground">Set your hours and let our system automatically manage your bookings.</p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <AuthLayout
            variant="split"
            imageUrl="/images/office-workers.jpg"
            flipped={true}
            panelContent={
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    {renderPanelContent()}
                </div>
            }
        >
            {currentStepConfig.component}
        </AuthLayout>
    );
}
