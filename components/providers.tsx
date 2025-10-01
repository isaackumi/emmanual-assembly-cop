'use client'

import { SimpleAuthProvider as AuthProvider } from './simple-auth-provider'
import { PWAProvider } from './pwa-provider'
import { ThemeProvider } from './theme-provider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PWAProvider>
            {children}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
          </PWAProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

// Re-export useAuth for convenience
export { useAuth } from './simple-auth-provider'