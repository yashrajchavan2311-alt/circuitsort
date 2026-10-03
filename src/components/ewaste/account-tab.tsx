'use client';

import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useLanguage } from '@/components/ewaste/language-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast as sonnerToast } from 'sonner';
import { Mail, Lock, LogIn, LogOut, UserCircle2, Copy, Check, Sparkles, History, BarChart3, FileSpreadsheet, Users } from 'lucide-react';

export function AccountTab() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      sonnerToast.error(t('login_error'));
      return;
    }
    setSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        sonnerToast.error(t('login_error'));
      } else {
        sonnerToast.success(t('login_success'));
        setEmail('');
        setPassword('');
      }
    } catch {
      sonnerToast.error(t('login_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      sonnerToast.success(t('copied'));
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  const fillDemoCredentials = () => {
    setEmail(t('demo_email'));
    setPassword(t('demo_password'));
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Signed in view
  if (session?.user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">{t('welcome_back')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('account_subtitle')}</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <UserCircle2 className="h-7 w-7 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{session.user.name}</CardTitle>
                <CardDescription className="text-sm">{session.user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground mb-4">
              {t('signed_in_as')} <span className="font-medium text-foreground">{session.user.email}</span>
            </div>
            <Button
              onClick={() => signOut({ callbackUrl: '/' })}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </Button>
          </CardContent>
        </Card>

        {/* Premium features teaser */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('features_coming_soon')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { icon: History, label: t('feature_history') },
              { icon: BarChart3, label: t('feature_analytics') },
              { icon: FileSpreadsheet, label: t('feature_export') },
              { icon: Users, label: t('feature_multiuser') },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5 text-foreground">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </div>
                <Badge variant="secondary" className="text-[10px]">{t('coming_soon_badge')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signed out — login form
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 mb-3">
          <LogIn className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{t('login_title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('login_subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('demo_credentials')}</CardTitle>
          <CardDescription>{t('copy_to_clipboard')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => copyToClipboard(t('demo_email'), 'email')}
            className="w-full flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{t('demo_email')}</span>
            </span>
            {copiedField === 'email' ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => copyToClipboard(t('demo_password'), 'password')}
            className="w-full flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{t('demo_password')}</span>
            </span>
            {copiedField === 'password' ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <Button
            onClick={fillDemoCredentials}
            variant="outline"
            size="sm"
            className="w-full mt-2"
          >
            {t('btn_sign_in')} →
          </Button>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('demo_email')}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gap-2"
        >
          {submitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('signing_in')}
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              {t('btn_sign_in')}
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground px-4">
        {t('not_signed_in_desc')}
      </p>
    </div>
  );
}
