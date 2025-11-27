import json, os
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

def main():
    base_model = os.environ.get("BASE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
    dataset_path = os.environ.get("DATASET_PATH", "data/alpaca_study_assistant.sample.json")
    output_dir = os.environ.get("OUTPUT_DIR", "outputs/mistral-lora")
    lr = float(os.environ.get("LR", "1e-5"))
    bsz = int(os.environ.get("BATCH", "2"))
    epochs = int(os.environ.get("EPOCHS", "3"))
    max_len = int(os.environ.get("MAXLEN", "1024"))

    tokenizer = AutoTokenizer.from_pretrained(base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        load_in_8bit=True,
        device_map="auto"
    )
    model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05,
        bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj","k_proj","v_proj","o_proj"]
    )

    def format_alpaca(example):
        instruction = example["instruction"]
        inp = example.get("input", "")
        prompt = f"Instruction: {instruction}\n" + (f"Input: {inp}\n" if inp else "") + "Response:"
        return {"text": f"{prompt} {example['output']}"}

    dataset = load_dataset("json", data_files=dataset_path, split="train").map(
        format_alpaca, remove_columns=["instruction","input","output"]
    )

    training_args = TrainingArguments(
        output_dir=output_dir,
        per_device_train_batch_size=bsz,
        gradient_accumulation_steps=8,
        num_train_epochs=epochs,
        learning_rate=lr,
        logging_steps=10,
        save_steps=500,
        save_total_limit=2,
        bf16=True,
        lr_scheduler_type="cosine",
        warmup_ratio=0.03,
        optim="paged_adamw_8bit"
    )

    trainer = SFTTrainer(
        model=get_peft_model(model, peft_config),
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=max_len,
        args=training_args,
        packing=True
    )

    trainer.train()
    os.makedirs(os.path.join(output_dir, "lora"), exist_ok=True)
    trainer.model.save_pretrained(os.path.join(output_dir, "lora"))
    tokenizer.save_pretrained(os.path.join(output_dir, "lora"))

if __name__ == "__main__":
    main()

