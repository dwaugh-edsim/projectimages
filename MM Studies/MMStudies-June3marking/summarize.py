"""Summarize completion for all simulations."""
import json

with open('extracted_submissions.json', encoding='utf-8') as f:
    data = json.load(f)

LIAM_KEYS = ['ans-q1-risk','ans-q2-trc','ans-q3-marshall','ans-q4-gladue',
             'ans-q5-circle','ans-q6-comparison','ans-q7-recidivism',
             'ans-q8-relations','ans-q9-maya','ans-q10-leo']
SLIDE_KEYS = ['slide_1','slide_2','slide_3','slide_4','slide_5','slide_6']

for sim_name, blocks in data.items():
    print(f"\n{'='*60}")
    print(f"SIMULATION: {sim_name}")
    print(f"{'='*60}")
    for block, students in blocks.items():
        print(f"\n  BLOCK: {block}")
        if 'Liam' in sim_name or 'Restorative' in sim_name:
            keys = LIAM_KEYS
        else:
            keys = SLIDE_KEYS
        for student, info in students.items():
            r = info['rationales']
            answered = sum(1 for k in keys if str(r.get(k,'')).strip())
            print(f"    {student}: {answered}/{len(keys)} answered")
