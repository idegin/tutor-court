import Image from "next/image"
import Link from "next/link"

import { Separator } from "@/components/ui/separator"
import { WwwLayout } from "@/components/layout/www-layout"

const platformLinks = [
    { href: "#for-parents", label: "For Parents" },
    { href: "#for-tutors", label: "For Tutors" },
    { href: "#scheduling", label: "Smart Scheduling" },
    { href: "#classroom", label: "Integrated Classroom" },
]

const companyLinks = [
    { href: "#about", label: "About Us" },
    { href: "#contact", label: "Contact" },
    { href: "#privacy", label: "Privacy Policy" },
    { href: "#terms", label: "Terms of Service" },
]

export function HomeFooter() {
    return (
        <footer className="bg-foreground py-14 text-background">
            <WwwLayout>
                <div className="grid gap-10 md:grid-cols-3">
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <Image
                                src="/logo.png"
                                alt="TutorCourt logo"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            <span className="text-2xl font-black text-background">TutorCourt</span>
                        </Link>
                        <p className="max-w-sm text-sm leading-relaxed text-background/75">
                            The all-in-one platform for seamless home tutoring management and
                            data-driven student success.
                        </p>
                        <div className="flex items-center gap-3">
                            {[
                                { label: "Facebook", short: "f" },
                                { label: "X", short: "x" },
                                { label: "Email", short: "@" },
                            ].map((item) => (
                                <a
                                    key={item.label}
                                    href="#"
                                    aria-label={item.label}
                                    className="inline-flex size-9 items-center justify-center rounded-full bg-background/10 text-sm font-bold text-background transition-colors hover:bg-background/20"
                                >
                                    {item.short}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 text-lg font-semibold text-background">Platform</h3>
                        <ul className="space-y-2 text-sm text-background/75">
                            {platformLinks.map((link) => (
                                <li key={link.label}>
                                    <a className="transition-colors hover:text-background" href={link.href}>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="mb-3 text-lg font-semibold text-background">Company</h3>
                        <ul className="space-y-2 text-sm text-background/75">
                            {companyLinks.map((link) => (
                                <li key={link.label}>
                                    <a className="transition-colors hover:text-background" href={link.href}>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Separator className="my-8 bg-background/15" />

                <p className="text-center text-xs text-background/60">
                    © 2026 TutorCourt. All rights reserved. Elevating the standard of home
                    tutoring.
                </p>
            </WwwLayout>
        </footer>
    )
}
