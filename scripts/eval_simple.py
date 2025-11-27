import json, time
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

def main():
    eval_path = "data/alpaca_study_assistant.sample.json"  # replace with dedicated eval later
    model_dir = "outputs/mistral-fused"  # or base model name for baseline

    with open(eval_path) as f:
        evalset = json.load(f)[:50]

    tok = AutoTokenizer.from_pretrained(model_dir, use_fast=True)
    mdl = AutoModelForCausalLM.from_pretrained(model_dir, device_map="auto")
    gen = pipeline("text-generation", model=mdl, tokenizer=tok, max_new_tokens=256)

    def check_format(s: str):
        return s.count("Answer:")>0 and s.count("Explanation:")>0

    good, total = 0, 0
    t0 = time.time()
    for ex in evalset:
        prompt = f"Instruction: {ex['instruction']}\nResponse:"
        out = gen(prompt, do_sample=False)[0]["generated_text"]
        total += 1
        if check_format(out):
            good += 1
    print("Format adherence:", f"{good}/{total}", f"({good/total:.2%})")
    print("Avg latency:", (time.time()-t0)/max(total,1), "s")

if __name__ == "__main__":
    main()

