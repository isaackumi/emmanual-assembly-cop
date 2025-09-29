'use client'

import { SimpleAuthProvider as AuthProvider } from './simple-auth-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

// Re-export useAuth for convenience
export { useAuth } from './simple-auth-provider'