import csv
import json
import sys
import os
from collections import defaultdict

def analyze_telemetry(csv_path):
    if not os.path.exists(csv_path):
        print(f"Error: File not found at {csv_path}")
        return

    print(f"Analyzing telemetry in: {csv_path}")
    print("=" * 80)

    # Group by student (getting their latest submission)
    latest_submissions = {}

    with open(csv_path, mode='r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for row in reader:
            student = row['student']
            simulation = row['simulation']
            timestamp = row['timestamp']
            
            # Key by student and simulation to get latest save for each
            key = (student, simulation)
            latest_submissions[key] = row

    flagged_count = 0
    total_audited = 0

    print(f"{'STUDENT':<25} | {'SIMULATION':<25} | {'STATUS':<15} | {'RISK LEVEL'}")
    print("-" * 80)

    for (student, simulation), row in sorted(latest_submissions.items()):
        try:
            rationales = json.loads(row['rationales'])
        except Exception:
            continue
        
        telemetry = rationales.get('_telemetry', {})
        
        # If no telemetry is found, we skip or report it's missing (pre-telemetry entries)
        if not telemetry:
            continue
            
        total_audited += 1
        
        # Risk assessment variables
        slide_reports = []
        high_risk_flag = False
        medium_risk_flag = False
        reasons = []

        total_keystrokes = 0
        total_duration = 0
        pasted_slides = []

        for slide_id, metrics in telemetry.items():
            # Get text length of answer in this slide
            slide_ans = rationales.get(slide_id, "")
            text_len = 0
            if isinstance(slide_ans, str):
                text_len = len(slide_ans)
            elif isinstance(slide_ans, dict):
                # Sometimes answers are dictionaries (e.g. part_0, part_1, etc.)
                text_len = sum(len(str(v)) for v in slide_ans.values())
            
            pasted = metrics.get('pasted', False)
            keystrokes = metrics.get('keystrokes', 0)
            duration = metrics.get('duration_sec', 0)

            total_keystrokes += keystrokes
            total_duration += duration
            if pasted:
                pasted_slides.append(slide_id)

            # Check for suspicious typing behavior
            # High text length but very low keystrokes
            if text_len > 100 and keystrokes < (text_len * 0.1):
                high_risk_flag = True
                reasons.append(f"Low keystroke ratio on {slide_id} ({keystrokes} keys vs {text_len} chars)")
            
            if pasted and text_len > 150:
                high_risk_flag = True
                reasons.append(f"Paste detected on long text slide {slide_id} ({text_len} chars)")

        risk_level = "CLEAN"
        if high_risk_flag:
            risk_level = "🔴 HIGH RISK"
            flagged_count += 1
        elif medium_risk_flag or pasted_slides:
            risk_level = "🟡 MEDIUM RISK"
            flagged_count += 1
            
        print(f"{student:<25} | {simulation[:25]:<25} | {row['status']:<15} | {risk_level}")
        if reasons:
            for reason in reasons:
                print(f"   ↳ {reason}")
            print(f"   ↳ Total Keystrokes: {total_keystrokes} | Total Duration: {total_duration}s | Pasted Slides: {pasted_slides}")
            print("-" * 80)

    print("\nAudit Complete.")
    print(f"Audited {total_audited} submissions with telemetry data.")
    print(f"Flagged {flagged_count} submissions as suspicious/risk.")

if __name__ == "__main__":
    csv_file = r"e:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Maya-Paul\offlinedownloads\download5-27-8am.csv"
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    
    analyze_telemetry(csv_file)
