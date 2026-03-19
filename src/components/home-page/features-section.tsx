import { WwwLayout } from "@/components/layout/www-layout"
import { FaChartBar, FaGamepad, FaVideo, FaCheckCircle } from "react-icons/fa"

export function FeaturesSection() {
    return (
        <section className="bg-background py-16 sm:py-24">
            <WwwLayout>
                <div className="mb-12 text-center md:mb-16">
                    <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
                        Empower Their Academic Journey
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        We bridge the gap between classroom teaching and individual success with
                        tools built for modern K-12 students.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {/* Interactive Video Classrooms (Spans 2 cols) */}
                    <div className="group relative overflow-hidden rounded-3xl bg-card p-8 md:col-span-2">
                        <div className="flex h-full flex-col justify-between sm:flex-row sm:items-center sm:gap-8">
                            <div className="relative z-10 flex-1">
                                <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutor-red-500">
                                    <FaVideo />
                                    Live Interaction
                                </div>
                                <h3 className="mb-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                    Interactive Video <br className="hidden sm:block" /> Classrooms
                                </h3>
                                <p className="max-w-md text-muted-foreground leading-relaxed">
                                    No more passive watching. Our proprietary video rooms include
                                    collaborative whiteboards and instant polling.
                                </p>
                            </div>
                            <div className="relative mt-8 h-48 w-full flex-1 sm:mt-0 sm:h-64">
                                <div className="absolute right-0 top-1/2 -mt-24 h-48 w-64 -rotate-3 overflow-hidden rounded-2xl bg-muted shadow-lg transition-transform group-hover:-rotate-1">
                                    {/* Placeholder for kids using tablet image */}
                                    <div className="h-full w-full bg-gradient-to-tr from-amber-100 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/40" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Real-Time Tracking */}
                    <div className="group overflow-hidden rounded-3xl bg-tutor-purple-200 dark:bg-tutor-purple-900 p-8 dark:border-tutor-purple-900/50">
                        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur-sm">
                            <FaChartBar className="text-tutor-purple-600 dark:text-tutor-purple-300" />
                        </div>
                        <h3 className="mb-3 text-2xl font-black tracking-tight text-foreground">
                            Real-Time Tracking
                        </h3>
                        <p className="text-foreground/80 leading-relaxed dark:text-foreground/90">
                            Weekly performance insights and direct messaging with tutors to
                            ensure no child is left behind.
                        </p>
                    </div>

                    {/* Gamified Rewards */}
                    <div className="group overflow-hidden rounded-3xl bg-primary/10 p-8">
                        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-primary">
                            <FaGamepad className="text-primary-foreground" />
                        </div>
                        <h3 className="mb-3 text-2xl font-black tracking-tight text-foreground">
                            Gamified Rewards
                        </h3>
                        <p className="text-foreground/80 leading-relaxed dark:text-foreground/90">
                            Students earn badges and points for finishing assignments, keeping
                            motivation high and engagement consistent.
                        </p>
                    </div>

                    {/* Verified Expert Tutors (Spans 2 cols) */}
                    <div className="group relative overflow-hidden rounded-3xl bg-card p-8 md:col-span-2">
                        <div className="flex h-full flex-col-reverse justify-between sm:flex-row sm:items-center sm:gap-8">
                            <div className="relative mt-8 h-48 w-full flex-1 sm:mt-0 sm:h-64">
                                <div className="absolute left-0 top-1/2 -mt-24 h-48 w-48 rotate-3 overflow-hidden rounded-3xl bg-muted shadow-lg transition-transform group-hover:rotate-1 sm:h-56 sm:w-56 sm:-mt-28">
                                    {/* Placeholder for tutor profile image */}
                                    <div className="h-full w-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-800 dark:to-stone-700" />
                                </div>
                            </div>
                            <div className="relative z-10 flex-1 sm:pl-8">
                                <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                                    <FaCheckCircle />
                                    Quality Guaranteed
                                </div>
                                <h3 className="mb-3 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                                    Verified Expert <br className="hidden sm:block" /> Tutors
                                </h3>
                                <p className="max-w-md text-muted-foreground leading-relaxed">
                                    Every tutor undergoes a rigorous background check and pedagogical
                                    assessment before joining our ranks.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </WwwLayout>
        </section>
    )
}
