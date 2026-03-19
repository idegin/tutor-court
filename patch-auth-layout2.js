const fs = require('fs');
let code = fs.readFileSync('src/components/auth/auth-layout.tsx', 'utf8');

code = code.replace(
`                <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-20 pt-24">
                    <div className="mx-auto flex max-w-130 flex-col items-start justify-end h-full">                                                                
                        {panelContent ? (
                            panelContent
                        ) : (
                            <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#1F292E]/60 p-10 pb-12 backdrop-blur-md shadow-2xl">
                                <div className="mb-6">
                                    <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">`,
`                {panelContent ? (
                    <div className="absolute inset-0 z-10">
                        {panelContent} 
                    </div>
                ) : (
                    <div className="absolute bottom-0 left-0 right-0 p-12 lg:p-20 pt-24">
                        <div className="mx-auto flex max-w-130 flex-col items-start justify-end h-full">                                                                
                            <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#1F292E]/60 p-10 pb-12 backdrop-blur-md shadow-2xl">
                                <div className="mb-6">
                                    <svg className="h-8 w-8 text-primary" fill="currentColor" viewBox="0 0 24 24">`);

// Close out the div differently for that block. But wait, I'd better just use a regex replace or precise string replace.
