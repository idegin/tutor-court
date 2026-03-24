import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16 bg-background text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center border-[3px] border-foreground mb-8">
                <HiOutlineMagnifyingGlass className="w-12 h-12 text-foreground" />
            </div>

            <h1 className="text-7xl md:text-9xl font-black text-foreground mb-4 tracking-tight">
                404
            </h1>

            <h2 className="text-2xl md:text-4xl font-black text-foreground mb-6">
                Page not found
            </h2>

            <p className="text-lg font-bold text-muted-foreground max-w-md mb-10">
                Oops! The page you are looking for doesn't exist, has been moved, or is currently unavailable.
            </p>

            <Link href="/" className="block">
                <Button size="lg" className="h-14 px-8 text-lg font-black bg-primary text-primary-foreground border-[3px] border-foreground rounded-xl hover:bg-primary/90 transition-all">
                    Return Home
                </Button>
            </Link>
        </div>
    );
}