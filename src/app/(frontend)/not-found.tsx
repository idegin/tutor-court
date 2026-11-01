import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-16 bg-background text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-tutor-red-100/60 rounded-tr-full pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-0 mb-8 select-none" aria-hidden="true">
                    <span className="text-[100px] md:text-[140px] font-black leading-none text-foreground">4</span>

                    <div className="relative mx-2" style={{ width: '100px', height: '100px' }}>
                        <div
                            className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full border-[12px] md:border-[16px] border-foreground bg-transparent relative flex items-center justify-center"
                            style={{ position: 'relative' }}
                        >
                            <div className="absolute bottom-[-10px] right-[-10px] w-[36px] h-[36px] md:w-[48px] md:h-[48px] rounded-full bg-primary border-[6px] border-foreground" />
                        </div>
                    </div>

                    <span className="text-[100px] md:text-[140px] font-black leading-none text-foreground">4</span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-muted px-4 py-2 mb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground">
                        Page Not Found
                    </span>
                </div>

                <h1 className="text-2xl md:text-4xl font-black text-foreground mb-4 tracking-tight">
                    This page took a wrong turn.
                </h1>

                <p className="text-base md:text-lg font-semibold text-muted-foreground max-w-md mb-10">
                    The page you're looking for doesn't exist, has been moved, or was never here in the first place.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Link href="/search">
                        <Button
                            size="lg"
                            className="h-12 px-8 font-black bg-primary text-primary-foreground border-[3px] border-foreground rounded-xl hover:bg-primary/90 transition-all"
                        >
                            Search for tutors
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button
                            size="lg"
                            variant="outline"
                            className="h-12 px-8 font-black border-[3px] border-foreground rounded-xl hover:bg-muted transition-all"
                        >
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
