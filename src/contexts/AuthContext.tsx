import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { authService, UserProfile } from '@/services/auth'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  isAdmin: boolean
  isApproved: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<UserProfile>
  register: (data: {
    name: string
    email: string
    password: string
    passwordConfirm: string
  }) => Promise<UserProfile>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser())
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      if (pb.authStore.isValid) {
        const refreshed = await authService.refreshAuth()
        setUser(refreshed)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check initial auth state and listen to pb.authStore changes
    refreshUser()

    const unsubscribe = pb.authStore.onChange(() => {
      const current = authService.getCurrentUser()
      setUser(current)
    })

    return () => {
      unsubscribe()
    }
  }, [refreshUser])

  const login = async (email: string, password: string): Promise<UserProfile> => {
    const profile = await authService.login(email, password)
    setUser(profile)
    return profile
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    passwordConfirm: string
  }): Promise<UserProfile> => {
    const profile = await authService.register(data)
    return profile
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const isAuthenticated = !!user
  const isAdmin = user?.role === 'admin'
  const isApproved = user?.approved === true || user?.approvalStatus === 'aprovado'

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        isApproved,
        isAuthenticated,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
