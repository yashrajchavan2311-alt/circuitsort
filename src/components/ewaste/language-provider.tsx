'use client';

import { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';
import { Language, getT, TranslationKey } from '@/lib/ewaste/translations';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'circuitsort-lang';

// External store using useSyncExternalStore (avoids setState-in-effect lint error).
// To prevent hydration mismatches, we ALWAYS return 'en' on the server AND on the
// initial client render, then swap to the stored language after mount.
let currentLang: Language = 'en';
let hasHydrated = false;
const listeners = new Set<() => void>();

function readStoredLang(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

// On the client, after hydration, read the stored language and notify listeners.
// This runs as a microtask so it fires AFTER the initial synchronous render,
// preventing a hydration mismatch.
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    if (hasHydrated) return;
    hasHydrated = true;
    currentLang = readStoredLang();
    notifyListeners();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Language {
  return currentLang;
}

function getServerSnapshot(): Language {
  return 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLang = useCallback((next: Language) => {
    currentLang = next;
    hasHydrated = true;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    notifyListeners();
  }, []);

  const toggleLang = useCallback(() => {
    currentLang = currentLang === 'en' ? 'hi' : 'en';
    hasHydrated = true;
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
    } catch {
      // ignore
    }
    notifyListeners();
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return getT(lang)(key);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
