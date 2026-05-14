import os
import base64
import requests
import time
import re
from PIL import Image

API_KEY = "YOUR_OPENROUTER_API_KEY"
BASE_DIR = r"F:\simroom\MM_Studies\Sf-ch1a"
MODEL = "bytedance-seed/seedream-4.5"

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def log(msg):
    print(msg)
    with open("colorization_log.txt", "a") as f:
        f.write(f"{time.ctime()}: {msg}\n")

def colorize_test(page_num):
    filename = f"12. a Sugar Falls_page-{page_num:04d}.jpg"
    input_path = os.path.join(BASE_DIR, filename)
    output_path = os.path.join(BASE_DIR, filename.replace(".jpg", "_pure_ai.jpg"))
    
    log(f"Starting Pure AI Colorization Test for Page {page_num}...")
    
    try:
        image_data = encode_image(input_path)
        image_url = f"data:image/jpeg;base64,{image_data}"

        payload = {
            "model": MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Colorize"},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }
            ],
            "modalities": ["image"]
        }

        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=90)
        
        if response.status_code == 200:
            res_data = response.json()
            msg = res_data['choices'][0]['message']
            
            img_data_url = None
            if 'images' in msg and len(msg['images']) > 0:
                img_data_url = msg['images'][0]['image_url']['url']
            elif msg.get('content') and msg['content'].startswith('data:image'):
                img_data_url = msg['content']

            if img_data_url:
                header, encoded = img_data_url.split(",", 1)
                img_bytes = base64.b64decode(encoded)
                
                # Temporary save to read with PIL
                temp_path = output_path + ".tmp.jpg"
                with open(temp_path, "wb") as f:
                    f.write(img_bytes)
                
                # Resize back to original
                orig = Image.open(input_path)
                ai_img = Image.open(temp_path)
                log(f"Resizing AI result from {ai_img.size} back to {orig.size}...")
                fixed_img = ai_img.resize(orig.size, Image.Resampling.LANCZOS)
                fixed_img.save(output_path, "JPEG", quality=95)
                
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
                log(f"SUCCESS: Saved aspect-corrected AI version to {output_path}")
            else:
                log(f"FAILED: No image in response. Data: {res_data}")
        else:
            log(f"FAILED: Error {response.status_code}: {response.text}")
            
    except Exception as e:
        log(f"ERROR: {str(e)}")

if __name__ == "__main__":
    colorize_test(20)
