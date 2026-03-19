'use client'

import React, { createContext, useContext } from 'react'

type AuthContextType = {
    user: any | null
    tutorProfile: any | null
}

const AuthContext = createContext<AuthContextType>({ user: null, tutorProfile: null })

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({
    children,
    initialUser,
    initialTutorProfile,
}: {
    children: React.ReactNode
    initialUser: any | null
    initialTutorProfile: any | null
}) => {
    return (
        <AuthContext.Provider value={{ user: initialUser, tutorProfile: initialTutorProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
