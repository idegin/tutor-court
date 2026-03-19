"use client"

import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { WwwLayout } from "@/components/layout/www-layout"

const navLinks = [
  { href: "#for-parents", label: "For Parents" },
  { href: "#for-tutors", label: "For Tutors" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
]

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <WwwLayout>
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="TutorCourt logo"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-lg font-black tracking-tight text-foreground">
              TutorCourt
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button
              className="px-6 font-semibold shadow-sm"
              size="sm"
            >
              Login
            </Button>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl md:hidden"
                aria-label="Open navigation menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5"
                >
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background">
              <SheetHeader>
                <SheetTitle className="text-left text-foreground">Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-6 pb-6">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-2xl border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
                <Button className="mt-2 font-bold">
                  Login
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </WwwLayout>
    </header>
  )
}
