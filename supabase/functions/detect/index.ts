// Lovable Cloud Function: detect
// Enhanced detection with multi-stage verification to minimize false positives

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DetectMode = "text" | "image";

type DetectResult = {
  verdict: "likely_real" | "likely_manipulated" | "uncertain";
  confidence: number;
  summary: string;
  signals: Array<{ label: string; impact: "low" | "medium" | "high"; note: string }>;
  recommended_next_steps: string[];
  metadata?: {
    analysis_version: string;
    stages_completed: string[];
    warning_flags: string[];
  };
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

function coerceResult(obj: any): DetectResult {
  const verdict =
    obj?.verdict === "likely_real" || obj?.verdict === "likely_manipulated" || obj?.verdict === "uncertain"
      ? obj.verdict
      : "uncertain";

  const confidence = typeof obj?.confidence === "number" ? Math.max(0, Math.min(1, obj.confidence)) : 0.5;
  const summary = typeof obj?.summary === "string" ? obj.summary : "No summary returned.";

  const signalsRaw = Array.isArray(obj?.signals) ? obj.signals : [];
  const signals = signalsRaw
    .slice(0, 10)
    .map((s: any) => ({
      label: typeof s?.label === "string" ? s.label : "Signal",
      impact: s?.impact === "low" || s?.impact === "medium" || s?.impact === "high" ? s.impact : "low",
      note: typeof s?.note === "string" ? s.note : "",
    }))
    .filter((s: any) => s.label && s.note);

  const recommended_next_steps = Array.isArray(obj?.recommended_next_steps)
    ? obj.recommended_next_steps.filter((x: any) => typeof x === "string").slice(0, 6)
    : [];

  return { verdict, confidence, summary, signals, recommended_next_steps };
}

// Extract basic image metadata from data URL
function extractImageMetadata(dataUrl: string): { format: string; size: number } {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return { format: "unknown", size: 0 };

  const format = match[1];
  const base64 = match[2];
  const size = Math.ceil(base64.length * 0.75); // Approximate size in bytes

  return { format, size };
}

// Multi-stage analysis to reduce false positives
async function multiStageImageAnalysis(
  imageDataUrl: string,
  LOVABLE_API_KEY: string,
): Promise<DetectResult & { metadata: any }> {
  const metadata = extractImageMetadata(imageDataUrl);
  const stages_completed: string[] = [];
  const warning_flags: string[] = [];

  // STAGE 1: Initial Structural Analysis (Focus on DEFINITIVE manipulation signs)
  const stage1System =
    "You are TruthShield Stage 1 Analyzer. Your ONLY job is to detect DEFINITIVE structural manipulation artifacts. " +
    "Be EXTREMELY conservative. Return ONLY valid JSON with: verdict, confidence, structural_issues (array). " +
    "RULES: " +
    "1. Only flag 'likely_manipulated' if you see CLEAR structural issues: face swap seams, impossible geometry, inconsistent lighting/shadows across subjects, warped text, clone stamp patterns, obvious compositing errors. " +
    "2. DO NOT flag for: compression artifacts, noise, blur, color grading, filters, normal photo editing, beauty enhancement, sharpening, saturation changes. " +
    "3. If unsure or only seeing quality/processing signs, return 'uncertain' with confidence < 0.6. " +
    "4. Default to 'likely_real' ONLY if image appears completely unmodified.";

  const stage1Prompt =
    "Analyze this image for DEFINITIVE structural manipulation artifacts ONLY. " +
    "Look for: face swap boundaries, impossible shadows/lighting, geometric warping, clone stamp repetition, visible compositing seams. " +
    "Ignore: general image quality, noise, compression, color adjustments, sharpening, typical photo filters. " +
    "Return JSON: {verdict, confidence, structural_issues: [{issue, severity, location}]}";

  const stage1Messages = [
    { role: "system", content: stage1System },
    {
      role: "user",
      content: [
        { type: "text", text: stage1Prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const stage1Resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp",
      messages: stage1Messages,
      temperature: 0.1, // Very low temperature for consistency
    }),
  });

  if (!stage1Resp.ok) throw new Error(`Stage 1 failed: ${stage1Resp.status}`);

  const stage1Data = await stage1Resp.json();
  const stage1Content = stage1Data?.choices?.[0]?.message?.content;
  let stage1Result = safeJsonParse(stage1Content);

  if (!stage1Result) {
    const match = stage1Content?.match(/\{[\s\S]*\}/);
    stage1Result = match ? safeJsonParse(match[0]) : null;
  }

  stages_completed.push("structural_analysis");

  // If Stage 1 found definitive manipulation, return early
  if (stage1Result?.verdict === "likely_manipulated" && stage1Result?.confidence > 0.7) {
    const structuralIssues = Array.isArray(stage1Result?.structural_issues) ? stage1Result.structural_issues : [];

    return {
      verdict: "likely_manipulated",
      confidence: stage1Result.confidence,
      summary: `Definitive structural manipulation detected: ${structuralIssues.map((i: any) => i.issue).join(", ")}`,
      signals: structuralIssues.map((issue: any) => ({
        label: issue.issue || "Structural Artifact",
        impact: issue.severity === "high" ? "high" : issue.severity === "medium" ? "medium" : "low",
        note: `${issue.location || "Detected"}: ${issue.issue || "Unknown issue"}`,
      })),
      recommended_next_steps: [
        "Image shows clear signs of structural manipulation",
        "Review the specific artifacts identified",
        "Consider reverse image search for original source",
      ],
      metadata: {
        analysis_version: "2.0-multistage",
        stages_completed,
        warning_flags,
      },
    };
  }

  // STAGE 2: Context & Plausibility Check (Reduce false positives from legitimate edits)
  const stage2System =
    "You are TruthShield Stage 2 Context Analyzer. Stage 1 found no definitive manipulation. " +
    "Your job: distinguish between (A) legitimate photo editing/enhancement vs (B) deceptive deepfake/synthetic generation. " +
    "Return ONLY valid JSON with: context_analysis, legitimate_editing_likely (boolean), synthetic_generation_likely (boolean), confidence. " +
    "CRITICAL: Professional retouching, color correction, filters, restoration, and cosmetic enhancement are LEGITIMATE and should NOT be flagged as manipulation.";

  const stage2Prompt =
    "This image passed structural analysis. Now assess context: " +
    "1. Does this appear to be a real photograph that was professionally edited/enhanced? (color grading, retouching, filters, restoration) " +
    "2. Or does it show signs of synthetic generation/deepfake creation? (unnatural skin texture patterns, impossible facial features, AI-typical artifacts) " +
    "3. Consider: legitimate editing preserves the original scene, while deepfakes CREATE false scenes. " +
    "Return JSON: {context_analysis, legitimate_editing_likely: boolean, synthetic_generation_likely: boolean, confidence}";

  const stage2Messages = [
    { role: "system", content: stage2System },
    {
      role: "user",
      content: [
        { type: "text", text: stage2Prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const stage2Resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-exp",
      messages: stage2Messages,
      temperature: 0.1,
    }),
  });

  if (!stage2Resp.ok) throw new Error(`Stage 2 failed: ${stage2Resp.status}`);

  const stage2Data = await stage2Resp.json();
  const stage2Content = stage2Data?.choices?.[0]?.message?.content;
  let stage2Result = safeJsonParse(stage2Content);

  if (!stage2Result) {
    const match = stage2Content?.match(/\{[\s\S]*\}/);
    stage2Result = match ? safeJsonParse(match[0]) : null;
  }

  stages_completed.push("context_analysis");

  // Determine final verdict based on both stages
  let finalVerdict: "likely_real" | "likely_manipulated" | "uncertain";
  let finalConfidence: number;
  let finalSummary: string;
  let finalSignals: any[] = [];

  if (stage2Result?.synthetic_generation_likely && stage2Result?.confidence > 0.7) {
    // High confidence synthetic generation
    finalVerdict = "likely_manipulated";
    finalConfidence = Math.min(0.85, stage2Result.confidence);
    finalSummary = "Image shows characteristics consistent with AI-generated or deepfake content";
    finalSignals.push({
      label: "AI Generation Indicators",
      impact: "high",
      note: stage2Result?.context_analysis || "Synthetic generation patterns detected",
    });
    warning_flags.push("synthetic_generation_detected");
  } else if (stage2Result?.legitimate_editing_likely && !stage2Result?.synthetic_generation_likely) {
    // Legitimate editing, not manipulation
    finalVerdict = "likely_real";
    finalConfidence = Math.min(0.75, stage2Result?.confidence || 0.7);
    finalSummary = "Image appears to be a genuine photograph with standard post-processing/editing";
    finalSignals.push({
      label: "Authentic with Editing",
      impact: "low",
      note: "Standard photo editing detected (color correction, retouching, filters) - this is normal and does not indicate deceptive manipulation",
    });
    warning_flags.push("legitimate_editing_present");
  } else {
    // Uncertain - cannot distinguish
    finalVerdict = "uncertain";
    finalConfidence = 0.5;
    finalSummary = "Cannot definitively determine if modifications are legitimate editing or synthetic manipulation";
    finalSignals.push({
      label: "Ambiguous Analysis",
      impact: "medium",
      note: stage2Result?.context_analysis || "Mixed signals - recommend human review or additional verification",
    });
    warning_flags.push("ambiguous_result");
  }

  return {
    verdict: finalVerdict,
    confidence: finalConfidence,
    summary: finalSummary,
    signals: finalSignals,
    recommended_next_steps: generateNextSteps(finalVerdict, finalConfidence, warning_flags),
    metadata: {
      analysis_version: "2.0-multistage",
      stages_completed,
      warning_flags,
    },
  };
}

function generateNextSteps(verdict: string, confidence: number, flags: string[]): string[] {
  const steps: string[] = [];

  if (verdict === "likely_manipulated") {
    steps.push("Verify source and context of this image");
    steps.push("Perform reverse image search to find original");
    steps.push("Check for inconsistencies in lighting and shadows");
    if (confidence < 0.8) {
      steps.push("Consider secondary verification due to moderate confidence");
    }
  } else if (verdict === "uncertain") {
    steps.push("Human expert review recommended");
    steps.push("Cross-reference with known authentic sources");
    steps.push("Check metadata for editing software traces");
    steps.push("Request higher quality version if available");
  } else {
    steps.push("Image appears authentic with standard editing");
    if (flags.includes("legitimate_editing_present")) {
      steps.push("Note: Professional editing detected but does not indicate deceptive manipulation");
    }
    steps.push("Continue to verify source and context as best practice");
  }

  return steps;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, text, imageDataUrl } = (await req.json()) as {
      mode: DetectMode;
      text?: string;
      imageDataUrl?: string;
    };

    if (mode !== "text" && mode !== "image") return jsonResponse({ error: "Invalid mode" }, { status: 400 });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI key is not configured" }, { status: 500 });

    // IMAGE MODE - Use multi-stage analysis
    if (mode === "image") {
      if (!imageDataUrl?.startsWith("data:image")) {
        return jsonResponse({ error: "Missing or invalid image data" }, { status: 400 });
      }

      try {
        const result = await multiStageImageAnalysis(imageDataUrl, LOVABLE_API_KEY);
        return jsonResponse(result);
      } catch (error) {
        console.error("Multi-stage analysis error:", error);

        // Fallback to single-stage with very conservative prompt
        const fallbackSystem =
          "You are TruthShield. Analyze images VERY conservatively. " +
          "Return ONLY valid JSON: {verdict, confidence, summary, signals: [{label, impact, note}], recommended_next_steps: []}. " +
          "CRITICAL RULES: " +
          "1. Only return 'likely_manipulated' if you see DEFINITIVE deepfake/synthetic artifacts (face swap seams, impossible geometry, AI generation patterns). " +
          "2. Return 'likely_real' for genuine photos even if they have normal editing/filters/retouching. " +
          "3. Return 'uncertain' if you cannot definitively distinguish between legitimate editing and manipulation. " +
          "4. Set confidence < 0.7 if there's ANY doubt.";

        const fallbackPrompt =
          "Analyze this image. Focus ONLY on definitive manipulation signs: face swap artifacts, synthetic generation patterns, impossible physics. " +
          "DO NOT flag for: normal photo editing, filters, color grading, compression, noise, blur, standard retouching. " +
          "Be extremely conservative - when in doubt, choose 'uncertain' or 'likely_real' over 'likely_manipulated'.";

        const messages = [
          { role: "system", content: fallbackSystem },
          {
            role: "user",
            content: [
              { type: "text", text: fallbackPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ];

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp",
            messages,
            temperature: 0.1,
          }),
        });

        if (!aiResp.ok) {
          if (aiResp.status === 429)
            return jsonResponse({ error: "Rate limited. Try again in a minute." }, { status: 429 });
          if (aiResp.status === 402) return jsonResponse({ error: "AI usage limit reached." }, { status: 402 });
          return jsonResponse({ error: "AI gateway error" }, { status: 500 });
        }

        const data = await aiResp.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = safeJsonParse(content) || safeJsonParse(content?.match(/\{[\s\S]*\}/)?.[0] || "");

        if (!parsed) return jsonResponse({ error: "Model returned non-JSON output" }, { status: 500 });

        return jsonResponse(coerceResult(parsed));
      }
    }

    // TEXT MODE - Enhanced conservative analysis
    if (!text?.trim()) return jsonResponse({ error: "Missing text" }, { status: 400 });

    const textSystem =
      "You are TruthShield text analyzer. Be VERY conservative. " +
      "Return ONLY valid JSON: {verdict, confidence, summary, signals: [{label, impact, note}], recommended_next_steps: []}. " +
      "RULES: " +
      "1. Only flag 'likely_manipulated' for CLEAR AI-generated text with obvious patterns (repetitive phrases, unnatural transitions, robotic tone). " +
      "2. Return 'likely_real' for human-written text even if well-edited or professional. " +
      "3. Return 'uncertain' if text quality is high but origin is ambiguous. " +
      "4. Do NOT flag educational, technical, or well-written content as AI just because it's coherent.";

    const textPrompt =
      "Analyze this text for DEFINITIVE signs of AI generation (GPT-like patterns, unnatural repetition, robotic structure). " +
      "DO NOT flag for: good grammar, professional writing, technical language, clear structure. " +
      "Be conservative - when in doubt, choose 'uncertain' or 'likely_real'.\n\nTEXT:\n" +
      text;

    const messages = [
      { role: "system", content: textSystem },
      { role: "user", content: textPrompt },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages,
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return jsonResponse({ error: "Rate limited. Try again in a minute." }, { status: 429 });
      if (aiResp.status === 402) return jsonResponse({ error: "AI usage limit reached." }, { status: 402 });
      return jsonResponse({ error: "AI gateway error" }, { status: 500 });
    }

    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content;
    const parsed = safeJsonParse(content) || safeJsonParse(content?.match(/\{[\s\S]*\}/)?.[0] || "");

    if (!parsed) return jsonResponse({ error: "Model returned non-JSON output" }, { status: 500 });

    return jsonResponse(coerceResult(parsed));
  } catch (e) {
    console.error("detect error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
});
