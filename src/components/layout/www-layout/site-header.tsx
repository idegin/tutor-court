import Image from 'next/image';
import Link from 'next/link';

export function SiteHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b-2 border-foreground bg-background">
            <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-10">
                    <Link href="/" className="flex items-center space-x-2">
                        <img src="/logo.png" alt="Academia Logo" width={40} className='rounded-md' />
                        <span className='text-xl font-bold'>TutorCourt</span>
                    </Link>
                    <nav className="hidden md:flex gap-8 px-8">
                        <Link
                            href="/"
                            className="text-sm font-bold border-b-2 border-foreground pb-1"
                        >
                            Home
                        </Link>
                        <Link
                            href="/find-tutors"
                            className="text-sm font-bold text-muted-foreground hover:text-foreground pb-1 transition-colors"
                        >
                            Find Tutors
                        </Link>
                        <Link
                            href="/parents"
                            className="text-sm font-bold text-muted-foreground hover:text-foreground pb-1 transition-colors"
                        >
                            For Parents
                        </Link>
                        <Link
                            href="/tutors"
                            className="text-sm font-bold text-muted-foreground hover:text-foreground pb-1 transition-colors"
                        >
                            For Tutors
                        </Link>
                        <Link
                            href="/resources"
                            className="text-sm font-bold text-muted-foreground hover:text-foreground pb-1 transition-colors"
                        >
                            Resources
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-8">
                    <Link
                        href="/auth/login"
                        className="hidden md:block text-sm font-bold text-foreground hover:text-primary transition-colors"
                    >
                        Log In
                    </Link>
                    <Link
                        href="/auth/register"
                        className="text-sm font-bold bg-primary text-primary-foreground px-6 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
                    >
                        Sign Up
                    </Link>
                </div>
            </div>
        </header>
    );
}
