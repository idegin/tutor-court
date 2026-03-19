import Image from "next/image"
import Link from "next/link"
import { FaFacebook, FaXTwitter, FaEnvelope } from "react-icons/fa6"

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
]

const legalLinks = [
    { href: "#privacy", label: "Privacy Policy" },
    { href: "#terms", label: "Terms of Service" },
]

export function HomeFooter() {
    return (
        <footer className="border-t bg-secondary py-16 text-secondary-foreground">
            <WwwLayout>
                <div className="grid gap-12 md:grid-cols-4 lg:grid-cols-5">
                    <div className="space-y-6 md:col-span-2 lg:col-span-3">
                        <Link href="/" className="inline-flex items-center gap-2">
                            <Image
                                src="/logo.png"
                                alt="TutorCourt logo"
                                width={28}
                                height={28}
                                className="rounded-lg"
                            />
                            <span className="text-xl font-bold tracking-tight">TutorCourt</span>
                        </Link>
                        <p className="max-w-xs text-sm leading-relaxed text-secondary-foreground/80">
                            The all-in-one platform for seamless home tutoring management and
                            data-driven student success.
                        </p>
                        <div className="flex items-center gap-4">
                            {[
                                { label: "Facebook", icon: <FaFacebook className="size-4" /> },
                                { label: "X", icon: <FaXTwitter className="size-4" /> },
                                { label: "Email", icon: <FaEnvelope className="size-4" /> },
                            ].map((item) => (
                                <a
                                    key={item.label}
                                    href="#"
                                    aria-label={item.label}
                                    className="inline-flex size-10 items-center justify-center rounded-full bg-secondary-foreground/10 text-secondary-foreground shadow-sm transition-colors hover:bg-secondary-foreground/20"
                                >
                                    {item.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Platform</h3>
                        <ul className="space-y-3 text-sm text-secondary-foreground/80">
                            {platformLinks.map((link) => (
                                <li key={link.label}>
                                    <a className="transition-colors hover:text-secondary-foreground" href={link.href}>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold tracking-wider uppercase text-secondary-foreground">Company</h3>
                        <ul className="space-y-3 text-sm text-secondary-foreground/80">
                            {companyLinks.map((link) => (
                                <li key={link.label}>
                                    <a className="transition-colors hover:text-secondary-foreground" href={link.href}>
                                        {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <Separator className="my-10 bg-secondary-foreground/20" />

                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-secondary-foreground/80">
                        © {new Date().getFullYear()} TutorCourt. All rights reserved.
                    </p>
                    <ul className="flex gap-4 text-sm text-secondary-foreground/80">
                        {legalLinks.map((link) => (
                            <li key={link.label}>
                                <a className="transition-colors hover:text-secondary-foreground hover:underline hover:underline-offset-4" href={link.href}>
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </WwwLayout>
        </footer>
    )
}
