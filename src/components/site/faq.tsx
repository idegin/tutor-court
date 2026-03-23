"use client"

import React, { useState } from 'react';
import { HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import { cn } from '@/lib/utils';

const faqs = [
    {
        id: "faq-1",
        question: "How do I know if a tutor is qualified?",
        answer: "Every tutor on Academia undergoes a rigorous verification process, including background checks, academic credential verification, and a teaching skills assessment session."
    },
    {
        id: "faq-2",
        question: "Is the first consultation really free?",
        answer: "Yes! We believe in finding the right match. Most tutors offer a 15-30 minute introductory session at no cost to discuss goals and learning styles."
    },
    {
        id: "faq-3",
        question: "How does the payment system work?",
        answer: "We use a secure escrow system. You fund the lesson in advance; we hold the payment and only release it to the tutor once the lesson is successfully completed and confirmed."
    }
];

export function FaqSection() {
    const [openId, setOpenId] = useState<string | null>("faq-1");

    const toggleFaq = (id: string) => {
        setOpenId(openId === id ? null : id);
    };

    return (
        <section className="py-24 px-4 md:px-8 bg-muted/30">
            <div className="container mx-auto max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-lg text-muted-foreground font-semibold">
                        Everything you need to know about the Academia platform.
                    </p>
                </div>

                <div className="flex flex-col gap-6">
                    {faqs.map((faq) => {
                        const isOpen = openId === faq.id;

                        return (
                            <div
                                key={faq.id}
                                className={cn(
                                    "bg-card border-2 border-foreground rounded-[2rem] overflow-hidden transition-all duration-300",
                                )}
                            >
                                <button
                                    onClick={() => toggleFaq(faq.id)}
                                    className="w-full flex items-center justify-between p-8 text-left focus:outline-none"
                                >
                                    <h3 className="text-xl md:text-2xl font-black text-foreground">
                                        {faq.question}
                                    </h3>
                                    <div className="flex-shrink-0 ml-4 text-primary">
                                        {isOpen ? (
                                            <HiChevronUp className="w-6 h-6 stroke-[3]" />
                                        ) : (
                                            <HiChevronDown className="w-6 h-6 stroke-[3]" />
                                        )}
                                    </div>
                                </button>

                                <div
                                    className={cn(
                                        "grid transition-all duration-300 ease-in-out",
                                        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                    )}
                                >
                                    <div className="overflow-hidden">
                                        <p className="text-lg text-muted-foreground font-medium px-8 pb-8 pt-0 leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}