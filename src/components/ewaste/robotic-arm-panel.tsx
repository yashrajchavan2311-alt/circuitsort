'use client';

import { useEffect, useState } from 'react';
import { Detection } from '@/lib/ewaste/types';
import { Cog, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/components/ewaste/language-provider';
import { useTheme } from 'next-themes';

interface RoboticArmPanelProps {
  latestDetections: Detection[];
  processingTimeMs?: number;
}

interface ServoState {
  active: boolean;
  currentBin: number;
  targetBin: number;
  angle: number;
}

/**
 * Simulates the robotic arm / servo control interface.
 * When new detections arrive, the arm routes each item to its target bin.
 */
export function RoboticArmPanel({ latestDetections, processingTimeMs }: RoboticArmPanelProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [servo, setServo] = useState<ServoState>({
    active: false,
    currentBin: 1,
    targetBin: 1,
    angle: 0,
  });
  const [queueDepth, setQueueDepth] = useState(0);

  // Trigger servo actuation whenever new detections arrive
  useEffect(() => {
    if (latestDetections.length === 0) return;

    let cancelled = false;
    let step = 0;

    const runServo = async () => {
      setQueueDepth(latestDetections.length);
      setServo((s) => ({ ...s, active: true }));

      for (const det of latestDetections) {
        if (cancelled) return;
        const target = det.bin;
        setServo((s) => ({ ...s, targetBin: target, angle: (target - 1) * 60 }));
        await sleep(450);
        if (cancelled) return;
        setServo((s) => ({ ...s, currentBin: target }));
        await sleep(250);
        step += 1;
        setQueueDepth(latestDetections.length - step);
      }
      if (!cancelled) {
        setServo((s) => ({ ...s, active: false }));
        setQueueDepth(0);
      }
    };

    runServo();
    return () => { cancelled = true; };
  }, [latestDetections]);

  const binLabel = (bin: number) => t(`bin_${bin}` as `bin_${1 | 2 | 3 | 4 | 5 | 6}`);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cog className={`h-4 w-4 text-amber-500 ${servo.active ? 'animate-spin' : ''}`} />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {t('robotic_sorter')}
          </h3>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${
          servo.active
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
        }`}>
          {servo.active ? t('sorting') : t('idle')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{t('servo_angle')}</div>
          <div className="font-mono text-base text-primary tabular-nums">
            {servo.angle.toFixed(0)}°
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{t('queue')}</div>
          <div className="font-mono text-base text-amber-600 dark:text-amber-400 tabular-nums">
            {queueDepth}
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{t('current_bin')}</div>
          <div className="font-mono text-sm text-foreground">
            #{servo.currentBin}
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2.5">
          <div className="text-muted-foreground uppercase tracking-wider text-[10px]">{t('inference')}</div>
          <div className="font-mono text-sm text-foreground tabular-nums">
            {processingTimeMs != null ? `${processingTimeMs}ms` : '—'}
          </div>
        </div>
      </div>

      {/* Bin routing visualization */}
      <div className="mt-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
          {t('bin_routing')}
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((bin) => {
            const isTarget = servo.targetBin === bin && servo.active;
            const isCurrent = servo.currentBin === bin;
            return (
              <div
                key={bin}
                className={`flex-1 h-9 rounded-md flex items-center justify-center text-[10px] font-mono border transition-all ${
                  isTarget
                    ? 'bg-amber-500/25 border-amber-500 text-amber-700 dark:text-amber-300 scale-110'
                    : isCurrent
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted/50 border-border text-muted-foreground'
                }`}
                title={binLabel(bin)}
              >
                {bin}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live routing flow */}
      {servo.active && (
        <div className={`mt-3 flex items-center gap-2 text-[11px] rounded-md p-2.5 border ${
          isDark ? 'bg-muted/30 border-border' : 'bg-amber-50 border-amber-200'
        }`}>
          <span className="text-amber-500">⚡</span>
          <span className="flex-1 truncate text-foreground">
            {t('routing')} <span className="text-primary font-medium">{latestDetections[0]?.item}</span>
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{binLabel(servo.targetBin)}</span>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
