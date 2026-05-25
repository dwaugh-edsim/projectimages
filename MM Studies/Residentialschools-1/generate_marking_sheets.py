import csv
import json
import re
from datetime import datetime
from collections import defaultdict

CSV_PATH = r"E:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Residentialschools-1\Leo - 25 May.csv"
OUTPUT_DIR = r"E:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Residentialschools-1"

BLOCK_A_STUDENTS = [
    "Alexis", "ANANYA M.", "CALLUM", "CONNOR", "COVA", "DAVE", "Dmytro", "ELLEE",
    "Gala", "GAVIN", "HARRISON", "JESSE", "JOSH", "Jon", "Julianne", "Kevin",
    "Lena", "MAE", "MATEO", "Michael", "MRWAUGH", "rose", "Ruby", "Sonja", "Sophie"
]

BLOCK_C_STUDENTS = [
    "Abdel", "Abigail", "AIDEN", "Anthony", "BAASHIQ", "Caitlyn", "Caleb",
    "CHRISTOPHER", "Clara Jones", "DAVE", "HARJAS", "Isaac", "Isabella Beck",
    "Jaiveer", "Julian", "Kaden", "KOEN", "Kulay cruz", "Kyle Parsons", "Kyra",
    "Madina Mirza", "myles", "Noah Pinter", "Raida", "Reiley", "River Thomas",
    "Sam", "Soulin Shehab", "Sukhbir", "Zaid", "ZAYDEN"
]

SLIDE_PROMPTS = {
    "slide_1": "Why was IRSSA 2007 a critical turning point?",
    "slide_2": "Which pillar is most critical for long-term reconciliation? Justify.",
    "slide_3": "Shubenacadie - years operational? Which church?",
    "slide_4": "How would CEP or TRC have impacted Betty Ross?",
    "slide_5": "Most common reason projects stall (Beyond 94 tracker)?",
    "slide_6": "Biggest challenge for reconciliation in your region?",
}

SLIDE_IDS = ["slide_1", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"]

INAPPROPRIATE_PINS = {"ZAYDEN": ["slide_1"], "Anthony": ["slide_6"]}

def parse_timestamp(ts_str):
    ts_str = ts_str.strip().strip('"')
    formats = [
        "%m/%d/%Y, %I:%M:%S %p",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d, %I:%M:%S %p",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            continue
    return datetime.min

def parse_rationales(raw):
    raw = raw.strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    fixed = re.sub(r'(\w+):', r'"\1":', raw)
    try:
        return json.loads(fixed)
    except json.JSONDecodeError:
        return {}

def strip_pin(name):
    return re.sub(r'\s*\([A-Za-z0-9]+\)\s*$', '', name).strip()

def extract_pin(name):
    m = re.search(r'\(([A-Za-z0-9]+)\)', name)
    return m.group(1).upper() if m else ""

def evaluate_slide(slide_id, response, student_name):
    if not response or not response.strip():
        return 0, "No response"

    pin = extract_pin(student_name)
    for bad_name, bad_slides in INAPPROPRIATE_PINS.items():
        if student_name.startswith(bad_name) and slide_id in bad_slides:
            return 1, "FLAGGED: Inappropriate/off-task response"

    text = response.lower()
    length = len(response.strip())

    if slide_id == "slide_1":
        score = 1
        comments = []
        if any(k in text for k in ["recogni", "admit", "acknowledg"]):
            score = max(score, 2)
        if any(k in text for k in ["compensat", "1.9 billion", "$1.9", "payment", "redress"]):
            score = max(score, 2)
        if any(k in text for k in ["survivor", "fight", "decades", "struggle", "healing"]):
            score = max(score, 2)
        if any(k in text for k in ["pillar", "5 pillar", "five pillar"]):
            score = max(score, 3)
        if score >= 2 and length > 80:
            score = max(score, 3)
        if score >= 3 and length > 120 and any(k in text for k in ["government", "canada", "official"]):
            score = 4
        if score <= 2 and length < 40:
            score = max(score, 1)
            comments.append("Brief response")
        return score, "; ".join(comments) if comments else ""

    elif slide_id == "slide_2":
        pillars = ["common experience payment", "cep", "independent assessment", "iap",
                   "truth and reconciliation", "trc", "commemorat", "health and healing"]
        has_pillar = any(p in text for p in pillars)
        if not has_pillar:
            return 1, "No pillar identified"
        score = 2
        comments = []
        if length > 50:
            score = 3
        if length > 100 and any(k in text for k in ["because", "therefore", "since", "justif", "reason", "help", "support", "trauma", "community"]):
            score = 4
        if length < 30:
            score = 2
            comments.append("Weak justification")
        return score, "; ".join(comments) if comments else ""

    elif slide_id == "slide_3":
        comments = []
        has_38 = bool(re.search(r'38\s*year', text))
        has_37 = bool(re.search(r'37\s*year', text))
        has_36 = bool(re.search(r'36\s*year', text))
        has_47 = bool(re.search(r'47\s*year', text))
        has_1929_1967 = bool(re.search(r'1929.*1967', text))
        has_catholic = bool(re.search(r'roman\s*catholic|catholic\s*church', text))
        has_anglican = "anglican" in text
        has_st_anne = "st. anne" in text or "st anne" in text or "saint anne" in text

        if has_38 or has_1929_1967:
            score = 3
        elif has_37 or has_36:
            score = 2
            if has_36:
                comments.append("Incorrect: 36 years (correct: 38)")
            else:
                comments.append("Incorrect: 37 years (correct: 38)")
        elif has_47:
            score = 1
            comments.append("Incorrect: 47 years (correct: 38)")
        else:
            score = 1
            comments.append("Years not identified or incorrect")

        if has_catholic:
            score = max(score, 3) if (has_38 or has_1929_1967) else max(score, 2)
        elif has_anglican:
            score = max(score - 1, 1)
            comments.append("Wrong church (Anglican vs Roman Catholic)")
        elif has_st_anne:
            score = max(score - 1, 1)
            comments.append("Wrong church (St. Anne's Convent vs Roman Catholic)")
        else:
            if not has_catholic:
                comments.append("Church not identified or incorrect (correct: Roman Catholic)")
                score = max(score - 1, 1)

        if has_38 and has_catholic:
            score = 4
        if not comments and score == 4:
            pass
        return score, "; ".join(comments) if comments else ""

    elif slide_id == "slide_4":
        score = 1
        comments = []
        has_cep = any(k in text for k in ["cep", "common experience payment", "financial", "payment", "compensation", "money"])
        has_trc = any(k in text for k in ["trc", "truth and reconciliation", "truth-telling", "share story", "testif", "voice"])
        has_betty = any(k in text for k in ["betty", "she", "her", "survivor"])

        if has_cep and has_trc:
            score = 3
        elif has_cep or has_trc:
            score = 2
        if (has_cep or has_trc) and length > 80:
            score = max(score, 3)
        if (has_cep and has_trc) and length > 100 and any(k in text for k in ["sugar falls", "kokum", "abuse", "experience", "story", "platform"]):
            score = 4
        if not has_cep and not has_trc:
            comments.append("No connection to CEP or TRC")
        return score, "; ".join(comments) if comments else ""

    elif slide_id == "slide_5":
        score = 1
        comments = []
        has_funding = any(k in text for k in ["fund", "money", "financial", "budget"])
        has_govt = any(k in text for k in ["government", "govt", "federal", "policy"])
        has_follow = any(k in text for k in ["follow", "follow-through", "follow through", "implementation", "action"])
        has_coord = any(k in text for k in ["coordination", "cooperation", "collaborat"])

        if has_funding or has_govt or has_follow:
            score = 2
        if (has_funding and has_follow) or (has_govt and has_follow):
            score = 3
        if (has_funding and has_govt and has_follow) or length > 100:
            score = 4
        if length < 30:
            score = max(score, 1)
            comments.append("Very brief response")
        return score, "; ".join(comments) if comments else ""

    elif slide_id == "slide_6":
        score = 1
        comments = []
        has_economic = any(k in text for k in ["economic", "economy", "money", "funding", "resource"])
        has_treaty = any(k in text for k in ["treaty", "treaty right", "1752", "leo francis", "leo"])
        has_action = any(k in text for k in ["action", "follow through", "follow-through", "implement", "promise", "turn"])
        has_reconciliation = any(k in text for k in ["reconciliation", "reconcile", "healing"])

        if has_economic or has_treaty or has_action:
            score = 2
        if (has_economic and has_action) or (has_treaty and has_action):
            score = 3
        if (has_economic and has_treaty and has_action) or length > 120:
            score = 4
        if length < 30:
            score = max(score, 1)
            comments.append("Very brief response")
        return score, "; ".join(comments) if comments else ""

    return 1, "Unable to evaluate"

def parse_csv():
    students_data = defaultdict(lambda: defaultdict(lambda: {"timestamp": datetime.min, "response": ""}))

    with open(CSV_PATH, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            ts = parse_timestamp(row.get('timestamp', ''))
            block_raw = row.get('block', '').strip()
            student_raw = row.get('student', '').strip()
            rationales_raw = row.get('rationales', '')

            if not student_raw:
                continue

            block = "A" if "A Block" in block_raw else "C" if "C Block" in block_raw else None
            if not block:
                continue

            student_name = strip_pin(student_raw)
            rationales = parse_rationales(rationales_raw)

            for slide_id in SLIDE_IDS:
                if slide_id in rationales and rationales[slide_id].strip():
                    existing_ts = students_data[student_name][slide_id]["timestamp"]
                    if ts >= existing_ts:
                        students_data[student_name][slide_id] = {
                            "timestamp": ts,
                            "response": rationales[slide_id]
                        }

    return students_data

def get_score_color(score):
    colors = {
        0: "#ff4444",
        1: "#ff8c00",
        2: "#ffd700",
        3: "#2ecc71",
        4: "#1a7a42",
    }
    return colors.get(score, "#000")

def generate_html(block_name, student_list, students_data):
    block_label = "A" if "A" in block_name else "C"
    rows_html = []

    all_scores = {slide_id: [] for slide_id in SLIDE_IDS}

    for student_name in student_list:
        scores = []
        for slide_id in SLIDE_IDS:
            data = students_data.get(student_name, {}).get(slide_id, {"response": ""})
            response = data.get("response", "")
            score, comment = evaluate_slide(slide_id, response, student_name)
            all_scores[slide_id].append(score)
            scores.append((score, comment, response))

        color = get_score_color
        cells = ""
        for i, (score, comment, response) in enumerate(scores):
            slide_id = SLIDE_IDS[i]
            score_display = str(score)
            comment_display = f"<br><em style='font-size:0.8em;color:#666;'>{comment}</em>" if comment else ""
            preview = ""
            if response and len(response) > 60:
                preview = f"<br><span style='font-size:0.75em;color:#888;'>{response[:60]}...</span>"
            cells += f"""<td style='border:1px solid #ccc;padding:8px;text-align:center;background-color:{color(score)}22;'>
                <strong style='color:{color(score)};font-size:1.2em;'>{score_display}</strong>
                {comment_display}
                {preview}
            </td>"""

        rows_html.append(f"""<tr>
            <td style='border:1px solid #ccc;padding:8px;font-weight:bold;'>{student_name}</td>
            {cells}
        </tr>""")

    averages = []
    for slide_id in SLIDE_IDS:
        scores_list = all_scores[slide_id]
        avg = sum(scores_list) / len(scores_list) if scores_list else 0
        averages.append(f"{avg:.2f}")

    avg_cells = "".join([f"<td style='border:1px solid #ccc;padding:8px;text-align:center;font-weight:bold;background:#f0f0f0;'>{a}</td>" for a in averages])

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Block {block_label} Marking Sheet</title>
<style>
    body {{ font-family: Arial, sans-serif; margin: 20px; }}
    h1 {{ text-align: center; margin-bottom: 5px; }}
    .subtitle {{ text-align: center; color: #666; margin-bottom: 20px; font-size: 0.9em; }}
    table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
    th {{ background: #333; color: #fff; padding: 10px 8px; font-size: 0.85em; text-align: center; border: 1px solid #333; }}
    th:first-child {{ text-align: left; min-width: 120px; }}
    td {{ font-size: 0.85em; }}
    .legend {{ display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; font-size: 0.85em; }}
    .legend-item {{ display: flex; align-items: center; gap: 5px; }}
    .legend-color {{ width: 16px; height: 16px; border-radius: 3px; border: 1px solid #999; }}
    @media print {{
        body {{ margin: 0; }}
        table {{ page-break-inside: avoid; }}
        th {{ background: #333 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        td {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
    }}
</style>
</head>
<body>
<h1>IRSSA Assignment - Block {block_label} Marking Sheet</h1>
<p class="subtitle">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}</p>

<div class="legend">
    <div class="legend-item"><div class="legend-color" style="background:#ff4444;"></div> 0 = Not Submitted</div>
    <div class="legend-item"><div class="legend-color" style="background:#ff8c00;"></div> 1 = Needs Improvement</div>
    <div class="legend-item"><div class="legend-color" style="background:#ffd700;"></div> 2 = Satisfactory</div>
    <div class="legend-item"><div class="legend-color" style="background:#2ecc71;"></div> 3 = Good</div>
    <div class="legend-item"><div class="legend-color" style="background:#1a7a42;"></div> 4 = Excellent</div>
</div>

<table>
<thead>
<tr>
    <th>Student Name</th>
    <th>Slide 1<br><span style="font-weight:normal;font-size:0.85em;">Why IRSSA 2007 critical?</span></th>
    <th>Slide 2<br><span style="font-weight:normal;font-size:0.85em;">Most critical pillar?</span></th>
    <th>Slide 3<br><span style="font-weight:normal;font-size:0.85em;">Shubenacadie facts</span></th>
    <th>Slide 4<br><span style="font-weight:normal;font-size:0.85em;">CEP/TRC & Betty Ross</span></th>
    <th>Slide 5<br><span style="font-weight:normal;font-size:0.85em;">Why projects stall?</span></th>
    <th>Slide 6<br><span style="font-weight:normal;font-size:0.85em;">Reconciliation challenge?</span></th>
</tr>
</thead>
<tbody>
{"".join(rows_html)}
<tr style="background:#f8f8f8;">
    <td style='border:1px solid #ccc;padding:8px;font-weight:bold;'>Class Average</td>
    {avg_cells}
</tr>
</tbody>
</table>
</body>
</html>"""

    return html

def main():
    students_data = parse_csv()

    block_a_html = generate_html("Block A", BLOCK_A_STUDENTS, students_data)
    block_c_html = generate_html("Block C", BLOCK_C_STUDENTS, students_data)

    output_a = f"{OUTPUT_DIR}\\BlockA_MarkingSheet.html"
    output_c = f"{OUTPUT_DIR}\\BlockC_MarkingSheet.html"

    with open(output_a, 'w', encoding='utf-8') as f:
        f.write(block_a_html)

    with open(output_c, 'w', encoding='utf-8') as f:
        f.write(block_c_html)

    print(f"Generated: {output_a}")
    print(f"Generated: {output_c}")

if __name__ == "__main__":
    main()
