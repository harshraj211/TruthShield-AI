// Lovable Cloud Function: detect-audio
// Real (non-mock) audio authenticity detection using transcript (+ timestamps).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AudioDetectResult = {
  verdict: "likely_real" | "likely_manipulated" | "uncertain";
  confidence: number;
  summary: string;
  segments: Array<{
    start_sec: number;
    end_sec: number;
    severity: "low" | "medium" | "high";
    summary: string;
    evidence: string[];
    frame_indices: number[]; // always [] for audio-only
  }>;
  recommended_next_steps: string[];
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function coerceResult(obj: any): AudioDetectResult {
  const verdict =
    obj?.verdict === "likely_real" || obj?.verdict === "likely_manipulated" || obj?.verdict === "uncertain"
      ? obj.verdict
      : "uncertain";

  const confidence = typeof obj?.confidence === "number" ? clamp01(obj.confidence) : 0.5;
  const summary = typeof obj?.summary === "string" ? obj.summary : "No summary returned.";

  const segmentsRaw = Array.isArray(obj?.segments) ? obj.segments : [];
  const segments = segmentsRaw
    .slice(0, 24)
    .map((s: any) => ({
      start_sec: typeof s?.start_sec === "number" ? Math.max(0, s.start_sec) : 0,
      end_sec: typeof s?.end_sec === "number" ? Math.max(0, s.end_sec) : 0,
      severity: s?.severity === "low" || s?.severity === "medium" || s?.severity === "high" ? s.severity : "low",
      summary: typeof s?.summary === "string" ? s.summary : "",
      evidence: Array.isArray(s?.evidence) ? s.evidence.filter((x: any) => typeof x === "string").slice(0, 8) : [],
      frame_indices: [],
    }))
    .filter((s: any) => s.summary);

  const recommended_next_steps = Array.isArray(obj?.recommended_next_steps)
    ? obj.recommended_next_steps.filter((x: any) => typeof x === "string").slice(0, 8)
    : [];

  return { verdict, confidence, summary, segments, recommended_next_steps };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { durationSec, transcript } = (await req.json()) as {
      durationSec: number;
      transcript: {
        text?: string;
        words?: Array<{ text: string; start: number; end: number; speaker?: string }>;
        audio_events?: Array<{ type: string; start: number; end: number }>;
      };
    };

    if (!Number.isFinite(durationSec) || durationSec <= 0) return jsonResponse({ error: "Invalid duration" }, { status: 400 });
    if (!transcript?.text?.trim()) return jsonResponse({ error: "Missing transcript" }, { status: 400 });

    // Safety caps
    const safeWords = Array.isArray(transcript?.words) ? transcript!.words.slice(0, 2200) : [];
    const safeEvents = Array.isArray(transcript?.audio_events) ? transcript!.audio_events.slice(0, 400) : [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI key is not configured" }, { status: 500 });

    const system =
      "You are TruthShield, an assistant that evaluates audio authenticity using a transcript with timestamps. " +
      "Return ONLY valid JSON with keys: verdict (likely_real|likely_manipulated|uncertain), confidence (0..1), summary, " +
      "segments (array of {start_sec,end_sec,severity:low|medium|high,summary,evidence:string[],frame_indices:number[]}), recommended_next_steps (string[]). " +
      "For audio-only, set frame_indices to an empty array for every segment. " +
      "Be cautious; do not claim certainty. Prefer 'uncertain' when evidence is weak.";

    const prompt =
      `We have an audio transcript with word-level timestamps (seconds). Audio duration is ~${Math.round(durationSec)}s.\n` +
      "Identify suspicious time ranges where the speech content, speaker switches, or audio events suggest manipulation, splicing, or AI voice synthesis. " +
      "Use the timestamps to define segments. Evidence should quote short exact phrases and/or describe audio events (e.g., laughter, music) that support the segment.\n\n" +
      "TRANSCRIPT (text):\n" +
      String(transcript.text).slice(0, 12000) +
      "\n\nTRANSCRIPT WORDS (JSON, truncated):\n" +
      JSON.stringify(safeWords).slice(0, 12000) +
      "\n\nAUDIO EVENTS (JSON, truncated):\n" +
      JSON.stringify(safeEvents).slice(0, 8000);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return jsonResponse({ error: "Rate limited. Try again in a minute." }, { status: 429 });
      if (aiResp.status === 402)
        return jsonResponse({ error: "AI usage limit reached. Please add credits in your workspace." }, { status: 402 });

      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return jsonResponse({ error: "AI gateway error" }, { status: 500 });
    }

    const data = await aiResp.json();
    const contentOut = data?.choices?.[0]?.message?.content;

    if (typeof contentOut !== "string") {
      console.error("Unexpected AI response shape", data);
      return jsonResponse({ error: "Unexpected AI response" }, { status: 500 });
    }

    const parsed = safeJsonParse(contentOut);
    if (!parsed) {
      const match = contentOut.match(/\{[\s\S]*\}/);
      const recovered = match ? safeJsonParse(match[0]) : null;
      if (!recovered) return jsonResponse({ error: "Model returned non-JSON output" }, { status: 500 });
      return jsonResponse(coerceResult(recovered));
    }

    return jsonResponse(coerceResult(parsed));
  } catch (e) {
    console.error("detect-audio error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
