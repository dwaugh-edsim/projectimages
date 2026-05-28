"""
Batch image generator for graphic novel panels.
Supports Qwen/DashScope (primary) and OpenRouter/Flux-schnell (fallback).
Reads prompts from: C:\\Users\\dwaug\\.gemini\\antigravity-ide\\brain\\28143d8d-d1b3-44d6-adde-15de0a6af81b\\qwen_image_prompts.md
Saves images to: E:\\Antigravity\\simroom\\Github Repos\\projectimages\\MM Studies\\Justice\\panels\\
"""
import os
import re
import sys
import requests
import base64
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────────
PROMPTS_FILE = r"C:\Users\dwaug\.gemini\antigravity-ide\brain\28143d8d-d1b3-44d6-adde-15de0a6af81b\qwen_image_prompts.md"
OUTPUT_DIR  = r"E:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Justice\panels"

# API keys — set env vars or edit below
DASHSCOPE_KEY = os.environ.get("DASHSCOPE_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# ── Provider: DashScope / Qwen ────────────────────────────────────────────────
DASHSCOPE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image"

def generate_dashscope(prompt, out_path):
    """Uses DashScope / Wanx image generation API."""
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "wanx-style",          # Change to your available model
        "input": {"prompt": prompt},
        "parameters": {
            "size": "1024x1024",
            "steps": 25,
            "prompt_extend": True,
        }
    }
    resp = requests.post(DASHSCOPE_URL, headers=headers, json=payload, timeout=120)
    data = resp.json()
    print(f"  DashScope raw response: {str(data)[:300]}")
    # Extract image URL or base64
    if "output" in data and "image_url" in data["output"]:
        img_url = data["output"]["image_url"]
        img_data = requests.get(img_url).content
    elif "output" in data and "image_base64" in data["output"]:
        img_data = base64.b64decode(data["output"]["image_base64"])
    else:
        raise Exception(f"No image in DashScope response: {str(data)[:500]}")
    with open(out_path, "wb") as f:
        f.write(img_data)

# ── Provider: OpenRouter / Flux ───────────────────────────────────────────────
OR_URL = "https://openrouter.ai/api/v1/chat/completions"

def generate_openrouter(prompt, out_path):
    """Uses OpenRouter with Flux Schnell (free tier)."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "black-forest-labs/flux-schnell",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
    }
    resp = requests.post(OR_URL, headers=headers, json=payload, timeout=120)
    data = resp.json()
    if "error" in data:
        raise Exception(f"OpenRouter error: {data['error']}")
    content = (data.get("choices", [{}])[0].get("message", {}).get("content", "")
    print(f"  OpenRouter content (first 300): {content[:300]}")

    # Try to find image URL or base64 in response
    import json as json_mod
    # Remove markdown fences if present
    content_clean = re.sub(r"```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE).strip()
    try:
        parsed = json_mod.loads(content_clean)
    except Exception:
        parsed = {}

    # Look for various image formats
    img_data = None

    # 1. New OpenRouter format: { images: [{url: "..."}] }
    imgs = parsed.get("images", [])
    if imgs and isinstance(imgs, list):
        img_entry = imgs[0]
        if isinstance(img_entry, dict) and img_entry.get("url"):
            img_data = requests.get(img_entry["url"]).content
        elif isinstance(img_entry, str) and img_entry.startswith("http"):
            img_data = requests.get(img_entry).content

    # 2. Base64 inline
    if not img_data:
        b64_match = re.search(r"data:image/[a-z]+;base64,([A-Za-z0-9+/=]+)", content)
        if b64_match:
            img_data = base64.b64decode(b64_match.group(1))

    # 3. URL only
    if not img_data:
        url_match = re.search(r"https?://[^\s\"'\)]+\.(?:png|jpg|jpeg|webp)", content, re.IGNORECASE)
        if url_match:
            img_data = requests.get(url_match.group()).content

    if not img_data:
        raise Exception(f"No image found in response. Content preview: {content[:500]}")

    with open(out_path, "wb") as f:
        f.write(img_data)

# ── Parse prompts file ────────────────────────────────────────────────────────
def parse_prompts_file(filepath):
    """Returns list of (filename, prompt) tuples from the markdown file."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    entries = []
    current_file = None
    current_prompt_lines = []

    for line in content.splitlines():
        m = re.match(r'^###?\s*→\s*Save as:\s*`([^`]+\.png)`', line)
        if m:
            if current_file and current_prompt_lines:
                entries.append((current_file, " ".join(current_prompt_lines).strip()))
            current_file = m.group(1)
            current_prompt_lines = []
        elif current_file:
            stripped = line.strip()
            if stripped:
                current_prompt_lines.append(stripped)

    if current_file and current_prompt_lines:
        entries.append((current_file, " ".join(current_prompt_lines).strip()))

    return entries

# ── Main ────────────────────────────────────────────────────────────────────────
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Pick provider
    if DASHSCOPE_KEY:
        provider = "dashscope"
        print("Using provider: DASHSCOPE (Qwen/Wanx)")
    elif OPENROUTER_KEY:
        provider = "openrouter"
        print("Using provider: OPENROUTER (Flux Schnell)")
    else:
        print("ERROR: Set DASHSCOPE_API_KEY or OPENROUTER_API_KEY env var.")
        print("  PowerShell: $env:DASHSCOPE_API_KEY = 'your-key'")
        sys.exit(1)

    entries = parse_prompts_file(PROMPTS_FILE)
    print(f"Found {len(entries)} image entries")

    generated = 0
    failed = []

    for filename, prompt in entries:
        out_path = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(out_path):
            print(f"  [SKIP] {filename} already exists")
            continue

        print(f"\nGenerating: {filename}")
        try:
            if provider == "dashscope":
                generate_dashscope(prompt, out_path)
            else:
                generate_openrouter(prompt, out_path)
            print(f"  [OK] Saved → {out_path}")
            generated += 1
        except Exception as e:
            print(f"  [FAIL] {e}")
            failed.append((filename, str(e)))

    print(f"\n{'='*60}")
    print(f"Done: {generated} generated, {len(failed)} failed")
    if failed:
        print("Failed:")
        for fn, err in failed:
            print(f"  {fn}: {err[:100]}")

if __name__ == "__main__":
    main()
