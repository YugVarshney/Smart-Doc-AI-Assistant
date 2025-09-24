import os
BACKEND = os.getenv("LLM_BACKEND", "stub")
KEY = os.getenv("LLM_API_KEY", "")

def call_llm(prompt, max_tokens=512, temp=0.0):
    if BACKEND == "stub":
        return "STUB LLM RESPONSE\n\n" + prompt[:1000]
    elif BACKEND == "openai":
        import openai
        openai.api_key = KEY
        resp = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            max_tokens=max_tokens,
            temperature=temp
        )
        return resp["choices"][0]["message"]["content"]
    else:
        raise NotImplementedError()
