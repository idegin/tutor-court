import Link from 'next/link';
import { HiOutlineGlobeAlt, HiOutlineEnvelope } from 'react-icons/hi2';

export function SiteFooter() {
    return (
        <footer className="w-full bg-background border-t border-border pt-16 pb-8 text-foreground">
            <div className="container mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-8 mb-16">
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-foreground">Academia</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground max-w-xs font-medium">
                            Premium educational matchmaking platform connecting students with elite professional tutors.
                        </p>
                        <div className="flex space-x-4 pt-2">
                            <Link href="#" className="flex items-center justify-center w-10 h-10 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                                <HiOutlineGlobeAlt className="w-5 h-5" />
                            </Link>
                            <Link href="#" className="flex items-center justify-center w-10 h-10 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                                <HiOutlineEnvelope className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-bold tracking-widest text-foreground uppercase">PLATFORM</h4>
                        <ul className="space-y-4">
                            <li><Link href="/find-tutors" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Find Tutors</Link></li>
                            <li><Link href="/parents" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">For Parents</Link></li>
                            <li><Link href="/tutors" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">For Tutors</Link></li>
                            <li><Link href="/resources" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Resources</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-bold tracking-widest text-foreground uppercase">LEGAL & SUPPORT</h4>
                        <ul className="space-y-4">
                            <li><Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/safety" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Safety Guidelines</Link></li>
                            <li><Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-xs font-bold tracking-widest text-foreground uppercase">GET APP</h4>
                        <p className="text-sm font-medium text-muted-foreground max-w-xs">
                            Experience our mobile platform on the go.
                        </p>
                        <div className="space-y-4 pt-2">
                            <Link href="#" className="flex items-center space-x-3 bg-secondary text-secondary-foreground px-5 py-2.5 rounded-[1.5rem] max-w-[200px] hover:bg-secondary/80 transition-colors">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.36 14c.08-.02.14-.02.22-.05.15-.05.31-.09.46-.14.07-.03.14-.05.21-.08.15-.07.3-.14.44-.22.06-.04.12-.07.18-.11.14-.08.27-.18.4-.27.06-.04.11-.08.16-.13.12-.09.24-.2.35-.3s.1-.1.15-.15c.1-.11.2-.23.29-.35l.13-.17c.09-.12.16-.25.23-.38l.1-.2.16-.38.07-.22c.04-.13.07-.26.1-.4l.04-.23c.02-.13.03-.26.03-.4 0-.17-.02-.34-.05-.51l-.03-.23c-.03-.13-.06-.26-.1-.38l-.06-.22c-.06-.13-.12-.26-.18-.38l-.1-.2c-.08-.12-.17-.24-.26-.35-.04-.05-.08-.1-.13-.15-.1-.11-.21-.2-.33-.3l-.16-.13c-.12-.09-.25-.18-.38-.26l-.19-.11c-.13-.07-.27-.14-.41-.2l-.21-.08c-.14-.05-.28-.09-.43-.13l-.22-.05c-.15-.03-.31-.05-.46-.05H7c-.17 0-.34.02-.51.05l-.23.03c-.15.04-.29.08-.43.13l-.21.08c-.14.06-.28.13-.41.2l-.19.11c-.13.08-.26.17-.38.26l-.16.13c-.12.1-.23.2-.33.3l-.13.15c-.09.11-.18.23-.26.35l-.1.2c-.06.12-.12.25-.18.38l-.06.22c-.04.13-.07.26-.1.38H4V18h16v-4h-3.64Z" />
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 1.2.32 2.33.88 3.3l4.63 7.85c.34.58.94.93 1.58.93s1.24-.35 1.58-.93l4.63-7.85c.57-.96.88-2.09.88-3.3 0-3.87-3.13-7-7-7Zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Z" />
                                </svg>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1 text-secondary-foreground/70">Download on the</span>
                                    <span className="text-sm font-bold leading-none">App Store</span>
                                </div>
                            </Link>

                            <Link href="#" className="flex items-center space-x-3 bg-card text-foreground border border-border px-5 py-2.5 rounded-[1.5rem] max-w-[200px] hover:border-primary transition-colors">
                                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3.738 2.012c-.521.144-.805.4-.954.832-.07.195-.084.773-.084 3.702v3.456l6.837 3.864 6.836 3.864.717-.39.718-.389-7.009-4.321C7.883 10.155 4.605 8.243 3.655 7.69l-1.728-.999v12.274l8.361-4.838 8.36 4.838.487-.27.488-.27V2.91c0-.709-.009-.769-.138-.934-.148-.19-.313-.275-.544-.275-.195 0-.585.1-1.31.332L3.738 2.012z" />
                                    <path d="M5.42 2.37L15 7.633 4.887 13 4.88 4.292c-.006-2.585-.008-2.617-.234-2.673-.427-.105-.333-.314.774.75z" />
                                </svg>
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold tracking-wider leading-none mb-1 text-muted-foreground">Get it on</span>
                                    <span className="text-sm font-bold leading-none">GOOGLE PLAY</span>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="pt-8 mt-8 border-t border-border flex flex-col md:flex-row items-center justify-between">
                    <p className="text-sm font-semibold text-muted-foreground">
                        © 2024 Academia Editorial. All rights reserved.
                    </p>
                    <div className="flex gap-8 mt-4 md:mt-0">
                        <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Instagram</Link>
                        <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">LinkedIn</Link>
                        <Link href="#" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">Twitter</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
