#!/usr/bin/env python3
import urllib.request
import json
import csv
import sys
import os
import argparse

WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwwQekbSK1nU7vHMWoowMb49k-75aPQv5zrcAPbNFXC24Akk4jo2un-IYSDReC-JqQ0EA/exec"
DEFAULT_CSV = "cit9servicelearning-May218amdownload.csv"

def fetch_live_data():
    url = f"{WEBHOOK_URL}?action=GET_ALL_PROGRESS"
    print(f"Connecting to webhook: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print(f"Successfully fetched {len(data)} progress records.")
            return data
    except Exception as e:
        print(f"Error fetching live data: {e}", file=sys.stderr)
        return None

def parse_reflection(ref_str):
    if not ref_str:
        return {}
    try:
        return json.loads(ref_str)
    except Exception:
        return {}

def read_csv_data(filepath):
    print(f"Reading local CSV file: {filepath}")
    records = []
    if not os.path.exists(filepath):
        print(f"CSV file not found: {filepath}", file=sys.stderr)
        return None
    
    try:
        with open(filepath, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append({
                    "StudentId": row.get("StudentId", "").strip(),
                    "MissionTitle": row.get("MissionTitle", "").strip(),
                    "ReflectionJSON": row.get("ReflectionJSON", "").strip(),
                    "Timestamp": row.get("Timestamp", "").strip()
                })
        print(f"Successfully read {len(records)} records from CSV.")
        return records
    except Exception as e:
        print(f"Error reading CSV: {e}", file=sys.stderr)
        return None

def main():
    parser = argparse.ArgumentParser(description="Service Learning LLM Review & Data Pull Utility")
    parser.add_argument("--fetch", action="store_true", help="Fetch latest live records from the Google Sheet webhook")
    parser.add_argument("--csv", type=str, default=DEFAULT_CSV, help="Path to local CSV data fallback (default: cit9servicelearning-May218amdownload.csv)")
    parser.add_argument("--output", type=str, default="live_student_data.json", help="Output file to save the fetched records")
    parser.add_argument("--draft-template", action="store_true", help="Generate a blank reviews_draft.json template with all active student names")
    
    args = parser.parse_args()
    
    records = None
    if args.fetch:
        records = fetch_live_data()
    
    if not records:
        print("Using local CSV data...")
        records = read_csv_data(args.csv)
        
    if not records:
        print("No student records could be retrieved.", file=sys.stderr)
        sys.exit(1)
        
    # Deduplicate and keep latest record per student
    student_latest = {}
    for r in records:
        student_id = r.get("StudentId")
        if not student_id or student_id == "MKS-11-STUDENT":
            continue
        ts = r.get("Timestamp", "")
        # Compare timestamps to keep the latest one
        if student_id not in student_latest or ts > student_latest[student_id].get("Timestamp", ""):
            student_latest[student_id] = r
            
    print(f"Deduplicated to {len(student_latest)} active student records.")
    
    # Save student data list
    processed_records = []
    for sid, r in sorted(student_latest.items()):
        ref = parse_reflection(r.get("ReflectionJSON"))
        processed_records.append({
            "studentId": sid,
            "mission": ref.get("topic") or ref.get("missionSelect") or "",
            "timestamp": r.get("Timestamp"),
            "data": ref
        })
        
    # Write processed records
    try:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(processed_records, f, indent=2, ensure_ascii=False)
        print(f"Saved processed student payloads to: {args.output}")
    except Exception as e:
        print(f"Error saving output: {e}", file=sys.stderr)
        
    # Generate draft reviews template if requested
    if args.draft_template:
        drafts = {}
        for item in processed_records:
            sid = item["studentId"]
            drafts[sid] = {
                "feedback": "",
                "flagged": False,
                "flags": [],
                "quality": "Needs Work" # Excellent, Adequate, Needs Work
            }
        
        draft_file = "reviews_draft.json"
        try:
            with open(draft_file, "w", encoding="utf-8") as f:
                json.dump(drafts, f, indent=2, ensure_ascii=False)
            print(f"Generated blank feedback drafts template: {draft_file}")
        except Exception as e:
            print(f"Error saving draft template: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
