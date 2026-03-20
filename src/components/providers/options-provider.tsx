'use client'

import React, { createContext, useContext } from 'react'

type OptionsContextType = {
    subjects: any[]
}

const OptionsContext = createContext<OptionsContextType>({ subjects: [] })

export const useOptions = () => useContext(OptionsContext)

export const OptionsProvider = ({
    children,
    initialSubjects,
}: {
    children: React.ReactNode
    initialSubjects: any[]
}) => {
    return (
        <OptionsContext.Provider value={{ subjects: initialSubjects || [] }}>
            {children}
        </OptionsContext.Provider>
    )
}
