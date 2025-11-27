# Fine-tuning & Integration Guide (LoRA + 8-bit)

This guide adds fine-tuning capability to your project without changing existing behavior. New files only; current endpoints keep working.

## Files added
- data/alpaca_study_assistant.sample.json (20 examples; scale to 1–2k)
- scripts/train_lora_sft.py (LoRA fine-tuning)
- scripts/merge_lora.py (merge adapters)
- scripts/eval_simple.py (basic eval)
- models/mistral-lora/Modelfile (Ollama template)

## Install (training environment)
```
pip install -U "transformers>=4.41" peft trl datasets bitsandbytes accelerate sentencepiece evaluate
```

## Dataset format (Alpaca JSON)
See data/alpaca_study_assistant.sample.json and expand to 1–2k examples.

## Train (LoRA, 8-bit)
```
export BASE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
export DATASET_PATH=data/alpaca_study_assistant.sample.json
export OUTPUT_DIR=outputs/mistral-lora
export LR=1e-5
accelerate launch --mixed_precision=bf16 scripts/train_lora_sft.py
```

## Merge LoRA
```
python scripts/merge_lora.py
# merged model: outputs/mistral-fused
```

## Use with Ollama (recommended)
1) Convert to GGUF with llama.cpp (outside scope here)
2) Place GGUF as models/mistral-lora/mistral-lora.Q4_K_M.gguf
3) Create model:
```
ollama create mistral-lora -f models/mistral-lora/Modelfile
```
4) Set environment variable (backend):
```
set OLLAMA_MODEL=mistral-lora           # Windows PowerShell
# or
export OLLAMA_MODEL=mistral-lora        # Linux/macOS
```
No code changes required; default remains "mistral" if env not set.

## Evaluate
```
python scripts/eval_simple.py
```

## Notes
- This is additive; existing FastAPI + React continues to work.
- Switch models via env only; no breaking changes.

