const fs = require('fs');
let code = fs.readFileSync('src/components/auth/auth-layout.tsx', 'utf8');

code = code.replace(
`                <Image
                    src={imageUrl}
                    alt="Students studying"
                    fill
                    className="object-cover opacity-50 mix-blend-overlay"
                    unoptimized
                />`,
`                {imageUrl && (
                    <Image
                        src={imageUrl}
                        alt="Background"
                        fill
                        className="object-cover opacity-50 mix-blend-overlay"
                        unoptimized
                    />
                )}`);

fs.writeFileSync('src/components/auth/auth-layout.tsx', code);
