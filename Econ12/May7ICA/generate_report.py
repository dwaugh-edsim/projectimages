import csv, html, os

CSV_PATH = r"F:\simroom\May 7 Economics ICA (Responses) - Form Responses 1 (1).csv"
OUT_PATH = os.path.join(os.path.dirname(__file__), "assessment-report.html")

# Read CSV
with open(CSV_PATH, encoding="utf-8") as f:
    raw = f.read()

# The CSV has multi-line fields. Parse properly.
rows = list(csv.reader(raw.splitlines()))
header = rows[0]

# Find question columns (skip Timestamp, Email, Score)
q_labels = [
    "Q1: HST Progressive or Regressive?",
    "Q2: Negative Externality Example",
    "Q3: Market Failure Example",
    "Q4: Monetary Policy & BoC",
    "Q5: CDIC & Bank Operations",
    "Q6: Tragedy of the Commons",
    "Q7: Two Themes Analysis"
]

# Answer keys from study guide
answer_keys = {
    0: "Regressive. HST is a flat sales tax that hurts low-income people more because the same tax is a bigger share of their budget.",
    1: "A side effect imposed on uninvolved third parties. E.g. factory pollution harming nearby residents - the product price doesn't reflect the cleanup cost society pays.",
    2: "When the free market fails to allocate resources efficiently. Examples: tragedy of the commons, externalities, public goods/free rider problem.",
    3: "Monetary policy = BoC management of money supply via the overnight interest rate. Raise rates to cool inflation; lower rates to stimulate growth during recession.",
    4: "(a) CDIC protects deposits up to $100,000 per insured category. (b) Banks use deposits to make loans (fractional reserve banking) - they must keep a liquidity ratio.",
    5: "Tragedy of the Commons. Shared resource with no restrictions; each fisher acts in self-interest taking more, but collectively they deplete the resource.",
    6: "Choose 2 of 4 themes and explain with detail from dossiers: (1) Housing/Cost-of-living, (2) AI Disruption, (3) Systemic Inequality, (4) Economic Traps."
}

max_pts = [3, 3, 3, 4, 4, 4, 4]  # total = 25

# Parse student data - need to handle multi-line CSV properly
with open(CSV_PATH, encoding="utf-8") as f:
    reader = csv.reader(f)
    all_rows = list(reader)

header_row = all_rows[0]
student_rows = all_rows[1:]

def extract_name(email):
    return email.split("@")[0] if "@" in email else email

# Build email->name mapping from new CSV (has name in column index 2)
NAME_CSV = r"F:\simroom\May 7 Economics ICA (Responses) - Form Responses 1 (1).csv"
name_map = {}
with open(NAME_CSV, encoding="utf-8") as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    for row in reader:
        if len(row) > 2 and row[1].strip() and row[2].strip():
            name_map[row[1].strip()] = row[2].strip()

def score_q0(ans):
    """HST regressive? /3"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    if "regressive" in a:
        s += 1; fb.append("Correctly identified as regressive.")
        if "progressive" in a and a.index("progressive") < a.index("regressive"):
            s -= 1; fb = ["Incorrectly said progressive."]
    elif "progressive" in a:
        fb.append("Incorrect - HST is regressive, not progressive.")
    if any(w in a for w in ["same", "flat", "equal", "regardless"]):
        s += 1; fb.append("Noted flat-rate nature.")
    if any(w in a for w in ["low income", "lower income", "poor", "budget", "bigger", "larger percentage", "more of their"]):
        s += 1; fb.append("Explained disproportionate impact on low-income earners.")
    return (min(s, 3), " ".join(fb))

def score_q1(ans):
    """Negative externality /3"""
    a = ans.lower()
    if not a.strip() or a.strip() in [".", "*"]: return (0, "No answer provided.")
    s = 0; fb = []
    if any(w in a for w in ["third party", "uninvolved", "not involved", "side effect", "hidden cost", "not related"]):
        s += 1; fb.append("Identified third-party/uninvolved impact.")
    if any(w in a for w in ["pollut", "chemical", "dump", "oil spill", "deforest", "carbon"]):
        s += 1; fb.append("Gave relevant example.")
    if any(w in a for w in ["cost", "pay", "price", "affect", "harm", "damage", "negative"]):
        s += 1; fb.append("Explained the negative impact.")
    return (min(s, 3), " ".join(fb))

def score_q2(ans):
    """Market failure /3"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    if any(w in a for w in ["market fail", "free market", "invisible hand", "allocat", "efficien", "not work"]):
        s += 1; fb.append("Shows understanding of market failure concept.")
    if any(w in a for w in ["tragedy", "commons", "externali", "public good", "free rider", "stock", "crash", "depression", "monopol", "shortage"]):
        s += 1; fb.append("Provided a relevant example.")
    if len(a) > 80:
        s += 1; fb.append("Provided explanation with some detail.")
    return (min(s, 3), " ".join(fb))

def score_q3(ans):
    """Monetary policy /4"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    if any(w in a for w in ["monetary policy", "money supply", "control"]):
        s += 1; fb.append("Identified monetary policy concept.")
    if any(w in a for w in ["interest rate", "overnight rate", "intrest rate"]):
        s += 1; fb.append("Named interest rates as the tool.")
    if any(w in a for w in ["raise", "increase", "higher"]) and any(w in a for w in ["inflation", "cool", "slow"]):
        s += 1; fb.append("Explained raising rates to combat inflation.")
    if any(w in a for w in ["lower", "decrease", "reduce"]) and any(w in a for w in ["recession", "unemploy", "stimulat", "encourage", "borrow", "grow", "spend"]):
        s += 1; fb.append("Explained lowering rates to stimulate economy.")
    return (min(s, 4), " ".join(fb))

def score_q4(ans):
    """CDIC and bank operations /4"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    if any(w in a for w in ["cdic", "cidc", "canada deposit", "insurance"]):
        s += 1; fb.append("Named CDIC/deposit insurance.")
    if "100" in a or "hundred thousand" in a:
        s += 1; fb.append("Stated $100,000 coverage.")
    if any(w in a for w in ["loan", "lend", "lending"]):
        s += 1; fb.append("Explained bank lending.")
    if any(w in a for w in ["fraction", "reserve", "liquidity", "keep", "hold", "not all", "portion"]):
        s += 1; fb.append("Mentioned fractional reserves/liquidity.")
    return (min(s, 4), " ".join(fb))

def score_q5(ans):
    """Tragedy of the commons /4"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    if any(w in a for w in ["tragedy of the commons", "tragity", "tradgedy", "tradegy", "tragerdy", "tragety"]):
        s += 2; fb.append("Correctly identified Tragedy of the Commons.")
    elif any(w in a for w in ["shared resource", "common", "public", "free rider"]):
        s += 1; fb.append("Partially identified the concept.")
    if any(w in a for w in ["self-interest", "selfish", "greed", "individual", "own interest", "profit"]):
        s += 1; fb.append("Explained individual self-interest motivation.")
    if any(w in a for w in ["deplet", "destroy", "overfish", "no fish", "none left", "run out", "exploit"]):
        s += 1; fb.append("Explained resource depletion outcome.")
    return (min(s, 4), " ".join(fb))

def score_q6(ans):
    """Two themes /4"""
    a = ans.lower()
    if not a.strip() or a.strip() == ".": return (0, "No answer provided.")
    s = 0; fb = []
    themes_found = 0
    if any(w in a for w in ["housing", "cost of living", "cost-of-living", "rent", "afford"]):
        themes_found += 1
    if any(w in a for w in ["ai disruption", "artificial intelligence", "ai is", "ai has", "ai replace", "ai tak"]):
        themes_found += 1
    if any(w in a for w in ["systemic inequal", "rich get richer", "rich-get-richer", "wealth gap", "inequality"]):
        themes_found += 1
    if any(w in a for w in ["economic trap", "side hustle", "burnout", "burn out", "poverty trap", "degree inflation"]):
        themes_found += 1
    if themes_found >= 2:
        s += 1; fb.append("Addressed two themes.")
    elif themes_found == 1:
        s += 0.5; fb.append("Only addressed one theme clearly.")
    # Check for dossier references
    if any(w in a for w in ["jack", "alex", "angelique", "ana", "anna", "reyha", "nahla", "maggie", "sivakami", "john", "peyton", "efe", "adarsha", "josh", "seth", "dyson", "marshall"]):
        s += 1; fb.append("Referenced specific student dossiers.")
    # Depth of explanation
    if len(a) > 400:
        s += 1; fb.append("Good depth of explanation.")
    if len(a) > 700:
        s += 1; fb.append("Comprehensive analysis.")
    return (min(s, 4), " ".join(fb))

scorers = [score_q0, score_q1, score_q2, score_q3, score_q4, score_q5, score_q6]

students = []
for row in student_rows:
    if len(row) < 10:
        continue
    ts = row[0]
    email = row[1]
    answers = row[4:11]  # 7 answers (shifted by 1 due to name column at index 2)
    # Use real name from name_map if available
    real_name = name_map.get(email.strip(), None)
    name = real_name if real_name else extract_name(email)
    scores = []
    feedbacks = []
    for i, ans in enumerate(answers):
        sc, fb = scorers[i](ans)
        scores.append(sc)
        feedbacks.append(fb)
    total = sum(scores)
    students.append({
        "name": name,
        "email": email,
        "timestamp": ts,
        "scores": scores,
        "feedbacks": feedbacks,
        "total": total,
        "answers": answers
    })

# Generate HTML
h = html.escape

html_out = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ECON 12 | May 7 ICA Assessment</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
<style>
:root {{
    --bg: #0f1117;
    --card: #1a1d27;
    --card-border: #2a2d3a;
    --accent: #6c63ff;
    --accent2: #00d4aa;
    --text: #e4e4e7;
    --text-dim: #9ca3af;
    --green: #22c55e;
    --yellow: #eab308;
    --red: #ef4444;
    --blue: #3b82f6;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
    font-family: 'Outfit', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 20px;
}}
.container {{ max-width: 1400px; margin: 0 auto; }}
header {{
    text-align: center;
    padding: 40px 20px;
    margin-bottom: 30px;
    background: linear-gradient(135deg, #1a1d27 0%, #2a1d3a 100%);
    border: 1px solid var(--card-border);
    border-radius: 16px;
}}
h1 {{
    font-size: 2.5rem;
    font-weight: 900;
    letter-spacing: -1px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}}
.subtitle {{
    font-family: 'Courier Prime', monospace;
    color: var(--text-dim);
    margin-top: 8px;
}}
.stats-row {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 30px;
}}
.stat-card {{
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
}}
.stat-card .num {{
    font-size: 2rem;
    font-weight: 900;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}}
.stat-card .label {{ font-size: 0.85rem; color: var(--text-dim); margin-top: 4px; }}
.answer-key {{
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 30px;
}}
.answer-key h2 {{
    font-family: 'Courier Prime', monospace;
    color: var(--accent);
    margin-bottom: 16px;
    font-size: 1.3rem;
}}
.key-item {{
    padding: 10px 0;
    border-bottom: 1px solid var(--card-border);
    display: grid;
    grid-template-columns: 100px 1fr 50px;
    gap: 12px;
    align-items: start;
}}
.key-item:last-child {{ border-bottom: none; }}
.key-item .qlabel {{
    font-family: 'Courier Prime', monospace;
    color: var(--accent2);
    font-weight: 700;
    font-size: 0.9rem;
}}
.key-item .pts {{
    font-family: 'Courier Prime', monospace;
    color: var(--text-dim);
    font-size: 0.85rem;
    text-align: right;
}}
.table-wrap {{
    overflow-x: auto;
    margin-bottom: 30px;
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 12px;
}}
table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}}
th {{
    background: #22253a;
    font-family: 'Courier Prime', monospace;
    font-size: 0.8rem;
    padding: 14px 10px;
    text-align: center;
    border-bottom: 2px solid var(--accent);
    color: var(--accent2);
    position: sticky;
    top: 0;
    white-space: nowrap;
}}
th:first-child {{ text-align: left; padding-left: 16px; }}
td {{
    padding: 12px 10px;
    text-align: center;
    border-bottom: 1px solid var(--card-border);
}}
td:first-child {{ text-align: left; padding-left: 16px; font-weight: 600; }}
tr:hover {{ background: rgba(108,99,255,0.08); }}
.score-pill {{
    display: inline-block;
    padding: 2px 10px;
    border-radius: 20px;
    font-weight: 700;
    font-family: 'Courier Prime', monospace;
    font-size: 0.85rem;
}}
.s-full {{ background: rgba(34,197,94,0.2); color: var(--green); }}
.s-good {{ background: rgba(59,130,246,0.2); color: var(--blue); }}
.s-mid {{ background: rgba(234,179,8,0.2); color: var(--yellow); }}
.s-low {{ background: rgba(239,68,68,0.2); color: var(--red); }}
.total-pill {{
    font-size: 1rem;
    padding: 4px 14px;
}}
.detail-section {{
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    margin-bottom: 20px;
    overflow: hidden;
}}
.detail-header {{
    padding: 16px 20px;
    background: #22253a;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
}}
.detail-header:hover {{ background: #2a2d4a; }}
.detail-header h3 {{ font-size: 1.1rem; }}
.detail-body {{ padding: 20px; display: none; }}
.detail-body.open {{ display: block; }}
.q-feedback {{
    padding: 12px 16px;
    margin-bottom: 10px;
    border-left: 3px solid var(--accent);
    background: rgba(108,99,255,0.05);
    border-radius: 0 8px 8px 0;
}}
.q-feedback .qh {{
    font-family: 'Courier Prime', monospace;
    font-size: 0.85rem;
    color: var(--accent2);
    margin-bottom: 4px;
}}
.q-feedback .fb {{ font-size: 0.9rem; color: var(--text-dim); }}
.note {{
    background: rgba(234,179,8,0.1);
    border: 1px solid rgba(234,179,8,0.3);
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 20px;
    font-size: 0.9rem;
    color: var(--yellow);
}}
</style>
</head>
<body>
<div class="container">
<header>
    <h1>ECON 12 | MAY 7 ICA</h1>
    <p class="subtitle">FIRST-PASS ASSESSMENT REPORT &bull; {len(students)} STUDENTS</p>
</header>

<div class="note">
    &#9888; <strong>First-Pass Assessment:</strong> Scores are based on demonstrated understanding of course concepts from the Study Guide and Thematic Links. Grammar is not evaluated. Students are not expected to memorize exact details but should show overall comprehension.
</div>
"""

# Stats
totals = [s["total"] for s in students]
avg = sum(totals)/len(totals) if totals else 0
mx = max(totals) if totals else 0
mn = min(totals) if totals else 0
passing = sum(1 for t in totals if t >= 12.5)

html_out += f"""
<div class="stats-row">
    <div class="stat-card"><div class="num">{len(students)}</div><div class="label">Students</div></div>
    <div class="stat-card"><div class="num">{avg:.1f}/25</div><div class="label">Class Average</div></div>
    <div class="stat-card"><div class="num">{mx:.0f}/25</div><div class="label">Highest Score</div></div>
    <div class="stat-card"><div class="num">{mn:.0f}/25</div><div class="label">Lowest Score</div></div>
    <div class="stat-card"><div class="num">{passing}/{len(students)}</div><div class="label">Passing (50%+)</div></div>
</div>
"""

# Answer Key
html_out += '<div class="answer-key"><h2>&#128273; ANSWER KEY SUMMARY</h2>\n'
for i in range(7):
    html_out += f'<div class="key-item"><span class="qlabel">{q_labels[i].split(":")[0]}</span><span>{h(answer_keys[i])}</span><span class="pts">/{max_pts[i]}</span></div>\n'
html_out += '</div>\n'

# Score Table
html_out += '<div class="table-wrap"><table><thead><tr>'
html_out += '<th>Student</th>'
for i in range(7):
    html_out += f'<th>{q_labels[i].split(":")[0]}<br><span style="font-size:0.7rem;color:#9ca3af">/{max_pts[i]}</span></th>'
html_out += '<th>TOTAL<br><span style="font-size:0.7rem;color:#9ca3af">/25</span></th></tr></thead><tbody>\n'

for st in sorted(students, key=lambda x: -x["total"]):
    html_out += f'<tr><td>{h(st["name"])}</td>'
    for i, sc in enumerate(st["scores"]):
        ratio = sc / max_pts[i] if max_pts[i] else 0
        cls = "s-full" if ratio >= 0.9 else "s-good" if ratio >= 0.65 else "s-mid" if ratio >= 0.4 else "s-low"
        html_out += f'<td><span class="score-pill {cls}">{sc:.0f}</span></td>'
    ratio_t = st["total"] / 25
    cls_t = "s-full" if ratio_t >= 0.8 else "s-good" if ratio_t >= 0.6 else "s-mid" if ratio_t >= 0.4 else "s-low"
    html_out += f'<td><span class="score-pill total-pill {cls_t}">{st["total"]:.0f}</span></td></tr>\n'

html_out += '</tbody></table></div>\n'

# Detailed feedback per student
html_out += '<h2 style="font-family:Courier Prime,monospace;color:var(--accent);margin-bottom:16px;font-size:1.3rem;">&#128221; DETAILED FEEDBACK</h2>\n'

for st in sorted(students, key=lambda x: -x["total"]):
    ratio_t = st["total"] / 25
    cls_t = "s-full" if ratio_t >= 0.8 else "s-good" if ratio_t >= 0.6 else "s-mid" if ratio_t >= 0.4 else "s-low"
    html_out += f'<div class="detail-section">'
    html_out += f'<div class="detail-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">'
    html_out += f'<h3>{h(st["name"])}</h3>'
    html_out += f'<span class="score-pill total-pill {cls_t}">{st["total"]:.0f}/25</span></div>'
    html_out += f'<div class="detail-body">'
    for i in range(7):
        html_out += f'<div class="q-feedback"><div class="qh">{h(q_labels[i])} &mdash; {st["scores"][i]:.0f}/{max_pts[i]}</div>'
        html_out += f'<div class="fb">{h(st["feedbacks"][i])}</div></div>\n'
    html_out += '</div></div>\n'

html_out += """
</div>
</body>
</html>"""

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(html_out)

print(f"Report generated: {OUT_PATH}")
print(f"Students assessed: {len(students)}")
for st in sorted(students, key=lambda x: -x["total"]):
    print(f"  {st['name']:20s}  {st['total']:5.0f}/25")
