import json, re

with open('extracted_submissions.json', encoding='utf-8') as f:
    data = json.load(f)

def base_name(s):
    return re.sub(r'\s*\(.*?\)', '', s).strip().lower()

print("=== Checking for duplicate base names ===\n")
any_found = False
for sim, blocks in data.items():
    for block, students in blocks.items():
        names = list(students.keys())
        seen = {}
        for n in names:
            b = base_name(n)
            seen.setdefault(b, []).append(n)
        dups = {k: v for k, v in seen.items() if len(v) > 1}
        if dups:
            any_found = True
            print(f'{sim[:45]} / {block}:')
            for b, variants in dups.items():
                answers = []
                for v in variants:
                    r = students[v]['rationales']
                    answered = sum(1 for val in r.values() if isinstance(val, str) and val.strip())
                    answers.append(f'{v} ({answered} answered)')
                print(f'  "{b}": {", ".join(answers)}')
            print()

if not any_found:
    print("No duplicates found.")
