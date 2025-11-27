param(
  [string]$GgufPath = "models/mistral-lora/mistral-lora.Q4_K_M.gguf",
  [string]$ModelName = "mistral-lora"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $GgufPath)) {
  Write-Error "GGUF not found at $GgufPath"
}

# Create model in Ollama
ollama create $ModelName -f "models/$ModelName/Modelfile"

# Verify
ollama list

# Write backend .env to activate
Set-Content -Path backend/.env -Value "OLLAMA_MODEL=$ModelName"
Write-Host "Set backend/.env to OLLAMA_MODEL=$ModelName"



