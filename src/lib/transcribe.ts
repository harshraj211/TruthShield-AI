import { supabase } from "@/integrations/supabase/client";

export type TranscribedWord = {
  text: string;
  start: number;
  end: number;
  speaker?: string;
};

export type TranscriptionResult = {
  text: string;
  words?: TranscribedWord[];
  audio_events?: Array<{ type: string; start: number; end: number }>;
};

export async function transcribeAudio(audio: Blob, filename = "audio.webm") {
  const form = new FormData();
  form.append("audio", new File([audio], filename, { type: audio.type || "audio/webm" }));

  const { data, error } = await supabase.functions.invoke("elevenlabs-transcribe", {
    body: form,
  });

  if (error) throw error;
  return data as TranscriptionResult;
}
