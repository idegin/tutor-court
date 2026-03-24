'use client';

import React, { useState } from 'react';
import { HiCheck } from 'react-icons/hi2';

export function SearchFilters() {
    const [selectedSubject, setSelectedSubject] = useState('Mathematics');
    const [selectedAvailability, setSelectedAvailability] = useState(['T']);

    const subjects = ['Mathematics', 'Physics', 'English'];
    const availabilityDays = [
        { id: 'M', label: 'M' },
        { id: 'Tu', label: 'T' },
        { id: 'W', label: 'W' },
        { id: 'Th', label: 'T' },
        { id: 'F', label: 'F' },
        { id: 'Sa', label: 'S' },
        { id: 'Su', label: 'S' },
    ];

    const levels = ['Primary', 'Secondary', 'University'];

    const toggleAvailability = (id: string) => {
        if (selectedAvailability.includes(id)) {
            setSelectedAvailability(selectedAvailability.filter(d => d !== id));
        } else {
            setSelectedAvailability([...selectedAvailability, id]);
        }
    };

    return (
        <div className="bg-card w-full md:w-80 rounded-[2rem] border-[3px] border-foreground p-6 md:p-8 flex-shrink-0 flex flex-col h-max sticky top-8">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-foreground mb-1">Filters</h2>
                <p className="text-muted-foreground font-medium">Refine your search</p>
            </div>

            <div className="space-y-10 flex-grow">
                {/* Subject Filter */}
                <div>
                    <h3 className="text-sm font-black text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                        <span className="w-3 h-4 bg-primary rounded-[2px]" /> Subject
                    </h3>
                    <div className="space-y-3">
                        {subjects.map(subject => (
                            <label key={subject} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedSubject === subject ? 'bg-primary border-primary' : 'border-muted-foreground/30 group-hover:border-foreground'}`}>
                                    {selectedSubject === subject && <HiCheck className="text-white w-4 h-4" />}
                                </div>
                                <span className={`font-bold ${selectedSubject === subject ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                    {subject}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Price Range Filter */}
                <div>
                    <h3 className="text-sm font-black text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                        <span className="w-4 h-3 bg-primary rounded-[2px]" /> Price Range
                    </h3>
                    <div className="px-2">
                        <div className="h-2 bg-muted rounded-full relative mb-4 mt-6">
                            <div className="absolute left-0 right-[40%] h-full bg-muted-foreground/20 rounded-full" />
                            <div className="w-5 h-5 bg-primary border-[3px] border-white rounded-full absolute -top-1.5 left-[30%] shadow-sm cursor-pointer" />
                        </div>
                        <div className="flex justify-between text-sm font-bold text-muted-foreground">
                            <span>₦5k</span>
                            <span>₦50k+</span>
                        </div>
                    </div>
                </div>

                {/* Availability Filter */}
                <div>
                    <h3 className="text-sm font-black text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                        <span className="w-4 h-4 rounded-[4px] border-2 border-primary border-t-4" /> Availability
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {availabilityDays.map(day => {
                            const isSelected = selectedAvailability.includes(day.id);
                            return (
                                <button
                                    key={day.id}
                                    onClick={() => toggleAvailability(day.id)}
                                    className={`w-10 h-10 rounded-full font-bold text-sm border-2 transition-all ${isSelected
                                            ? 'bg-primary border-primary text-white'
                                            : 'bg-transparent border-muted-foreground/20 text-muted-foreground hover:border-foreground hover:text-foreground'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Level Filter */}
                <div>
                    <h3 className="text-sm font-black text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                        <span className="text-lg leading-none mt-[-2px]">★</span> Level
                    </h3>
                    <div className="space-y-3">
                        {levels.map((level, idx) => (
                            <label key={level} className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${idx === 1 ? 'border-primary' : 'border-muted-foreground/30 group-hover:border-foreground'}`}>
                                    {idx === 1 && <div className="w-3 h-3 rounded-full bg-primary" />}
                                </div>
                                <span className={`font-bold ${idx === 1 ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                    {level}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Rating Filter */}
                <div>
                    <h3 className="text-sm font-black text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                        <span className="text-lg leading-none mt-[-2px]">★</span> Rating
                    </h3>
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <div className="flex text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className="text-xl">★</span>
                            ))}
                        </div>
                        <span className="font-bold text-muted-foreground group-hover:text-foreground">& Up</span>
                    </div>
                </div>
            </div>

            <div className="mt-8 pt-8">
                <button className="w-full bg-tutor-purple-200 hover:bg-tutor-purple-300 text-foreground font-black py-4 rounded-xl border-[3px] border-foreground transition-colors">
                    Apply Filters
                </button>
            </div>
        </div>
    );
}
