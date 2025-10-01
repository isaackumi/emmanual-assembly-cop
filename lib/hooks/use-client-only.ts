'use client'

import { useState, useEffect } from 'react'

/**
 * Hook to safely handle client-side only operations
 * Prevents hydration mismatches by ensuring code only runs on the client
 */
export function useClientOnly() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}

/**
 * Hook to get a consistent date that works for both SSR and client
 * Returns null during SSR, actual date on client
 */
export function useClientDate() {
  const [date, setDate] = useState<Date | null>(null)
  const isMounted = useClientOnly()

  useEffect(() => {
    if (isMounted) {
      setDate(new Date())
    }
  }, [isMounted])

  return date
}

/**
 * Hook to safely access localStorage
 * Returns null during SSR, actual value on client
 */
export function useClientStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue)
  const isMounted = useClientOnly()

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(key)
        if (stored) {
          setValue(JSON.parse(stored))
        }
      } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error)
      }
    }
  }, [key, isMounted])

  const setStoredValue = (newValue: T) => {
    setValue(newValue)
    if (isMounted && typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch (error) {
        console.error(`Error writing to localStorage key "${key}":`, error)
      }
    }
  }

  return [value, setStoredValue] as const
}
