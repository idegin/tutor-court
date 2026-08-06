import Link from 'next/link';
import { FaInstagram, FaLinkedinIn, FaXTwitter, FaFacebookF } from 'react-icons/fa6';

const socials = [
    { label: 'Instagram', href: 'https://instagram.com/tutorcourt', icon: FaInstagram },
    { label: 'X (Twitter)', href: 'https://twitter.com/tutorcourt', icon: FaXTwitter },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/tutorcourt', icon: FaLinkedinIn },
    { label: 'Facebook', href: 'https://facebook.com/tutorcourt', icon: FaFacebookF },
];

export function SiteFooter() {
    return (
        <footer className="w-full bg-background border-t border-border py-8 text-foreground">
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm font-semibold text-muted-foreground text-center md:text-left">
                        © {new Date().getFullYear()} TutorCourt. All rights reserved.
                    </p>
                    <div className="flex items-center gap-3">
                        {socials.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                className="flex items-center justify-center w-10 h-10 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            >
                                <Icon className="w-4 h-4" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
