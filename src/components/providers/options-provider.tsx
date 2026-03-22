'use client'

import React, { createContext, useContext, useMemo } from 'react'

type OptionsContextType = {
    subjects: any[]
    timeOptions: string[];
    days: string[];
}

const OptionsContext = createContext<OptionsContextType>({ subjects: [], timeOptions: [], days: [] })

export const useOptions = () => useContext(OptionsContext)

export const OptionsProvider = ({
    children,
    initialSubjects,
}: {
    children: React.ReactNode
    initialSubjects: any[]
}) => {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const timeOptions = useMemo(() => {
        return Array.from({ length: 48 }, (_, i) => {
            const hour24 = Math.floor(i / 2);
            const minute = i % 2 === 0 ? '00' : '30';
            const ampm = hour24 < 12 ? 'AM' : 'PM';
            const hour12 = hour24 % 12 || 12;
            const hourString = hour12 < 10 ? `0${hour12}` : `${hour12}`;
            return `${hourString}:${minute} ${ampm}`;
        });
    }, []);

    return (
        <OptionsContext.Provider value={{
            subjects: initialSubjects || [],
            timeOptions,
            days: DAYS
        }}>
            {children}
        </OptionsContext.Provider>
    )
}
