// Lovable Cloud Function: elevenlabs-transcribe
// Transcribe uploaded audio using ElevenLabs Speech-to-Text.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) return jsonResponse({ error: "ELEVENLABS_API_KEY is not configured" }, { status: 500 });

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) return jsonResponse({ error: "Missing audio file" }, { status: 400 });

    const apiForm = new FormData();
    apiForm.append("file", audioFile);
    apiForm.append("model_id", "scribe_v2");
    apiForm.append("tag_audio_events", "true");
    apiForm.append("diarize", "false");
    // apiForm.append("language_code", "eng"); // optional; omit for auto-detect

    const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: apiForm,
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("elevenlabs stt error", resp.status, t);
      return jsonResponse({ error: "Transcription failed" }, { status: 500 });
    }

    const data = await resp.json();

    // Return minimal useful payload
    return jsonResponse({
      text: data?.text ?? "",
      words: Array.isArray(data?.words) ? data.words : undefined,
      audio_events: Array.isArray(data?.audio_events) ? data.audio_events : undefined,
    });
  } catch (e) {
    console.error("elevenlabs-transcribe error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
