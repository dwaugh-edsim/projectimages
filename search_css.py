import os

for root, dirs, files in os.walk("z:\\simroom\\Github Repos\\projectimages\\Risk\\css"):
    for file in files:
        path = os.path.join(root, file)
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        if "army-badge" in content:
            print(f"Found in {file}:")
            lines = content.splitlines()
            for i, line in enumerate(lines):
                if "army-badge" in line:
                    print(f"  {i+1}: {line}")
