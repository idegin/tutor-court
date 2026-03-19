import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WwwLayout } from "@/components/layout/www-layout"

export function HeroSection() {
    return (
        <section className="relative overflow-hidden bg-secondary/10 py-16 sm:py-24 min-h-screen flex items-center">
            <WwwLayout className="relative">
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
                    <div>
                        <Badge
                            variant="outline"
                            className="mb-6 bg-card px-3 py-1 text-muted-foreground"
                        >
                            Trusted by 5,000+ educators
                        </Badge>

                        <h1 className="max-w-xl text-4xl leading-[1.05] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            Professionalize Your <span className="text-primary">Tutoring</span>
                            {" "}& Find Top K-12 Tutors
                        </h1>

                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                            The all-in-one LMS designed to help independent tutors thrive and
                            students excel through data-driven, interactive learning.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Button className="h-11 px-8 text-base font-semibold shadow-sm">
                                Find a Tutor
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 px-8 text-base font-semibold shadow-sm bg-card"
                            >
                                Start Tutoring
                            </Button>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-lg lg:max-w-none lg:pl-10">
                        <div className="overflow-hidden rounded-2xl border bg-background text-card-foreground shadow-sm">
                            <div className="flex border-b bg-muted/40 p-4 pb-0">
                                <div className="flex gap-2 pb-4">
                                    <div className="size-3 rounded-full bg-border" />
                                    <div className="size-3 rounded-full bg-border" />
                                    <div className="size-3 rounded-full bg-border" />
                                </div>
                            </div>
                            <div className="p-6 sm:p-10">
                                <div className="mb-6 h-32 rounded-xl border bg-muted/20" />
                                <div className="rounded-xl border bg-card p-6 shadow-sm">
                                    <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Growth tracker
                                    </p>
                                    <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">+42% Progress</p>
                                    <div className="mt-4 flex items-center gap-4">
                                        <div className="h-2 w-full flex-1 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full w-3/4 rounded-full bg-primary" />
                                        </div>
                                        <span className="text-sm font-medium text-muted-foreground">75%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WwwLayout>
        </section>
    )
}
