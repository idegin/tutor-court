const fs = require('fs');
let code = fs.readFileSync('src/components/auth/auth-layout.tsx', 'utf8');

// The replacement was probably strictly whitespace dependent. Let's use regex
code = code.replace(/\s*\{\/\*\s*Header - just logo\s*\*\/\}\s*<header className="flex h-24 items-center">[\s\S]*?<\/header>/, '');

const headerHtml = `
            {/* Absolute Global Header for Split Layout */}
            <header className="absolute top-0 left-0 right-0 h-24 px-6 sm:px-10 lg:px-16 flex items-center justify-between z-50">
                <Link href="/" className="inline-flex items-center gap-2.5">
                    <Image
                        src="/logo.png"
                        alt="TutorCourt logo"
                        width={32}
                        height={32}
                        className="rounded-md"
                    />
                    <span className="text-xl font-bold tracking-tight text-foreground">TutorCourt</span>
                </Link>
                
                {navLinks && navLinks.length > 0 && (
                    <nav className="hidden md:flex items-center gap-8">
                        {navLinks.map((item) => (
                            <Link key={item.href + item.label} href={item.href} className="text-[15px] font-semibold hover:text-primary transition-colors">
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>
`;

if (!code.includes("Absolute Global Header")) {
code = code.replace(
`    return (
        <div className={cn('relative flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2', className)}>
            {/* Left Column (Content) */}`,
`    return (
        <div className={cn('relative flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2', className)}>
${headerHtml}
            {/* Left Column (Content) */}`);
}            

code = code.replace(`left-0 right-0 p-12 lg:p-20"`, `left-0 right-0 p-12 lg:p-20 pt-24"`);

fs.writeFileSync('src/components/auth/auth-layout.tsx', code);
