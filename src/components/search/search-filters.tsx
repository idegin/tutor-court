'use client';

import React, { useState, useEffect } from 'react';
import { HiOutlineAdjustmentsHorizontal, HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { useOptions } from '@/components/providers/options-provider';
import { SearchableSelect } from '@/components/ui/searchable-select';

import { ScrollArea } from '@/components/ui/scroll-area';

export function SearchFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { subjects } = useOptions();

    // Map URL params to local state
    const [query, setQuery] = useState<string>(searchParams.get('q') || '');
    const [selectedSubject, setSelectedSubject] = useState<string[]>(
        searchParams.getAll('subject')
    );
    const [priceRange, setPriceRange] = useState<[number, number]>([
        Number(searchParams.get('minPrice')) || 0,
        Number(searchParams.get('maxPrice')) || 50000
    ]);
    const [selectedMode, setSelectedMode] = useState<string>(searchParams.get('mode') || '');
    const [selectedClassType, setSelectedClassType] = useState<string>(searchParams.get('type') || '');
    const [selectedRating, setSelectedRating] = useState<number>(Number(searchParams.get('rating')) || 0);

    // Sync local state when searchParams change (like back navigation)
    useEffect(() => {
        setQuery(searchParams.get('q') || '');
        setSelectedSubject(searchParams.getAll('subject'));
        setPriceRange([
            Number(searchParams.get('minPrice')) || 0,
            Number(searchParams.get('maxPrice')) || 50000
        ]);
        setSelectedMode(searchParams.get('mode') || '');
        setSelectedClassType(searchParams.get('type') || '');
        setSelectedRating(Number(searchParams.get('rating')) || 0);
    }, [searchParams]);

    const subjectOptions = subjects.map((sub: any) => ({
        value: sub.id,
        label: sub.name
    }));

    const modes = [{ label: 'Online', value: 'online' }, { label: 'Hybrid', value: 'hybrid' }];
    const classTypes = [{ label: 'One on One', value: 'one-on-one' }, { label: 'Group', value: 'group' }];

    // Debounce the router push when user applies changes (or click apply)
    const applyFilters = () => {
        const params = new URLSearchParams();

        const trimmedQuery = query.trim();
        if (trimmedQuery) params.set('q', trimmedQuery);

        selectedSubject.forEach(s => params.append('subject', s));

        if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString());
        if (priceRange[1] < 50000) params.set('maxPrice', priceRange[1].toString()); // 50000 is max (i.e. '50,000+')

        if (selectedMode) params.set('mode', selectedMode);
        if (selectedClassType) params.set('type', selectedClassType);
        if (selectedRating > 0) params.set('rating', selectedRating.toString());

        // Preserve the active sort, which is controlled outside of this panel.
        const currentSort = searchParams.get('sort');
        if (currentSort) params.set('sort', currentSort);

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        setQuery('');
        setSelectedSubject([]);
        setPriceRange([0, 50000]);
        setSelectedMode('');
        setSelectedClassType('');
        setSelectedRating(0);

        // Keep sort selection when clearing filters.
        const currentSort = searchParams.get('sort');
        router.push(currentSort ? `${pathname}?sort=${currentSort}` : pathname);
    };

    return (
        <div className="bg-card w-full md:w-80 rounded-2xl border-2 border-muted flex-shrink-0 flex flex-col h-[calc(100vh-7.5rem)] sticky top-24">
            <ScrollArea className="flex-1 w-full p-4 md:p-6 h-[calc(100vh-7.5rem)]">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-foreground mb-1 flex items-center gap-2">
                            <HiOutlineAdjustmentsHorizontal className="w-6 h-6 text-muted-foreground" />
                            Filters
                        </h2>
                        <p className="text-muted-foreground font-medium text-sm">Refine your search</p>
                    </div>
                    <button
                        onClick={clearFilters}
                        className="text-sm font-bold text-tutor-red-500 hover:text-tutor-red-600 transition-colors"
                    >
                        Clear All
                    </button>
                </div>

                <div className="space-y-10 pb-8">
                    {/* Keyword Search */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Search
                        </h3>
                        <div className="relative">
                            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                            <Input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') applyFilters();
                                }}
                                placeholder="Name, subject or keyword..."
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Subject Filter */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Subject
                        </h3>
                        <SearchableSelect
                            isMulti
                            options={subjectOptions}
                            value={subjectOptions.filter((opt: any) => selectedSubject.includes(opt.value))}
                            onChange={(selected: any) => {
                                setSelectedSubject(selected ? selected.map((s: any) => s.value) : []);
                            }}
                            placeholder="Select subjects..."
                        />
                    </div>

                    {/* Price Range Filter */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Price Range
                        </h3>
                        <div className="px-2">
                            <Slider
                                min={0}
                                max={50000}
                                step={1000}
                                value={priceRange}
                                onValueChange={(val) => setPriceRange(val as [number, number])}
                                className="py-4"
                            />
                            <div className="flex justify-between text-sm font-bold text-muted-foreground mt-2">
                                <span>₦{priceRange[0].toLocaleString()}</span>
                                <span>₦{priceRange[1] === 50000 ? '50,000+' : priceRange[1].toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Filter */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Learning Mode
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {modes.map(mode => {
                                const isSelected = selectedMode === mode.value;
                                return (
                                    <button
                                        key={mode.value}
                                        onClick={() => setSelectedMode(isSelected ? '' : mode.value)}
                                        className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${isSelected
                                            ? 'bg-tutor-purple-100 border-tutor-purple-500 text-tutor-purple-900'
                                            : 'bg-transparent border-muted text-muted-foreground hover:border-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {mode.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Class Type Filter */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Class Type
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {classTypes.map(type => {
                                const isSelected = selectedClassType === type.value;
                                return (
                                    <button
                                        key={type.value}
                                        onClick={() => setSelectedClassType(isSelected ? '' : type.value)}
                                        className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-all ${isSelected
                                            ? 'bg-tutor-purple-100 border-tutor-purple-500 text-tutor-purple-900'
                                            : 'bg-transparent border-muted text-muted-foreground hover:border-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div>
                        <h3 className="text-sm font-black text-muted-foreground tracking-widest uppercase mb-4">
                            Minimum Rating
                        </h3>
                        <div className="space-y-3">
                            {[5, 4, 3, 2, 1].map(rating => {
                                const isSelected = selectedRating === rating;
                                return (
                                    <div key={rating} className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedRating(isSelected ? 0 : rating)}>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary' : 'border-muted-foreground/30 group-hover:border-foreground'}`}>
                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <div className="flex text-yellow-500 gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <span key={i} className={`text-lg leading-none ${i < rating ? 'opacity-100' : 'opacity-30'}`}>★</span>
                                            ))}
                                        </div>
                                        <span className={`font-bold text-sm ${isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                            {rating === 5 ? '5.0' : `${rating}.0+`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="py-4 border-t-2 border-muted bg-card mt-auto shrink-0 rounded-b-2xl">
                    <button
                        onClick={applyFilters}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 rounded-xl transition-colors"
                    >
                        Apply Filters
                    </button>
                </div>
            </ScrollArea>


        </div>
    );
}
