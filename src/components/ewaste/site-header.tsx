'use client';

import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { useLanguage } from '@/components/ewaste/language-provider';
import { useMounted } from '@/hooks/use-mounted';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Languages, LogOut, UserCircle2 } from 'lucide-react';

interface SiteHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TAB_KEYS = ['nav_sort', 'nav_inventory', 'nav_account'] as const;

export function SiteHeader({ activeTab, onTabChange }: SiteHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { toggleLang, t } = useLanguage();
  const { data: session } = useSession();
  const mounted = useMounted();

  const tabValues = TAB_KEYS.map((k) => ({ key: k, label: t(k) }));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo + brand */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/circuitsort-logo.svg" alt="CircuitSort logo" className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-lg leading-tight text-foreground truncate">
                {t('brandName')}
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight truncate hidden sm:block">
                {t('tagline')}
              </div>
            </div>
          </div>

          {/* Tab navigation — center on desktop, scrollable on mobile */}
          <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full p-1">
            {tabValues.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="gap-1.5 h-9 px-3"
              title={t('language_toggle')}
            >
              <Languages className="h-4 w-4" />
              <span className="text-xs font-medium">{t('language_toggle')}</span>
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
              title={t('theme_toggle')}
            >
              {/* Render Moon as a stable placeholder until the client has mounted.
                  This prevents a hydration mismatch because the server always
                  renders Moon (resolvedTheme is undefined on the server), and the
                  client also renders Moon on the first pass, then swaps to the
                  correct icon after mount. */}
              {!mounted || resolvedTheme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Account chip — shows if logged in */}
            {session?.user && (
              <div className="hidden sm:flex items-center gap-2 ml-1 pl-3 border-l border-border/60">
                <div className="flex items-center gap-1.5 text-sm">
                  <UserCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground max-w-[160px] truncate">
                    {session.user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title={t('logout')}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile tab nav */}
        <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
          {tabValues.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground bg-muted/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
