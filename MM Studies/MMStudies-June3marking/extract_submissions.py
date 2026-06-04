"""
Extract latest submissions per student per simulation from the GAS CSV.
- Deduplicates by base name: (ABCD) PIN = placeholder, merged with real-PIN entry.
- Outputs a JSON file with the best merged response per student.
"""
import csv
import json
import re
from collections import defaultdict

CSV_FILE = "Leo - Sheet1 (2).csv"
OUTPUT_FILE = "extracted_submissions.json"

STATUS_PRIORITY = {"FINAL_SUBMIT": 2, "MANUAL_RESTORE": 1, "INCREMENTAL_SAVE": 0}

def parse_rationales(raw):
    try:
        return json.loads(raw)
    except Exception:
        return {}

def base_name(student_str):
    """Extract the name part before any parenthesized code, lowercased."""
    return re.sub(r'\s*\(.*?\)', '', student_str).strip().lower()

def is_placeholder_pin(student_str):
    """Returns True if the student used the placeholder (ABCD) PIN."""
    return bool(re.search(r'\(ABCD\)', student_str, re.IGNORECASE))

from datetime import datetime

def parse_timestamp(ts_str):
    if not ts_str:
        return datetime.min
    ts_str = ts_str.strip()
    formats = [
        "%m/%d/%Y, %I:%M:%S %p",
        "%m/%d/%Y, %H:%M:%S",
        "%d.%m.%Y, %H:%M:%S",
        "%d.%m.%Y %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            pass
    # Try cleaning dots to slashes as fallback
    cleaned = ts_str.replace('.', '/')
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            pass
    return datetime.min

# ---- Read CSV ----
# simulations[sim_name][block][student_key] = {timestamp, status, rationales}
simulations = defaultdict(lambda: defaultdict(lambda: defaultdict(dict)))

with open(CSV_FILE, encoding="utf-8", newline="") as f:
    reader = csv.DictReader(f)
    for row in reader:
        sim = row.get("simulation", "").strip()
        block = row.get("block", "").strip()
        student = row.get("student", "").strip()
        status = row.get("status", "").strip()
        ts = row.get("timestamp", "").strip()
        rationales_raw = row.get("rationales", "").strip()

        if not sim or not student:
            continue

        rationales = parse_rationales(rationales_raw)
        existing = simulations[sim][block][student]

        existing_priority = STATUS_PRIORITY.get(existing.get("status", ""), -1)
        new_priority = STATUS_PRIORITY.get(status, -1)

        existing_ts = parse_timestamp(existing.get("timestamp", ""))
        new_ts = parse_timestamp(ts)

        if new_priority > existing_priority:
            simulations[sim][block][student] = {"timestamp": ts, "status": status, "rationales": rationales}
        elif new_priority == existing_priority and new_ts > existing_ts:
            simulations[sim][block][student] = {"timestamp": ts, "status": status, "rationales": rationales}


# ---- Merge ABCD placeholder entries with real-PIN entries ----
output = {}
merge_log = []

for sim, blocks in simulations.items():
    output[sim] = {}
    for block, students in blocks.items():
        # Group by base name
        by_base = defaultdict(list)
        for student_key, info in students.items():
            by_base[base_name(student_key)].append((student_key, info))

        merged_block = {}
        for bname, variants in by_base.items():
            if len(variants) == 1:
                # No duplicate — use as-is
                student_key, info = variants[0]
                merged_block[student_key] = info
            else:
                # Multiple variants for same base name.
                # Prefer real-PIN entry as primary; fill gaps with ABCD entries.
                real_pins = [(k, i) for k, i in variants if not is_placeholder_pin(k)]
                abcd_pins = [(k, i) for k, i in variants if is_placeholder_pin(k)]

                if real_pins:
                    # Use the real-PIN entry with most answers as primary
                    real_pins.sort(key=lambda x: sum(1 for v in x[1]['rationales'].values()
                                                       if isinstance(v, str) and v.strip()), reverse=True)
                    primary_key, primary_info = real_pins[0]
                    merged_rationales = dict(primary_info['rationales'])

                    # Fill any empty fields from ABCD entries (and other real-PIN entries)
                    all_others = [i for _, i in abcd_pins] + [i for _, i in real_pins[1:]]
                    for other_info in all_others:
                        for k, v in other_info['rationales'].items():
                            if isinstance(v, str) and v.strip() and not merged_rationales.get(k, "").strip():
                                merged_rationales[k] = v

                    merged_block[primary_key] = {
                        "timestamp": primary_info["timestamp"],
                        "status": primary_info["status"],
                        "rationales": merged_rationales
                    }
                    abcd_names = [k for k, _ in abcd_pins]
                    if abcd_names:
                        merge_log.append(f"  Merged {abcd_names} → {primary_key} [{sim[:30]} / {block}]")
                else:
                    # All variants are ABCD — just pick the one with most answers
                    abcd_pins.sort(key=lambda x: sum(1 for v in x[1]['rationales'].values()
                                                      if isinstance(v, str) and v.strip()), reverse=True)
                    student_key, info = abcd_pins[0]
                    merged_rationales = dict(info['rationales'])
                    for _, other_info in abcd_pins[1:]:
                        for k, v in other_info['rationales'].items():
                            if isinstance(v, str) and v.strip() and not merged_rationales.get(k, "").strip():
                                merged_rationales[k] = v
                    merged_block[student_key] = {
                        "timestamp": info["timestamp"],
                        "status": info["status"],
                        "rationales": merged_rationales
                    }
                    merge_log.append(f"  All-ABCD kept best: {student_key} [{sim[:30]} / {block}]")

        output[sim][block] = merged_block

# ---- Write output ----
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print("Done. Written to", OUTPUT_FILE)
if merge_log:
    print("\n=== Merges performed ===")
    for entry in merge_log:
        print(entry)

print()
for sim in output:
    print(f"\n=== {sim} ===")
    for block in output[sim]:
        students = list(output[sim][block].keys())
        print(f"  {block}: {len(students)} students -> {', '.join(students)}")
