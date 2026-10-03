'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BoundingBoxOverlay } from '@/components/ewaste/bounding-box-overlay';
import { InventorySidebar } from '@/components/ewaste/inventory-sidebar';
import { RoboticArmPanel } from '@/components/ewaste/robotic-arm-panel';
import { SiteHeader } from '@/components/ewaste/site-header';
import { AccountTab } from '@/components/ewaste/account-tab';
import { useLanguage } from '@/components/ewaste/language-provider';
import {
  AnalysisResult,
  Detection,
  InventoryEntry,
  SortEvent,
  getCategoryColor,
} from '@/lib/ewaste/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import {
  Upload,
  Camera,
  ImageIcon,
  Loader2,
  Play,
  Square,
  Recycle,
  ScanLine,
  Zap,
  AlertCircle,
  X,
} from 'lucide-react';

type Mode = 'upload' | 'camera';
type TabKey = 'nav_sort' | 'nav_inventory' | 'nav_account';

const WEBCAPTURE_INTERVAL_MS = 1800;

export default function Home() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('nav_sort');
  const [mode, setMode] = useState<Mode>('upload');

  // Upload mode state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Webcam mode state
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamFrame, setWebcamFrame] = useState<string | null>(null);
  const [webcamAnalyzing, setWebcamAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  // Detection + inventory state
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [inventory, setInventory] = useState<Map<string, InventoryEntry>>(new Map());
  const [sortLog, setSortLog] = useState<SortEvent[]>([]);
  const [totalSorted, setTotalSorted] = useState(0);
  const [lastProcessingTime, setLastProcessingTime] = useState<number | undefined>(undefined);

  // Drag-drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Inventory helpers ----
  const ingestDetections = useCallback((detections: Detection[], source: 'upload' | 'webcam') => {
    if (detections.length === 0) return;
    const now = Date.now();
    setInventory((prev) => {
      const next = new Map(prev);
      for (const det of detections) {
        const existing = next.get(det.item);
        if (existing) {
          next.set(det.item, {
            item: det.item,
            count: existing.count + 1,
            lastDetected: now,
            totalConfidence: existing.totalConfidence + det.confidence,
          });
        } else {
          next.set(det.item, {
            item: det.item,
            count: 1,
            lastDetected: now,
            totalConfidence: det.confidence,
          });
        }
      }
      return next;
    });

    const newEvents: SortEvent[] = detections.map((det, idx) => ({
      id: `${now}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      item: det.item,
      confidence: det.confidence,
      bin: det.bin,
      timestamp: now + idx,
      source,
    }));
    setSortLog((prev) => [...prev.slice(-100), ...newEvents]);
    setTotalSorted((prev) => prev + detections.length);
  }, []);

  // ---- Upload mode ----
  const analyzeImage = useCallback(async (dataUrl: string, source: 'upload' | 'webcam') => {
    if (source === 'upload') {
      setIsAnalyzing(true);
      setUploadError(null);
    } else {
      setWebcamAnalyzing(true);
    }

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: await buildFormDataFromDataUrl(dataUrl, source === 'webcam' ? 'frame.jpg' : uploadFileName || 'image.jpg'),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || errBody.error || `HTTP ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setCurrentDetections(data.items);
      setLastProcessingTime(data.processing_time_ms);
      ingestDetections(data.items, source);

      if (source === 'upload' && data.items.length === 0) {
        sonnerToast.info(t('no_ewaste_title'), { description: t('no_ewaste_desc') });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (source === 'upload') {
        setUploadError(msg);
      } else {
        sonnerToast.error(t('camera_failed'), { description: msg });
      }
    } finally {
      if (source === 'upload') setIsAnalyzing(false);
      else setWebcamAnalyzing(false);
    }
  }, [ingestDetections, uploadFileName, t]);

  const handleFileSelected = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file type', description: 'PNG, JPG, JPEG, WebP only.', variant: 'destructive' });
      return;
    }
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedImage(result);
      setCurrentDetections([]);
      setUploadError(null);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  }, [handleFileSelected]);

  // ---- Webcam mode ----
  const captureAndSendFrame = useCallback(async () => {
    if (isFetchingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState !== 4) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setWebcamFrame(dataUrl);
    isFetchingRef.current = true;
    try {
      await analyzeImage(dataUrl, 'webcam');
    } finally {
      isFetchingRef.current = false;
    }
  }, [analyzeImage]);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setWebcamActive(true);
      sonnerToast.success(t('stream_started'), {
        description: `${t('capturing_every')} ${WEBCAPTURE_INTERVAL_MS / 1000}s`,
      });
      captureIntervalRef.current = setInterval(captureAndSendFrame, WEBCAPTURE_INTERVAL_MS);
      setTimeout(captureAndSendFrame, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not access webcam';
      sonnerToast.error(t('camera_failed'), { description: msg });
    }
  }, [captureAndSendFrame, t]);

  const stopWebcam = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamActive(false);
    setWebcamFrame(null);
    setCurrentDetections([]);
    sonnerToast.info(t('stream_stopped'));
  }, [t]);

  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleModeChange = (newMode: Mode) => {
    if (newMode === 'upload' && webcamActive) stopWebcam();
    setMode(newMode);
  };

  const clearLog = () => {
    setSortLog([]);
    setInventory(new Map());
    setTotalSorted(0);
    sonnerToast.success(t('inventory_cleared'));
  };

  const avgConfidence = useMemo(() => {
    if (currentDetections.length === 0) return 0;
    const sum = currentDetections.reduce((acc, d) => acc + d.confidence, 0);
    return sum / currentDetections.length;
  }, [currentDetections]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as TabKey)} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 lg:px-8 py-8">
        {/* ---------------- SORT TAB ---------------- */}
        {activeTab === 'nav_sort' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">{t('sort_title')}</h2>
              <p className="mt-2 text-muted-foreground">{t('sort_subtitle')}</p>
            </div>

            {/* Mode toggle */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 bg-muted/60 rounded-full p-1">
                <button
                  onClick={() => handleModeChange('upload')}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
                    mode === 'upload'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  {t('mode_upload')}
                </button>
                <button
                  onClick={() => handleModeChange('camera')}
                  className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
                    mode === 'camera'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  {t('mode_camera')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
              {/* Main panel */}
              <div className="space-y-4">
                <Card className="relative min-h-[500px] border-border bg-card p-5 lg:p-6">
                  {mode === 'upload' ? (
                    <div className="flex flex-col items-center gap-5">
                      {!uploadedImage ? (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-full max-w-xl cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-all ${
                            isDragging
                              ? 'border-primary bg-primary/5 scale-[1.01]'
                              : 'border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50'
                          }`}
                        >
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                            <Upload className="h-7 w-7 text-primary" />
                          </div>
                          <p className="text-lg font-medium text-foreground">
                            {isDragging ? t('upload_dragging') : t('upload_prompt')}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('upload_hint')}
                          </p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelected(f);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ScanLine className="h-3.5 w-3.5 text-primary" />
                            <span className="font-mono truncate max-w-xs">{uploadFileName}</span>
                            <button
                              onClick={() => {
                                setUploadedImage(null);
                                setCurrentDetections([]);
                                setUploadFileName('');
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              title={t('remove_image')}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <BoundingBoxOverlay imageDataUrl={uploadedImage} detections={currentDetections} />

                          {isAnalyzing && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('analyzing_text')}
                            </div>
                          )}
                          {uploadError && (
                            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive max-w-md">
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <span>{uploadError}</span>
                            </div>
                          )}

                          <Button
                            onClick={() => uploadedImage && analyzeImage(uploadedImage, 'upload')}
                            disabled={isAnalyzing}
                            className="min-w-[200px] gap-2"
                            size="lg"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('btn_analyzing')}
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4" />
                                {t('btn_analyze')}
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {currentDetections.length > 0 && !isAnalyzing && (
                        <div className="w-full max-w-xl flex flex-wrap gap-2 justify-center">
                          {currentDetections.map((d, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                              style={{
                                backgroundColor: `${getCategoryColor(d.item)}20`,
                                borderColor: `${getCategoryColor(d.item)}60`,
                                color: getCategoryColor(d.item),
                              }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(d.item) }} />
                              {d.item}
                              <span className="opacity-70 tabular-nums">{Math.round(d.confidence * 100)}%</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

                      {!webcamActive && !webcamFrame ? (
                        <div className="w-full max-w-xl rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                            <Camera className="h-7 w-7 text-emerald-600" />
                          </div>
                          <p className="text-lg font-medium text-foreground">{t('camera_offline_title')}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{t('camera_offline_desc')}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 w-full">
                          {webcamFrame && (
                            <BoundingBoxOverlay imageDataUrl={webcamFrame} detections={currentDetections} />
                          )}
                          {webcamAnalyzing && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t('analyzing_text')}
                            </div>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={webcamActive ? stopWebcam : startWebcam}
                        className={`min-w-[200px] gap-2 ${
                          webcamActive
                            ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                        size="lg"
                      >
                        {webcamActive ? (
                          <>
                            <Square className="h-4 w-4" />
                            {t('btn_stop_stream')}
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            {t('btn_start_stream')}
                          </>
                        )}
                      </Button>

                      {webcamActive && (
                        <p className="text-xs text-muted-foreground">
                          {t('capturing_every')} {WEBCAPTURE_INTERVAL_MS / 1000}s · {currentDetections.length} {t('active_detections')}
                        </p>
                      )}
                    </div>
                  )}
                </Card>

                <RoboticArmPanel latestDetections={currentDetections} processingTimeMs={lastProcessingTime} />

                {currentDetections.length > 0 && (
                  <Card className="border-border bg-card p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {t('material_composition')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentDetections.map((det, i) => (
                        <div key={i} className="rounded-lg bg-muted/40 border border-border p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getCategoryColor(det.item) }}
                            />
                            <span className="font-medium text-sm text-foreground">{det.item}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">#{det.bin}</span>
                          </div>
                          <div className="space-y-1">
                            {det.material.map((m, j) => (
                              <div key={j} className="flex items-center gap-2 text-[11px]">
                                <span className="w-20 text-muted-foreground truncate">{m.material}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${m.percent}%`,
                                      backgroundColor: getCategoryColor(det.item),
                                      opacity: 0.7,
                                    }}
                                  />
                                </div>
                                <span className="w-8 text-right tabular-nums text-foreground">{m.percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Sidebar — always visible on Sort tab */}
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <Card className="border-border bg-card p-5 h-full">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                      <Recycle className="h-5 w-5" />
                      {t('inventory_title')}
                    </h2>
                  </div>
                  <InventorySidebar
                    inventory={inventory}
                    sortLog={sortLog}
                    totalSorted={totalSorted}
                    onClearLog={clearLog}
                    webcamActive={webcamActive}
                  />
                </Card>
              </aside>
            </div>
          </div>
        )}

        {/* ---------------- INVENTORY TAB ---------------- */}
        {activeTab === 'nav_inventory' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight">{t('inventory_title')}</h2>
              <p className="mt-2 text-muted-foreground">{t('inventory_subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border bg-card p-5 text-center">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('total_parts_tracked')}</div>
                <div className="mt-2 text-4xl font-bold tabular-nums text-primary">{totalSorted}</div>
              </Card>
              <Card className="border-border bg-card p-5 text-center">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('unique_categories')}</div>
                <div className="mt-2 text-4xl font-bold tabular-nums text-foreground">{inventory.size}</div>
              </Card>
              <Card className="border-border bg-card p-5 text-center">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{t('sort_event_log')}</div>
                <div className="mt-2 text-4xl font-bold tabular-nums text-foreground">{sortLog.length}</div>
              </Card>
            </div>

            <Card className="border-border bg-card p-5">
              <InventorySidebar
                inventory={inventory}
                sortLog={sortLog}
                totalSorted={totalSorted}
                onClearLog={clearLog}
                webcamActive={webcamActive}
              />
            </Card>
          </div>
        )}

        {/* ---------------- ACCOUNT TAB ---------------- */}
        {activeTab === 'nav_account' && (
          <div className="py-6">
            <AccountTab />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-5 text-center text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">{t('brandName')}</span> · {totalSorted} {t('footer_session')} ·
            {' '}{mode === 'upload' ? t('footer_upload_mode') : (webcamActive ? t('footer_stream_active') : t('footer_webcam_idle'))}
            {currentDetections.length > 0 && (
              <> · {t('footer_avg_confidence')} <span className="text-primary tabular-nums">{Math.round(avgConfidence * 100)}%</span></>
            )}
          </p>
          <p className="mt-1 text-[11px]">{t('footer_built_by')}</p>
        </div>
      </footer>
    </div>
  );
}

async function buildFormDataFromDataUrl(dataUrl: string, filename: string): Promise<FormData> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const fd = new FormData();
  fd.append('file', blob, filename);
  return fd;
}
