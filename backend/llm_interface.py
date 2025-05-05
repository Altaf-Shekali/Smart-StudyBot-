import subprocess

# Change this to "tinyllama", "llama2", or "mistral"
MODEL_NAME = "mistral"  # ⚡ use this for testing. Change to "mistral" for best results

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
