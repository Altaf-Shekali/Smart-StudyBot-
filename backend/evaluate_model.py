#!/usr/bin/env python3
"""
Evaluation Framework for Fine-tuned Study Assistant
Tests model performance against base model
"""

import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import time
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelEvaluator:
    def __init__(self, base_model_name="mistralai/Mistral-7B-v0.1", finetuned_model_path="./study-assistant-lora"):
        self.base_model_name = base_model_name
        self.finetuned_model_path = finetuned_model_path
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_models(self):
        """Load both base and fine-tuned models"""
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
            
        # Load base model
        logger.info("Loading base model...")
        self.base_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        
        # Load fine-tuned model
        logger.info("Loading fine-tuned model...")
        self.finetuned_model = AutoModelForCausalLM.from_pretrained(
            self.base_model_name,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        self.finetuned_model = PeftModel.from_pretrained(
            self.finetuned_model,
            self.finetuned_model_path
        )
        
        logger.info("Models loaded successfully")
        
    def generate_response(self, model, prompt: str, max_length: int = 256) -> str:
        """Generate response from model"""
        
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=max_length,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                eos_token_id=self.tokenizer.eos_token_id
            )
            
        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove the input prompt from response
        response = response[len(prompt):].strip()
        
        return response
        
    def evaluate_format_consistency(self, response: str) -> Dict[str, bool]:
        """Check if response follows Answer → Explanation → Example → Source format"""
        
        checks = {
            "has_answer": "Answer:" in response,
            "has_explanation": "Explanation:" in response,
            "has_example": "Example:" in response or "```" in response,
            "has_source": "Source:" in response
        }
        
        return checks
        
    def evaluate_on_dataset(self, eval_file: str = "eval_dataset.json") -> Dict:
        """Evaluate both models on evaluation dataset"""
        
        # Load evaluation dataset
        with open(eval_file, 'r', encoding='utf-8') as f:
            eval_data = json.load(f)
            
        results = {
            "base_model": {"format_scores": [], "response_times": []},
            "finetuned_model": {"format_scores": [], "response_times": []}
        }
        
        logger.info(f"Evaluating on {len(eval_data)} examples...")
        
        for i, example in enumerate(eval_data[:20]):  # Limit to 20 for quick evaluation
            instruction = example["instruction"]
            input_text = example.get("input", "")
            
            # Create prompt
            if input_text:
                prompt = f"### Instruction:\n{instruction}\n\n### Input:\n{input_text}\n\n### Response:\n"
            else:
                prompt = f"### Instruction:\n{instruction}\n\n### Response:\n"
                
            # Evaluate base model
            start_time = time.time()
            base_response = self.generate_response(self.base_model, prompt)
            base_time = time.time() - start_time
            base_format = self.evaluate_format_consistency(base_response)
            
            # Evaluate fine-tuned model
            start_time = time.time()
            ft_response = self.generate_response(self.finetuned_model, prompt)
            ft_time = time.time() - start_time
            ft_format = self.evaluate_format_consistency(ft_response)
            
            # Store results
            results["base_model"]["format_scores"].append(sum(base_format.values()))
            results["base_model"]["response_times"].append(base_time)
            
            results["finetuned_model"]["format_scores"].append(sum(ft_format.values()))
            results["finetuned_model"]["response_times"].append(ft_time)
            
            if i % 5 == 0:
                logger.info(f"Processed {i+1}/{len(eval_data[:20])} examples")
                
        # Calculate averages
        base_avg_format = sum(results["base_model"]["format_scores"]) / len(results["base_model"]["format_scores"])
        ft_avg_format = sum(results["finetuned_model"]["format_scores"]) / len(results["finetuned_model"]["format_scores"])
        
        base_avg_time = sum(results["base_model"]["response_times"]) / len(results["base_model"]["response_times"])
        ft_avg_time = sum(results["finetuned_model"]["response_times"]) / len(results["finetuned_model"]["response_times"])
        
        summary = {
            "base_model": {
                "avg_format_score": base_avg_format,
                "avg_response_time": base_avg_time
            },
            "finetuned_model": {
                "avg_format_score": ft_avg_format,
                "avg_response_time": ft_avg_time
            },
            "improvement": {
                "format_score": ft_avg_format - base_avg_format,
                "response_time": base_avg_time - ft_avg_time  # Positive if faster
            }
        }
        
        return summary
        
    def run_sample_comparison(self):
        """Run side-by-side comparison on sample questions"""
        
        sample_questions = [
            "Explain binary search algorithm with time complexity.",
            "What is the difference between supervised and unsupervised learning?",
            "How do you implement a stack using arrays in Python?",
            "Explain the concept of Big O notation with examples.",
            "What are the advantages of using React hooks?"
        ]
        
        logger.info("Running sample comparison...")
        
        for question in sample_questions:
            prompt = f"### Instruction:\n{question}\n\n### Response:\n"
            
            print(f"\n{'='*60}")
            print(f"QUESTION: {question}")
            print(f"{'='*60}")
            
            # Base model response
            base_response = self.generate_response(self.base_model, prompt)
            print(f"\nBASE MODEL:")
            print(base_response)
            
            # Fine-tuned model response
            ft_response = self.generate_response(self.finetuned_model, prompt)
            print(f"\nFINE-TUNED MODEL:")
            print(ft_response)
            
            # Format analysis
            base_format = self.evaluate_format_consistency(base_response)
            ft_format = self.evaluate_format_consistency(ft_response)
            
            print(f"\nFORMAT ANALYSIS:")
            print(f"Base Model Score: {sum(base_format.values())}/4")
            print(f"Fine-tuned Score: {sum(ft_format.values())}/4")
            
def main():
    """Main evaluation function"""
    
    evaluator = ModelEvaluator()
    
    try:
        evaluator.load_models()
        
        # Run quantitative evaluation
        results = evaluator.evaluate_on_dataset()
        
        print("\n" + "="*60)
        print("EVALUATION RESULTS")
        print("="*60)
        print(f"Base Model - Avg Format Score: {results['base_model']['avg_format_score']:.2f}/4")
        print(f"Fine-tuned Model - Avg Format Score: {results['finetuned_model']['avg_format_score']:.2f}/4")
        print(f"Format Score Improvement: {results['improvement']['format_score']:.2f}")
        print(f"Base Model - Avg Response Time: {results['base_model']['avg_response_time']:.2f}s")
        print(f"Fine-tuned Model - Avg Response Time: {results['finetuned_model']['avg_response_time']:.2f}s")
        
        # Run qualitative comparison
        evaluator.run_sample_comparison()
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        print("Make sure you have trained the model first using finetune_script.py")

if __name__ == "__main__":
    main()
