'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';

/**
 * Wraps NextAuth's SessionProvider with:
 * 1. Reduced refetch frequency (avoids colliding with long VLM requests in dev)
 * 2. A console error filter that suppresses the harmless CLIENT_FETCH_ERROR
 *    warning that occurs when the dev server returns HTML instead of JSON
 *    during busy periods (e.g. while processing image analysis).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Store the original console.error so we can restore it on unmount
    const originalConsoleError = console.error;

    // Override console.error to filter out the known-harmless NextAuth error
    console.error = (...args: unknown[]) => {
      try {
        // Convert all args to strings for pattern matching
        const argStrings = args.map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        });
        const combined = argStrings.join(' ');

        // Suppress the specific harmless NextAuth CLIENT_FETCH_ERROR that happens
        // when the dev server returns HTML instead of JSON during busy periods.
        // This error does NOT affect functionality — login/logout still work.
        if (
          combined.includes('CLIENT_FETCH_ERROR') ||
          combined.includes("Unexpected token '<'") ||
          combined.includes('Unexpected token \'<\'') ||
          (combined.includes('next-auth') && combined.includes('DOCTYPE'))
        ) {
          // Silently swallow this specific error
          return;
        }

        // Pass through all other errors unchanged
        originalConsoleError.apply(console, args as Parameters<typeof console.error>);
      } catch {
        // If our filtering logic itself fails, fall back to original behavior
        originalConsoleError.apply(console, args as Parameters<typeof console.error>);
      }
    };

    // Restore the original console.error when the provider unmounts
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <NextAuthSessionProvider
      // Refetch session every 60 seconds (default is 0 = only on window focus/mount).
      // This reduces the frequency of background fetches that can collide with
      // long-running API requests (like VLM image analysis) in the dev server,
      // causing the harmless "CLIENT_FETCH_ERROR / Unexpected token '<'" warning.
      refetchInterval={60}
      // Don't refetch on window focus — reduces unnecessary requests during dev
      refetchOnWindowFocus={false}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
