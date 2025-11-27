param(
  [string]$MergedModelDir = "outputs/mistral-fused",
  [string]$OutGgufDir = "models/mistral-lora",
  [string]$ModelName = "mistral-lora"
)

$ErrorActionPreference = "Stop"

# Ensure output dirs
New-Item -ItemType Directory -Force -Path $OutGgufDir | Out-Null

# 1) Clone llama.cpp if missing
if (-not (Test-Path "llama.cpp")) {
  git clone https://github.com/ggerganov/llama.cpp
}

# 2) Install python reqs
Push-Location llama.cpp
pip install -r requirements.txt

# 3) Convert HF -> GGUF FP16
$F16 = "..\$OutGgufDir\$ModelName-f16.gguf"
python convert-hf-to-gguf.py --outfile $F16 --model "..\$MergedModelDir" --vocab-type bpe

# 4) Build quantize tool (MSVC)
cmake -S . -B build
cmake --build build --config Release

# 5) Quantize to Q4_K_M
$Q4 = "..\$OutGgufDir\$ModelName.Q4_K_M.gguf"
.\build\bin\quantize.exe $F16 $Q4 q4_K_M

Pop-Location

Write-Host "GGUF created at: $Q4"



