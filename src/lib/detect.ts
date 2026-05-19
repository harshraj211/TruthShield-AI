import { supabase } from "@/integrations/supabase/client";

export type DetectMode = "text" | "image";

export type DetectResult = {
  verdict: "likely_real" | "likely_manipulated" | "uncertain";
  confidence: number; // 0-1
  summary: string;
  signals: Array<{ label: string; impact: "low" | "medium" | "high"; note: string }>;
  recommended_next_steps: string[];
};

export type SuspiciousSegment = {
  start_sec: number;
  end_sec: number;
  severity: "low" | "medium" | "high";
  summary: string;
  evidence: string[];
  frame_indices: number[];
};

export type SegmentDetectResult = {
  verdict: DetectResult["verdict"];
  confidence: number;
  summary: string;
  segments: SuspiciousSegment[];
  transcript_summary?: string;
  recommended_next_steps: string[];
};

export type TranscriptWord = { text: string; start: number; end: number; speaker?: string };
export type AudioEvent = { type: string; start: number; end: number };

const localDetectorUrl = import.meta.env.VITE_IMAGE_DETECTOR_URL ?? "http://127.0.0.1:8010";

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function detectImageWithLocalModel(imageDataUrl: string) {
  const blob = await dataUrlToBlob(imageDataUrl);
  const formData = new FormData();
  formData.append("file", blob, "truthshield-upload.png");

  let response: Response;
  try {
    response = await fetch(`${localDetectorUrl}/predict-image`, {
      method: "POST",
      body: formData,
    });
  } catch (error) {
    throw new Error(
      `Local ML backend is not running at ${localDetectorUrl}. Start it with: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8010`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.detail || payload?.error || "Image detector failed.";
    throw new Error(message);
  }

  return payload as DetectResult;
}

async function detectTextWithLocalModel(text: string) {
  let response: Response;
  try {
    response = await fetch(`${localDetectorUrl}/predict-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (error) {
    throw new Error(
      `Local ML backend is not running at ${localDetectorUrl}. Start it with: python -m uvicorn backend.app:app --host 127.0.0.1 --port 8010`,
    );
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.detail || payload?.error || "Text detector failed.";
    throw new Error(message);
  }

  return payload as DetectResult;
}

export async function detectContent(input: { mode: DetectMode; text?: string; imageDataUrl?: string }) {
  if (input.mode === "image") {
    if (!input.imageDataUrl) throw new Error("Missing image data.");
    return detectImageWithLocalModel(input.imageDataUrl);
  }

  if (!input.text?.trim()) throw new Error("Missing text.");
  return detectTextWithLocalModel(input.text);
}

export async function detectAudio(input: {
  durationSec: number;
  transcript: { text: string; words?: TranscriptWord[]; audio_events?: AudioEvent[] };
}) {
  const { data, error } = await supabase.functions.invoke("detect-audio", {
    body: input,
  });

  if (error) throw error;
  return data as SegmentDetectResult;
}
