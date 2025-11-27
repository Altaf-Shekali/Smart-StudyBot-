#!/usr/bin/env python3
"""
LoRA Fine-tuning Script for Study Assistant
Optimized for single GPU (RTX 3090/4090 or A100)
"""

import os
import json
import torch
from datasets import Dataset
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, 
    TrainingArguments, Trainer,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StudyAssistantFineTuner:
    def __init__(self, model_name="mistralai/Mistral-7B-v0.1"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
    def load_model_and_tokenizer(self):
        """Load model with 8-bit quantization for memory efficiency"""
        
        # 8-bit quantization config
        bnb_config = BitsAndBytesConfig(
            load_in_8bit=True,
            bnb_8bit_use_double_quant=True,
            bnb_8bit_quant_type="nf8",
            bnb_8bit_compute_dtype=torch.bfloat16
        )
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Load model with quantization
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            quantization_config=bnb_config,
            device_map="auto",
            trust_remote_code=True
        )
        
        # Prepare for k-bit training
        self.model = prepare_model_for_kbit_training(self.model)
        
        logger.info("Model and tokenizer loaded successfully")
        
    def setup_lora(self):
        """Setup LoRA configuration"""
        
        lora_config = LoraConfig(
            r=16,  # Rank
            lora_alpha=32,  # Alpha parameter
            target_modules=["q_proj", "v_proj", "k_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
            lora_dropout=0.1,
            bias="none",
            task_type="CAUSAL_LM"
        )
        
        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()
        
        logger.info("LoRA configuration applied")
        
    def load_dataset(self, train_file="finetune_dataset.json", eval_file="eval_dataset.json"):
        """Load and preprocess dataset"""
        
        # Load training data
        with open(train_file, 'r', encoding='utf-8') as f:
            train_data = json.load(f)
            
        # Load evaluation data
        with open(eval_file, 'r', encoding='utf-8') as f:
            eval_data = json.load(f)
            
        # Create datasets
        self.train_dataset = Dataset.from_list(train_data)
        self.eval_dataset = Dataset.from_list(eval_data)
        
        # Tokenize datasets
        self.train_dataset = self.train_dataset.map(
            self.tokenize_function,
            batched=True,
            remove_columns=self.train_dataset.column_names
        )
        
        self.eval_dataset = self.eval_dataset.map(
            self.tokenize_function,
            batched=True,
            remove_columns=self.eval_dataset.column_names
        )
        
        logger.info(f"Dataset loaded: {len(self.train_dataset)} train, {len(self.eval_dataset)} eval")
        
    def tokenize_function(self, examples):
        """Tokenize examples in Alpaca format"""
        
        prompts = []
        for instruction, input_text, output in zip(examples["instruction"], examples["input"], examples["output"]):
            if input_text:
                prompt = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n{output}"
            else:
                prompt = f"### Instruction:\n{instruction}\n\n### Response:\n{output}"
            prompts.append(prompt)
            
        # Tokenize
        tokenized = self.tokenizer(
            prompts,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        )
        
        # Set labels for causal LM
        tokenized["labels"] = tokenized["input_ids"].clone()
        
        return tokenized
        
    def train(self, output_dir="./study-assistant-lora"):
        """Train the model with LoRA"""
        
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=3,
            per_device_train_batch_size=4,
            per_device_eval_batch_size=4,
            gradient_accumulation_steps=4,
            warmup_steps=100,
            learning_rate=2e-5,
            fp16=True,
            logging_steps=10,
            eval_steps=100,
            save_steps=500,
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            report_to=None,  # Disable wandb
            dataloader_pin_memory=False,
            remove_unused_columns=False,
        )
        
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.eval_dataset,
            tokenizer=self.tokenizer,
        )
        
        # Start training
        logger.info("Starting training...")
        trainer.train()
        
        # Save the final model
        trainer.save_model()
        self.tokenizer.save_pretrained(output_dir)
        
        logger.info(f"Training completed. Model saved to {output_dir}")
        
    def run_full_pipeline(self):
        """Run the complete fine-tuning pipeline"""
        
        logger.info("Starting Study Assistant Fine-tuning Pipeline")
        
        # Load model and tokenizer
        self.load_model_and_tokenizer()
        
        # Setup LoRA
        self.setup_lora()
        
        # Load dataset
        self.load_dataset()
        
        # Train
        self.train()
        
        logger.info("Fine-tuning pipeline completed successfully!")

def main():
    """Main function to run fine-tuning"""
    
    # Check if dataset exists
    if not os.path.exists("finetune_dataset.json"):
        logger.error("Dataset not found. Run create_dataset.py first.")
        return
        
    # Initialize fine-tuner
    fine_tuner = StudyAssistantFineTuner()
    
    # Run pipeline
    fine_tuner.run_full_pipeline()

if __name__ == "__main__":
    main()
