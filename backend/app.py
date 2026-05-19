from __future__ import annotations

import os
import math
import re
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from torchvision import models, transforms


ROOT_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("TRUTHSHIELD_MODEL_PATH", ROOT_DIR / "ML" / "truthshield_aigc_efficientnet_b0_final.pth"))
CLASS_ORDER = [x.strip().lower() for x in os.getenv("TRUTHSHIELD_CLASS_ORDER", "real,fake").split(",")]
TEXT_MODEL_PATH = Path(os.getenv("TRUTHSHIELD_TEXT_MODEL_PATH", ROOT_DIR / "ML" / "text" / "truthshield_text_roberta_m4"))
TEXT_CLASS_ORDER = [x.strip().lower() for x in os.getenv("TRUTHSHIELD_TEXT_CLASS_ORDER", "human,ai").split(",")]
IMAGE_SIZE = int(os.getenv("TRUTHSHIELD_IMAGE_SIZE", "224"))
CONFIDENCE_THRESHOLD = float(os.getenv("TRUTHSHIELD_CONFIDENCE_THRESHOLD", "0.65"))
TEXT_MAX_LENGTH = int(os.getenv("TRUTHSHIELD_TEXT_MAX_LENGTH", "256"))
TEXT_CONFIDENCE_THRESHOLD = float(os.getenv("TRUTHSHIELD_TEXT_CONFIDENCE_THRESHOLD", "0.65"))
TEXT_HYBRID_WEIGHT = float(os.getenv("TRUTHSHIELD_TEXT_HYBRID_WEIGHT", "0.72"))


if len(CLASS_ORDER) != 2 or set(CLASS_ORDER) != {"real", "fake"}:
  raise RuntimeError("TRUTHSHIELD_CLASS_ORDER must contain exactly real and fake, for example: real,fake")

if len(TEXT_CLASS_ORDER) != 2 or set(TEXT_CLASS_ORDER) != {"human", "ai"}:
  raise RuntimeError("TRUTHSHIELD_TEXT_CLASS_ORDER must contain exactly human and ai, for example: human,ai")


class TextRequest(BaseModel):
  text: str


app = FastAPI(title="TruthShield ML Backend", version="1.0.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=False,
  allow_methods=["*"],
  allow_headers=["*"],
)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

preprocess = transforms.Compose(
  [
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
  ]
)


def build_model() -> nn.Module:
  model = models.efficientnet_b0(weights=None)
  model.classifier[1] = nn.Linear(model.classifier[1].in_features, 2)
  return model


def load_checkpoint() -> nn.Module:
  if not MODEL_PATH.exists():
    raise RuntimeError(f"Model file not found: {MODEL_PATH}")

  checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
  state_dict: dict[str, Any]

  if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
    state_dict = checkpoint["model_state_dict"]
  elif isinstance(checkpoint, dict) and "state_dict" in checkpoint:
    state_dict = checkpoint["state_dict"]
  elif isinstance(checkpoint, dict):
    state_dict = checkpoint
  else:
    raise RuntimeError("Unsupported checkpoint format. Expected a state_dict-like .pth file.")

  state_dict = {key.replace("module.", "", 1): value for key, value in state_dict.items()}

  model = build_model()
  model.load_state_dict(state_dict, strict=True)
  model.to(device)
  model.eval()
  return model


image_model = load_checkpoint()


def load_text_model() -> tuple[Any, Any]:
  if not TEXT_MODEL_PATH.exists():
    raise RuntimeError(f"Text model folder not found: {TEXT_MODEL_PATH}")

  tokenizer = AutoTokenizer.from_pretrained(TEXT_MODEL_PATH)
  text_model = AutoModelForSequenceClassification.from_pretrained(TEXT_MODEL_PATH)
  text_model.to(device)
  text_model.eval()
  return tokenizer, text_model


text_tokenizer, text_model = load_text_model()


def result_payload(fake_probability: float) -> dict[str, Any]:
  real_probability = 1.0 - fake_probability
  predicted_label = "fake" if fake_probability >= real_probability else "real"
  confidence = max(fake_probability, real_probability)

  if confidence < CONFIDENCE_THRESHOLD:
    verdict = "uncertain"
    impact = "medium"
    summary = "The local AIGC image model found mixed visual evidence, so this image should be reviewed manually."
  elif predicted_label == "fake":
    verdict = "likely_manipulated"
    impact = "high"
    summary = "The local AIGC image model classified this image as likely AI-generated."
  else:
    verdict = "likely_real"
    impact = "low"
    summary = "The local AIGC image model classified this image as likely authentic."

  return {
    "verdict": verdict,
    "confidence": round(float(confidence), 4),
    "summary": summary,
    "signals": [
      {
        "label": "AIGC EfficientNet-B0 prediction",
        "impact": impact,
        "note": (
          f"Class probabilities using order {CLASS_ORDER}: "
          f"real={real_probability:.2%}, fake={fake_probability:.2%}."
        ),
      },
      {
        "label": "Local AIGC model inference",
        "impact": "low",
        "note": f"Model loaded from {MODEL_PATH.name} on {device.type.upper()} with {IMAGE_SIZE}x{IMAGE_SIZE} preprocessing.",
      },
    ],
    "recommended_next_steps": [
      "Use this model output as a screening signal, not final proof.",
      "Check source, metadata, and reverse-image search results before escalation.",
      "Treat screenshots, heavy compression, crops, and out-of-distribution images cautiously.",
    ],
    "metadata": {
      "model": "efficientnet_b0",
      "model_path": str(MODEL_PATH),
      "device": device.type,
      "class_order": CLASS_ORDER,
      "probabilities": {
        "real": round(float(real_probability), 6),
        "fake": round(float(fake_probability), 6),
      },
      "threshold": CONFIDENCE_THRESHOLD,
    },
  }


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
  return max(low, min(high, value))


def split_sentences(text: str) -> list[str]:
  return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]


def text_pattern_analysis(text: str) -> dict[str, Any]:
  words = re.findall(r"[A-Za-z][A-Za-z'-]*", text.lower())
  sentences = split_sentences(text)
  word_count = len(words)
  unique_count = len(set(words))
  sentence_lengths = [len(re.findall(r"[A-Za-z][A-Za-z'-]*", sentence)) for sentence in sentences]
  avg_sentence_length = sum(sentence_lengths) / max(1, len(sentence_lengths))
  lexical_diversity = unique_count / max(1, word_count)
  repeated_ratio = 1.0 - lexical_diversity

  if len(sentence_lengths) > 1:
    mean = avg_sentence_length
    variance = sum((length - mean) ** 2 for length in sentence_lengths) / len(sentence_lengths)
    std_dev = math.sqrt(variance)
    burstiness = std_dev / max(1.0, mean)
  else:
    burstiness = 0.0

  transition_words = {
    "moreover",
    "furthermore",
    "additionally",
    "therefore",
    "consequently",
    "however",
    "overall",
    "in conclusion",
    "significantly",
  }
  transition_hits = sum(text.lower().count(token) for token in transition_words)
  transition_density = transition_hits / max(1, len(sentences))

  length_reliability = clamp((word_count - 25) / 175)
  uniformity_score = clamp((0.45 - burstiness) / 0.45)
  repetition_score = clamp((repeated_ratio - 0.38) / 0.22)
  transition_score = clamp(transition_density / 0.8)
  very_short_penalty = 1.0 - length_reliability

  pattern_ai_probability = clamp(
    0.18
    + 0.30 * uniformity_score
    + 0.24 * repetition_score
    + 0.18 * transition_score
    + 0.10 * clamp((avg_sentence_length - 22) / 18)
  )

  return {
    "word_count": word_count,
    "sentence_count": len(sentences),
    "avg_sentence_length": avg_sentence_length,
    "lexical_diversity": lexical_diversity,
    "burstiness": burstiness,
    "transition_density": transition_density,
    "length_reliability": length_reliability,
    "very_short_penalty": very_short_penalty,
    "pattern_ai_probability": pattern_ai_probability,
  }


def signal_impact(probability: float) -> str:
  if probability >= 0.7:
    return "high"
  if probability >= 0.45:
    return "medium"
  return "low"


def text_result_payload(model_ai_probability: float, analysis: dict[str, Any]) -> dict[str, Any]:
  pattern_ai_probability = analysis["pattern_ai_probability"]
  reliability = analysis["length_reliability"]
  model_weight = clamp(TEXT_HYBRID_WEIGHT * (0.45 + 0.55 * reliability), 0.35, 0.85)
  ai_probability = clamp((model_ai_probability * model_weight) + (pattern_ai_probability * (1.0 - model_weight)))
  human_probability = 1.0 - ai_probability
  predicted_label = "ai" if ai_probability >= human_probability else "human"
  confidence = max(ai_probability, human_probability)

  if confidence < TEXT_CONFIDENCE_THRESHOLD:
    verdict = "uncertain"
    impact = "medium"
    summary = "The hybrid text detector found mixed ML and writing-pattern evidence, so this text should be reviewed manually."
  elif predicted_label == "ai":
    verdict = "likely_manipulated"
    impact = "high"
    summary = "The hybrid text detector classified this text as likely AI-generated."
  else:
    verdict = "likely_real"
    impact = "low"
    summary = "The hybrid text detector classified this text as likely human-written."

  return {
    "verdict": verdict,
    "confidence": round(float(confidence), 4),
    "summary": summary,
    "signals": [
      {
        "label": "RoBERTa M4 text prediction",
        "impact": signal_impact(model_ai_probability),
        "note": (
          f"Class probabilities using order {TEXT_CLASS_ORDER}: "
          f"human={1.0 - model_ai_probability:.2%}, ai={model_ai_probability:.2%}."
        ),
      },
      {
        "label": "Writing pattern score",
        "impact": signal_impact(pattern_ai_probability),
        "note": (
          f"Heuristic AI-likeness={pattern_ai_probability:.2%}; "
          f"{analysis['word_count']} words, {analysis['sentence_count']} sentences, "
          f"lexical diversity={analysis['lexical_diversity']:.2f}, burstiness={analysis['burstiness']:.2f}."
        ),
      },
      {
        "label": "Hybrid calibration",
        "impact": "medium" if analysis["length_reliability"] < 0.55 else "low",
        "note": (
          f"Final score blends ML probability with writing-pattern evidence. "
          f"Length reliability={analysis['length_reliability']:.2f}; very short text is treated more cautiously."
        ),
      },
      {
        "label": "Local text model inference",
        "impact": "low",
        "note": f"Model loaded from {TEXT_MODEL_PATH.name} on {device.type.upper()} with max length {TEXT_MAX_LENGTH}.",
      },
    ],
    "recommended_next_steps": [
      "Use this output as a screening signal, not final proof.",
      "Review source context, authorship history, and edits before escalation.",
      "Treat very short, paraphrased, translated, or grammar-corrected text cautiously.",
    ],
    "metadata": {
      "model": "roberta-base",
      "model_path": str(TEXT_MODEL_PATH),
      "device": device.type,
      "class_order": TEXT_CLASS_ORDER,
      "probabilities": {
        "human": round(float(human_probability), 6),
        "ai": round(float(ai_probability), 6),
        "model_ai": round(float(model_ai_probability), 6),
        "pattern_ai": round(float(pattern_ai_probability), 6),
      },
      "pattern_analysis": {
        "word_count": analysis["word_count"],
        "sentence_count": analysis["sentence_count"],
        "avg_sentence_length": round(float(analysis["avg_sentence_length"]), 3),
        "lexical_diversity": round(float(analysis["lexical_diversity"]), 3),
        "burstiness": round(float(analysis["burstiness"]), 3),
        "transition_density": round(float(analysis["transition_density"]), 3),
        "length_reliability": round(float(analysis["length_reliability"]), 3),
      },
      "threshold": TEXT_CONFIDENCE_THRESHOLD,
    },
  }


@app.get("/health")
def health() -> dict[str, Any]:
  return {
    "ok": True,
    "model_path": str(MODEL_PATH),
    "text_model_path": str(TEXT_MODEL_PATH),
    "device": device.type,
    "class_order": CLASS_ORDER,
    "text_class_order": TEXT_CLASS_ORDER,
  }


@app.post("/predict-image")
async def predict_image(file: UploadFile = File(...)) -> dict[str, Any]:
  if not file.content_type or not file.content_type.startswith("image/"):
    raise HTTPException(status_code=400, detail="Please upload an image file.")

  try:
    image = Image.open(file.file)
    image = ImageOps.exif_transpose(image).convert("RGB")
  except UnidentifiedImageError as exc:
    raise HTTPException(status_code=400, detail="Could not read image file.") from exc

  tensor = preprocess(image).unsqueeze(0).to(device)

  with torch.inference_mode():
    logits = image_model(tensor)
    probabilities = torch.softmax(logits, dim=1).squeeze(0).detach().cpu().tolist()

  probability_by_class = {CLASS_ORDER[index]: float(probabilities[index]) for index in range(2)}
  return result_payload(fake_probability=probability_by_class["fake"])


@app.post("/predict-text")
async def predict_text(payload: TextRequest) -> dict[str, Any]:
  text = payload.text.strip()

  if len(text) < 20:
    raise HTTPException(status_code=400, detail="Please enter at least 20 characters for text analysis.")

  encoded = text_tokenizer(
    text,
    truncation=True,
    padding="max_length",
    max_length=TEXT_MAX_LENGTH,
    return_tensors="pt",
  )
  encoded = {key: value.to(device) for key, value in encoded.items()}

  with torch.inference_mode():
    logits = text_model(**encoded).logits
    probabilities = torch.softmax(logits, dim=1).squeeze(0).detach().cpu().tolist()

  probability_by_class = {TEXT_CLASS_ORDER[index]: float(probabilities[index]) for index in range(2)}
  analysis = text_pattern_analysis(text)
  return text_result_payload(model_ai_probability=probability_by_class["ai"], analysis=analysis)
