'use client'

import { SimpleAuthProvider as AuthProvider } from './simple-auth-provider'
import { PWAProvider } from './pwa-provider'
import { ThemeProvider } from './theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <PWAProvider>
          {children}
        </PWAProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

// Re-export useAuth for convenience
export { useAuth } from './simple-auth-provider'