import json
import re
from collections import defaultdict

with open('extracted_submissions.json', encoding='utf-8') as f:
    data = json.load(f)

# Resolve keys
def find_key(d, fragment):
    for k in d:
        if fragment.lower() in k.lower():
            return k
    return None

irssa_key = find_key(data, 'IRSSA')
scoop_key = find_key(data, 'Sixties')
liam_key = find_key(data, 'Liam')

print("IRSSA key:", irssa_key)
print("Scoop key:", scoop_key)
print("Liam key:", liam_key)

def base_name(s):
    return re.sub(r'\s*\(.*?\)', '', s).strip().lower()

# Collect all student keys and group them by block and base name
block_students = defaultdict(lambda: defaultdict(list))

for sim_key in [irssa_key, scoop_key, liam_key]:
    if not sim_key:
        continue
    for block_key, students in data[sim_key].items():
        b = 'A' if 'a block' in block_key.lower() else 'C'
        for s in students.keys():
            if s == "MRWAUGH (XOXO)": # Exclude teacher test account
                continue
            bname = base_name(s)
            if s not in block_students[b][bname]:
                block_students[b][bname].append(s)

for b in sorted(block_students.keys()):
    print(f"\nBlock {b} Students ({len(block_students[b])} unique):")
    for bname in sorted(block_students[b].keys()):
        variants = block_students[b][bname]
        print(f"  {bname}: {variants}")

