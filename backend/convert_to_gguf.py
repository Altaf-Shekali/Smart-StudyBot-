#!/usr/bin/env python3
"""
GGUF Conversion Script for Fine-tuned Study Assistant
Converts LoRA fine-tuned model to GGUF format for Ollama integration
"""

import os
import subprocess
import sys
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GGUFConverter:
    def __init__(self, 
                 base_model="mistralai/Mistral-7B-v0.1",
                 lora_path="./study-assistant-lora",
                 output_dir="./gguf_models"):
        self.base_model = base_model
        self.lora_path = lora_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def merge_lora_weights(self):
        """Merge LoRA weights with base model"""
        
        logger.info("Merging LoRA weights with base model...")
        
        merge_script = """
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# Load base model and tokenizer
base_model_name = "{base_model}"
lora_path = "{lora_path}"

print("Loading base model...")
tokenizer = AutoTokenizer.from_pretrained(base_model_name)
base_model = AutoModelForCausalLM.from_pretrained(
    base_model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("Loading LoRA model...")
model = PeftModel.from_pretrained(base_model, lora_path)

print("Merging weights...")
merged_model = model.merge_and_unload()

print("Saving merged model...")
merged_model.save_pretrained("./merged_model", safe_serialization=True)
tokenizer.save_pretrained("./merged_model")

print("Merge completed successfully!")
""".format(base_model=self.base_model, lora_path=self.lora_path)
        
        # Write merge script
        with open("merge_lora.py", "w") as f:
            f.write(merge_script)
            
        # Run merge script
        result = subprocess.run([sys.executable, "merge_lora.py"], 
                              capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Merge failed: {result.stderr}")
            return False
            
        logger.info("LoRA weights merged successfully")
        return True
        
    def convert_to_gguf(self, quantization="q4_k_m"):
        """Convert merged model to GGUF format"""
        
        logger.info(f"Converting to GGUF with {quantization} quantization...")
        
        # Check if llama.cpp is available
        llama_cpp_path = Path("../llama.cpp")
        if not llama_cpp_path.exists():
            logger.error("llama.cpp not found. Please clone it to the parent directory.")
            return False
            
        convert_script = llama_cpp_path / "convert.py"
        quantize_script = llama_cpp_path / "quantize"
        
        if not convert_script.exists():
            logger.error("convert.py not found in llama.cpp directory")
            return False
            
        # Step 1: Convert to GGUF format (FP16)
        fp16_path = self.output_dir / "study-assistant-fp16.gguf"
        
        convert_cmd = [
            sys.executable, str(convert_script),
            "./merged_model",
            "--outtype", "f16",
            "--outfile", str(fp16_path)
        ]
        
        logger.info("Converting to FP16 GGUF...")
        result = subprocess.run(convert_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FP16 conversion failed: {result.stderr}")
            return False
            
        # Step 2: Quantize to specified format
        quantized_path = self.output_dir / f"study-assistant-{quantization}.gguf"
        
        if quantize_script.exists():
            quantize_cmd = [
                str(quantize_script),
                str(fp16_path),
                str(quantized_path),
                quantization.upper()
            ]
            
            logger.info(f"Quantizing to {quantization}...")
            result = subprocess.run(quantize_cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"Quantization failed: {result.stderr}")
                return False
                
            logger.info(f"Model converted to {quantized_path}")
        else:
            logger.warning("Quantize binary not found, using FP16 version")
            quantized_path = fp16_path
            
        return str(quantized_path)
        
    def create_modelfile(self, gguf_path):
        """Create Ollama Modelfile"""
        
        modelfile_content = f'''FROM {gguf_path}

TEMPLATE """### Instruction:
{{{{ .Prompt }}}}

### Response:
"""

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

SYSTEM """You are a helpful study assistant. Always respond in this format:
Answer: [Direct answer]
Explanation: [Detailed explanation]
Example: [Code or practical example if applicable]
Source: [Reference or context]

Keep responses concise, clear, and educational."""
'''
        
        modelfile_path = self.output_dir / "Modelfile"
        with open(modelfile_path, "w") as f:
            f.write(modelfile_content)
            
        logger.info(f"Modelfile created at {modelfile_path}")
        return str(modelfile_path)
        
    def register_with_ollama(self, modelfile_path, model_name="study-assistant"):
        """Register model with Ollama"""
        
        logger.info(f"Registering model '{model_name}' with Ollama...")
        
        register_cmd = ["ollama", "create", model_name, "-f", modelfile_path]
        
        result = subprocess.run(register_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Ollama registration failed: {result.stderr}")
            return False
            
        logger.info(f"Model '{model_name}' registered successfully with Ollama")
        return True
        
    def run_conversion_pipeline(self, quantization="q4_k_m", model_name="study-assistant"):
        """Run complete conversion pipeline"""
        
        logger.info("Starting GGUF conversion pipeline...")
        
        # Step 1: Merge LoRA weights
        if not self.merge_lora_weights():
            return False
            
        # Step 2: Convert to GGUF
        gguf_path = self.convert_to_gguf(quantization)
        if not gguf_path:
            return False
            
        # Step 3: Create Modelfile
        modelfile_path = self.create_modelfile(gguf_path)
        
        # Step 4: Register with Ollama
        if not self.register_with_ollama(modelfile_path, model_name):
            logger.warning("Ollama registration failed, but GGUF conversion completed")
            
        logger.info("GGUF conversion pipeline completed!")
        logger.info(f"Model available at: {gguf_path}")
        logger.info(f"Modelfile at: {modelfile_path}")
        
        return True

def main():
    """Main conversion function"""
    
    # Check if fine-tuned model exists
    if not os.path.exists("./study-assistant-lora"):
        logger.error("Fine-tuned model not found. Run finetune_script.py first.")
        return
        
    converter = GGUFConverter()
    
    # Run conversion with different quantization options
    quantizations = ["q4_k_m", "q5_k_m", "q8_0"]
    
    for quant in quantizations:
        logger.info(f"Converting with {quant} quantization...")
        model_name = f"study-assistant-{quant}"
        
        success = converter.run_conversion_pipeline(
            quantization=quant,
            model_name=model_name
        )
        
        if success:
            logger.info(f"✅ {model_name} conversion completed")
        else:
            logger.error(f"❌ {model_name} conversion failed")

if __name__ == "__main__":
    main()
