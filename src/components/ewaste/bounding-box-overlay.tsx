'use client';

import { useEffect, useRef } from 'react';
import { Detection, getCategoryColor } from '@/lib/ewaste/types';

interface BoundingBoxOverlayProps {
  imageDataUrl: string | null;
  detections: Detection[];
  className?: string;
}

/**
 * Renders the source image with bounding boxes overlaid via canvas.
 * Bounding boxes are positioned using percentage coordinates from the detections.
 */
export function BoundingBoxOverlay({ imageDataUrl, detections, className }: BoundingBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      const container = containerRef.current;
      if (!canvas || !img || !container) return;

      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      if (!naturalW || !naturalH) return;

      // Set canvas size to match the displayed image size
      const displayRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      canvas.width = displayRect.width;
      canvas.height = displayRect.height;
      canvas.style.width = `${displayRect.width}px`;
      canvas.style.height = `${displayRect.height}px`;
      canvas.style.left = `${displayRect.left - containerRect.left}px`;
      canvas.style.top = `${displayRect.top - containerRect.top}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      detections.forEach((det) => {
        const [xPct, yPct, wPct, hPct] = det.bbox;
        const x = (xPct / 100) * canvas.width;
        const y = (yPct / 100) * canvas.height;
        const w = (wPct / 100) * canvas.width;
        const h = (hPct / 100) * canvas.height;
        const color = getCategoryColor(det.item);

        // Draw bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.strokeRect(x, y, w, h);
        ctx.shadowBlur = 0;

        // Draw label background
        const label = `${det.item} ${Math.round(det.confidence * 100)}%`;
        ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
        const textMetrics = ctx.measureText(label);
        const padding = 6;
        const labelH = 22;
        const labelW = textMetrics.width + padding * 2;
        const labelY = y > labelH ? y - labelH : y;

        ctx.fillStyle = color;
        ctx.fillRect(x, labelY, labelW, labelH);

        // Draw label text
        ctx.fillStyle = '#0f172a';
        ctx.fillText(label, x + padding, labelY + 15);

        // Draw corner accents for a "scanner" look
        const cornerLen = 12;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        // Top-left
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen, y);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerLen);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(x, y + h - cornerLen);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cornerLen, y + h);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(x + w - cornerLen, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cornerLen);
        ctx.stroke();
      });
    };

    // Redraw on image load and on window resize
    const img = imageRef.current;
    if (img) {
      if (img.complete) draw();
      img.addEventListener('load', draw);
    }
    window.addEventListener('resize', draw);
    return () => {
      window.removeEventListener('resize', draw);
      if (img) img.removeEventListener('load', draw);
    };
  }, [imageDataUrl, detections]);

  if (!imageDataUrl) return null;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <img
        ref={imageRef}
        src={imageDataUrl}
        alt="Analyzed e-waste"
        className="max-w-full max-h-[440px] rounded-lg border-2 border-border object-contain"
      />
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
      />
    </div>
  );
}
