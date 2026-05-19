# TruthShield ML Backend

Local FastAPI inference service for the trained EfficientNet-B0 AIGC image detector and RoBERTa M4 text detector.

## Start

```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8010 --reload
```

The React app calls:

```txt
http://127.0.0.1:8010/predict-image
http://127.0.0.1:8010/predict-text
```

## Class Order

The checkpoint only contains weights, not `class_to_idx`. The default class order is:

```powershell
real,fake
```

That matches the Hugging Face AIGC benchmark labels used for the new model: `0 = real`, `1 = fake`.

If predictions look reversed, restart with:

```powershell
$env:TRUTHSHIELD_CLASS_ORDER="fake,real"
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8010 --reload
```

## Text Model

The default text model folder is:

```txt
ML/text/truthshield_text_roberta_m4
```

The default text class order is:

```powershell
human,ai
```

That matches the training labels: `0 = human-written`, `1 = AI-generated`.
