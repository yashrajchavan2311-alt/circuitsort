// Shared types for the E-Waste Sorting Assistant

export interface MaterialComponent {
  material: string;
  percent: number;
}

export interface Detection {
  item: string;
  confidence: number;
  bbox: [number, number, number, number]; // x%, y%, w%, h%
  material: MaterialComponent[];
  bin: number;
}

export interface AnalysisResult {
  total_count: number;
  items: Detection[];
  processing_time_ms: number;
}

export interface InventoryEntry {
  item: string;
  count: number;
  lastDetected: number;
  totalConfidence: number;
}

export interface SortEvent {
  id: string;
  item: string;
  confidence: number;
  bin: number;
  timestamp: number;
  source: 'upload' | 'webcam';
}

// Color palette for bounding boxes — one per category
export const CATEGORY_COLORS: Record<string, string> = {
  Capacitor: '#f59e0b',
  Resistor: '#ef4444',
  PCB: '#10b981',
  'Battery Module': '#8b5cf6',
  'Consumer Gadget': '#06b6d4',
  'IC Chip': '#ec4899',
  Connector: '#84cc16',
  Cable: '#f97316',
  'Heat Sink': '#14b8a6',
  Transformer: '#a855f7',
};

export function getCategoryColor(item: string): string {
  return CATEGORY_COLORS[item] ?? '#38bdf8';
}

export const BIN_LABELS: Record<number, string> = {
  1: 'Bin 1 — Capacitors',
  2: 'Bin 2 — Resistors / Connectors',
  3: 'Bin 3 — PCBs / Transformers',
  4: 'Bin 4 — Batteries (Hazmat)',
  5: 'Bin 5 — Bulk Gadgets / Cables',
  6: 'Bin 6 — ICs / Heat Sinks',
};
