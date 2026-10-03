import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// E-waste categories the model is trained to recognize
const EWASTE_CATEGORIES = [
  'Capacitor',
  'Resistor',
  'PCB',
  'Battery Module',
  'Consumer Gadget',
  'IC Chip',
  'Connector',
  'Cable',
  'Heat Sink',
  'Transformer',
] as const;

// Material composition database (approximate, by weight %)
const MATERIAL_DB: Record<string, { material: string; percent: number }[]> = {
  Capacitor: [
    { material: 'Aluminum', percent: 35 },
    { material: 'Copper', percent: 15 },
    { material: 'Plastic', percent: 25 },
    { material: 'Electrolyte', percent: 25 },
  ],
  Resistor: [
    { material: 'Ceramic', percent: 45 },
    { material: 'Carbon Film', percent: 30 },
    { material: 'Tin', percent: 15 },
    { material: 'Nickel', percent: 10 },
  ],
  PCB: [
    { material: 'Fiberglass', percent: 40 },
    { material: 'Copper', percent: 30 },
    { material: 'Epoxy', percent: 20 },
    { material: 'Gold/Silver', percent: 5 },
    { material: 'Solder', percent: 5 },
  ],
  'Battery Module': [
    { material: 'Lithium', percent: 25 },
    { material: 'Cobalt', percent: 20 },
    { material: 'Nickel', percent: 15 },
    { material: 'Steel', percent: 25 },
    { material: 'Plastic', percent: 15 },
  ],
  'Consumer Gadget': [
    { material: 'ABS Plastic', percent: 45 },
    { material: 'Steel', percent: 20 },
    { material: 'Copper', percent: 15 },
    { material: 'Glass', percent: 12 },
    { material: 'Aluminum', percent: 8 },
  ],
  'IC Chip': [
    { material: 'Silicon', percent: 35 },
    { material: 'Copper', percent: 30 },
    { material: 'Epoxy', percent: 25 },
    { material: 'Gold', percent: 5 },
    { material: 'Tin', percent: 5 },
  ],
  Connector: [
    { material: 'Copper', percent: 50 },
    { material: 'Brass', percent: 25 },
    { material: 'Plastic', percent: 20 },
    { material: 'Gold', percent: 5 },
  ],
  Cable: [
    { material: 'Copper', percent: 60 },
    { material: 'PVC', percent: 35 },
    { material: 'Aluminum', percent: 5 },
  ],
  'Heat Sink': [
    { material: 'Aluminum', percent: 85 },
    { material: 'Copper', percent: 10 },
    { material: 'Thermal Paste', percent: 5 },
  ],
  Transformer: [
    { material: 'Iron', percent: 45 },
    { material: 'Copper', percent: 40 },
    { material: 'Varnish', percent: 10 },
    { material: 'Steel', percent: 5 },
  ],
};

// Servo bin mapping — each category routes to a sorting bin
const SERVO_BIN_MAP: Record<string, number> = {
  Capacitor: 1,
  Resistor: 2,
  PCB: 3,
  'Battery Module': 4,
  'Consumer Gadget': 5,
  'IC Chip': 6,
  Connector: 2,
  Cable: 5,
  'Heat Sink': 6,
  Transformer: 3,
};

interface Detection {
  item: string;
  confidence: number;
  bbox: [number, number, number, number];
  material: { material: string; percent: number }[];
  bin: number;
}

interface AnalysisResult {
  total_count: number;
  items: Detection[];
  processing_time_ms: number;
}

let genaiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set. Please add it to your .env file.');
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
}

function buildDetectionPrompt() {
  return `You are an intelligent e-waste sorting vision system. Analyze this image and identify any electronic waste components visible.

Detect ONLY items from this category list:
 ${EWASTE_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For EACH detected item, return a JSON object with:
- "item": the exact category name from the list above
- "confidence": a number from 0.50 to 0.99 representing detection confidence
- "bbox": an array of 4 numbers [x, y, width, height] as PERCENTAGES (0-100) of the image dimensions, where (x,y) is the TOP-LEFT corner of the bounding box

Respond with ONLY a JSON object in this exact format, no markdown, no explanation, no code fences:
{"detections":[{"item":"Capacitor","confidence":0.92,"bbox":[12.5,30.0,18.0,25.0]}]}

Rules:
- Return at most 8 detections per image, prioritizing highest confidence
- Only include items you are reasonably sure are present (confidence >= 0.5)
- Bounding boxes should tightly enclose each detected item
- If NO e-waste items are visible, return: {"detections":[]}`;
}

function parseVlmResponse(content: string): { item: string; confidence: number; bbox: [number, number, number, number] }[] {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.detections || !Array.isArray(parsed.detections)) return [];

    return parsed.detections
      .filter((d: unknown): d is { item: string; confidence: number; bbox: number[] } => {
        if (typeof d !== 'object' || d === null) return false;
        const det = d as { item?: unknown; confidence?: unknown; bbox?: unknown };
        return (
          typeof det.item === 'string' &&
          typeof det.confidence === 'number' &&
          Array.isArray(det.bbox) &&
          det.bbox.length === 4
        );
      })
      .map((d) => ({
        item: String(d.item),
        confidence: Math.min(0.99, Math.max(0.5, Number(d.confidence))),
        bbox: [
          Math.max(0, Math.min(100, Number(d.bbox[0]))),
          Math.max(0, Math.min(100, Number(d.bbox[1]))),
          Math.max(1, Math.min(100, Number(d.bbox[2]))),
          Math.max(1, Math.min(100, Number(d.bbox[3]))),
        ] as [number, number, number, number],
      }));
  } catch {
    return [];
  }
}

function normalizeCategory(name: string): string {
  const lower = name.toLowerCase().trim();
  for (const cat of EWASTE_CATEGORIES) {
    if (lower === cat.toLowerCase()) return cat;
    if (lower.includes(cat.toLowerCase())) return cat;
  }
  if (lower.includes('cap')) return 'Capacitor';
  if (lower.includes('resist')) return 'Resistor';
  if (lower.includes('pcb') || lower.includes('board') || lower.includes('circuit')) return 'PCB';
  if (lower.includes('batt')) return 'Battery Module';
  if (lower.includes('phone') || lower.includes('laptop') || lower.includes('gadget') || lower.includes('device')) return 'Consumer Gadget';
  if (lower.includes('chip') || lower.includes('ic')) return 'IC Chip';
  if (lower.includes('cable') || lower.includes('wire')) return 'Cable';
  if (lower.includes('heatsink') || lower.includes('heat sink') || lower.includes('cooler')) return 'Heat Sink';
  if (lower.includes('transformer')) return 'Transformer';
  if (lower.includes('connector')) return 'Connector';
  return 'Consumer Gadget';
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const genai = getGenAI();

    const response = await genai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          { text: buildDetectionPrompt() },
          { inlineData: { data: base64, mimeType } },
        ],
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.1,
      },
    });

    const content = response.text ?? '';
    const rawDetections = parseVlmResponse(content);

    const detections: Detection[] = rawDetections.map((d) => {
      const normalized = normalizeCategory(d.item);
      return {
        item: normalized,
        confidence: d.confidence,
        bbox: d.bbox,
        material: MATERIAL_DB[normalized] ?? MATERIAL_DB['Consumer Gadget'],
        bin: SERVO_BIN_MAP[normalized] ?? 5,
      };
    });

    const result: AnalysisResult = {
      total_count: detections.length,
      items: detections,
      processing_time_ms: Date.now() - startTime,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('E-waste analysis error:', error);
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to analyze image',
        detail: errorMessage,
        processing_time_ms: processingTime,
        total_count: 0,
        items: [],
      },
      { status: 500 }
    );
  }
}