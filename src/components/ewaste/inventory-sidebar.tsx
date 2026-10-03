'use client';

import { useMemo } from 'react';
import { InventoryEntry, SortEvent, getCategoryColor } from '@/lib/ewaste/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Package, Trash2, Activity, Cpu } from 'lucide-react';
import { useLanguage } from '@/components/ewaste/language-provider';

interface InventorySidebarProps {
  inventory: Map<string, InventoryEntry>;
  sortLog: SortEvent[];
  totalSorted: number;
  onClearLog: () => void;
  webcamActive: boolean;
}

export function InventorySidebar({ inventory, sortLog, totalSorted, onClearLog, webcamActive }: InventorySidebarProps) {
  const { t } = useLanguage();
  const inventoryList = useMemo(() => Array.from(inventory.values()).sort((a, b) => b.count - a.count), [inventory]);

  const binCounts = useMemo(() => {
    const counts = new Map<number, number>();
    sortLog.forEach((e) => counts.set(e.bin, (counts.get(e.bin) ?? 0) + 1));
    return counts;
  }, [sortLog]);

  const recentEvents = useMemo(() => sortLog.slice(-8).reverse(), [sortLog]);

  const binLabel = (bin: number) => t(`bin_${bin}` as `bin_${1 | 2 | 3 | 4 | 5 | 6}`);

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Total counter badge */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          {t('total_parts_tracked')}
        </div>
        <div className="mt-2 text-5xl font-bold tabular-nums text-primary">
          {totalSorted}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {inventoryList.length} {t('unique_categories')}
        </div>
      </div>

      {/* Live status */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-foreground">
          <Activity className={`h-4 w-4 ${webcamActive ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'}`} />
          <span>{webcamActive ? t('stream_active') : t('stream_idle')}</span>
        </div>
        <span className={`h-2 w-2 rounded-full ${webcamActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
      </div>

      {/* Component Registry */}
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Cpu className="h-3.5 w-3.5" />
          {t('component_registry')}
        </h3>
        <ScrollArea className="max-h-64 rounded-md border border-border bg-card">
          <ul className="p-2 space-y-1.5">
            {inventoryList.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                {t('no_items_evaluated')}
              </li>
            ) : (
              inventoryList.map((entry) => {
                const avgConf = entry.totalConfidence / entry.count;
                return (
                  <li
                    key={entry.item}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2 text-xs border-l-4"
                    style={{ borderLeftColor: getCategoryColor(entry.item) }}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">{entry.item}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round(avgConf * 100)}% {t('avg_conf')}
                      </div>
                    </div>
                    <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-xs text-primary tabular-nums">
                      ×{entry.count}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </ScrollArea>
      </div>

      {/* Bin distribution */}
      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('bin_distribution')}
        </h3>
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => i + 1).map((bin) => {
            const count = binCounts.get(bin) ?? 0;
            const total = sortLog.length || 1;
            const pct = (count / total) * 100;
            return (
              <div key={bin} className="text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span className="truncate pr-2">{binLabel(bin)}</span>
                  <span className="tabular-nums text-foreground font-medium">{count}</span>
                </div>
                <Progress value={pct} className="h-1.5 mt-1" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent sort events */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('sort_event_log')}
          </h3>
          {sortLog.length > 0 && (
            <button
              onClick={onClearLog}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {t('clear')}
            </button>
          )}
        </div>
        <ScrollArea className="max-h-48 rounded-md border border-border bg-card">
          <ul className="p-2 space-y-1">
            {recentEvents.length === 0 ? (
              <li className="px-2 py-4 text-center text-xs text-muted-foreground">
                {t('no_sort_events')}
              </li>
            ) : (
              recentEvents.map((evt) => (
                <li key={evt.id} className="flex items-center gap-2 rounded bg-muted/40 px-2 py-1.5 text-[11px]">
                  <span
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(evt.item) }}
                  />
                  <span className="font-medium text-foreground truncate flex-1">{evt.item}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary tabular-nums">
                    B{evt.bin}
                  </span>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
}
