'use client'

import React, { createContext, useContext } from 'react'

type AuthContextType = {
    user: any | null
    tutorProfile: any | null
    isSuspended: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, tutorProfile: null, isSuspended: false })

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({
    children,
    initialUser,
    initialTutorProfile,
    isSuspended = false,
}: {
    children: React.ReactNode
    initialUser: any | null
    initialTutorProfile: any | null
    isSuspended?: boolean
}) => {
    return (
        <AuthContext.Provider value={{ user: initialUser, tutorProfile: initialTutorProfile, isSuspended }}>
            {children}
        </AuthContext.Provider>
    )
}
