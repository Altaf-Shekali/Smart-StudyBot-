import os
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

def main():
    base_model = os.environ.get("BASE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    lora_dir = os.environ.get("LORA_DIR", "outputs/mistral-lora/lora")
    out_dir = os.environ.get("OUT_DIR", "outputs/mistral-fused")

    tok = AutoTokenizer.from_pretrained(base_model, use_fast=True)
    base = AutoModelForCausalLM.from_pretrained(base_model, torch_dtype="auto", device_map="auto")
    merged = PeftModel.from_pretrained(base, lora_dir)
    merged = merged.merge_and_unload()
    os.makedirs(out_dir, exist_ok=True)
    merged.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)
    print("Merged model saved to", out_dir)

if __name__ == "__main__":
    main()

