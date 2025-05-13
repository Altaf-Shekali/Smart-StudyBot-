import subprocess

# Change this to "gemma:2b", "phi", "tinyllama", "llama2", or "mistral"
MODEL_NAME = "phi"  # ✅ Use Google's Gemma 2B for balanced performance and speed

def run_llm_ollama(prompt):
    try:
        result = subprocess.run(
            ["ollama", "run", MODEL_NAME],
            input=prompt.encode(),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60
        )
        return result.stdout.decode().strip()
    except subprocess.TimeoutExpired:
        return "❌ LLM timed out. Try simplifying your question or using a smaller model."
    except Exception as e:
        return f"❌ Error running LLM: {e}"
