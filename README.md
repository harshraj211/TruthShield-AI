# TruthShield AI

TruthShield AI is a media authenticity verification console for detecting AI-generated images and AI-generated text with local machine-learning models. It combines a cinematic React dashboard with a FastAPI inference backend, report exports, training visuals, and analyst-friendly evidence signals.

The system is designed as a major-project style prototype: it does not claim perfect proof, but gives calibrated risk signals that help a human reviewer decide what to inspect next.

## Features

- Image AIGC detection using a locally trained EfficientNet-B0 model.
- Text AI-generation detection using a locally trained RoBERTa model.
- Hybrid text scoring that blends ML probability with writing-pattern signals.
- Audio workflow with transcription and suspicious-segment analysis hooks.
- Downloadable JSON, HTML, and PDF-style reports.
- Training result visuals for the image and text models.
- Incident library and training modules for awareness/education.
- Dark cinematic dashboard UI built for repeated analyst work.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Styling: Tailwind CSS, shadcn/ui, Radix UI
- Icons: lucide-react
- Backend: FastAPI, Uvicorn
- ML: PyTorch, torchvision, Hugging Face Transformers
- Models:
  - EfficientNet-B0 for image classification
  - RoBERTa for text classification

## Project Structure

```txt
.
|-- backend/
|   |-- app.py                 # FastAPI inference server
|   |-- requirements.txt       # Python backend dependencies
|   `-- README.md
|-- ML/
|   |-- truthshield_aigc_efficientnet_b0_final.pth
|   |-- training_ai_detector.png
|   |-- download (1).png       # image-model confusion matrix
|   `-- text/
|       |-- truthshield_text_roberta_m4/
|       |   |-- config.json
|       |   |-- model.safetensors
|       |   |-- tokenizer.json
|       |   `-- tokenizer_config.json
|       `-- text_detector_training_plot.png
|-- src/
|   |-- pages/
|   |-- components/
|   |-- lib/
|   `-- integrations/
`-- package.json
```

Note: model weights are intentionally ignored by `.gitignore` because they are large binary artifacts. Keep them locally under `ML/` when running the full app.

## Model Summary

### Image Detector

- Architecture: EfficientNet-B0
- Task: real image vs AI-generated image
- Default model path:

```txt
ML/truthshield_aigc_efficientnet_b0_final.pth
```

- Default class order:

```txt
real,fake
```

### Text Detector

- Architecture: RoBERTa base
- Dataset family: M4 machine-generated text detection dataset
- Task: human-written text vs AI-generated text
- Default model path:

```txt
ML/text/truthshield_text_roberta_m4
```

- Default class order:

```txt
human,ai
```

The text detector also calculates writing-pattern signals such as lexical diversity, sentence variation, repetition, and length reliability. This helps avoid blindly trusting the classifier on short or casual text.

## Prerequisites

Install:

- Node.js 18+
- npm
- Python 3.10+ recommended
- pip

On Windows, PowerShell is recommended for the commands below.

## Frontend Setup

Install JavaScript dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

The frontend usually runs at:

```txt
http://127.0.0.1:8080
```

Open the detection page:

```txt
http://127.0.0.1:8080/detection
```

## Backend Setup

Install Python dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the ML backend:

```bash
npm run ml:dev
```

Equivalent direct command:

```bash
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8010
```

The backend runs at:

```txt
http://127.0.0.1:8010
```

Health check:

```txt
http://127.0.0.1:8010/health
```

## Running The Full App

Use two terminals.

Terminal 1:

```bash
npm run ml:dev
```

Terminal 2:

```bash
npm run dev
```

Then open:

```txt
http://127.0.0.1:8080/detection
```

## API Endpoints

### Health

```txt
GET /health
```

Returns loaded model paths, device, and class order.

### Image Prediction

```txt
POST /predict-image
```

Form-data:

```txt
file=<image file>
```

Returns:

- verdict
- confidence
- model probability
- evidence signals
- recommended next steps

### Text Prediction

```txt
POST /predict-text
```

JSON body:

```json
{
  "text": "Paste text to analyze..."
}
```

Returns:

- verdict
- confidence
- RoBERTa probability
- writing-pattern score
- hybrid calibration signal
- recommended next steps

## Environment Variables

Optional backend overrides:

```bash
TRUTHSHIELD_MODEL_PATH=ML/truthshield_aigc_efficientnet_b0_final.pth
TRUTHSHIELD_CLASS_ORDER=real,fake
TRUTHSHIELD_TEXT_MODEL_PATH=ML/text/truthshield_text_roberta_m4
TRUTHSHIELD_TEXT_CLASS_ORDER=human,ai
TRUTHSHIELD_IMAGE_SIZE=224
TRUTHSHIELD_CONFIDENCE_THRESHOLD=0.65
TRUTHSHIELD_TEXT_MAX_LENGTH=256
TRUTHSHIELD_TEXT_CONFIDENCE_THRESHOLD=0.65
TRUTHSHIELD_TEXT_HYBRID_WEIGHT=0.72
```

Frontend override for the local ML backend:

```bash
VITE_IMAGE_DETECTOR_URL=http://127.0.0.1:8010
```

## Build

Create a production build:

```bash
npm run build
```

Preview the build:

```bash
npm run preview
```

## Important Limitations

TruthShield should be used as a review aid, not as final proof.

- AI image detectors can fail on screenshots, compression, edits, crops, or images outside the training distribution.
- AI text detectors are inherently difficult and can be confused by short text, polished human writing, paraphrasing, translation, or grammar correction.
- Confidence is probabilistic, not legal or forensic certainty.
- Reports should be paired with source checks, metadata checks, and human review.

## Git And Security Notes

The repository ignores:

- `.env` files
- Kaggle tokens
- model weights and checkpoints
- generated logs
- large media files
- build outputs

If a secret or large model file was committed before being added to `.gitignore`, remove it from git history separately. `.gitignore` only prevents future tracking.

## Suggested Demo Flow

1. Start backend with `npm run ml:dev`.
2. Start frontend with `npm run dev`.
3. Open `/detection`.
4. Upload an AI-generated image.
5. Paste a longer human-written and AI-generated text sample.
6. Export the report as JSON or HTML.
7. Show the training curves on the dashboard.

## Project Status

This is an academic/major-project prototype focused on local ML integration, explainable detection signals, and a polished analyst dashboard experience.
