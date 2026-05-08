import csv
import os
import html

# Paths
CSV_PATH = r"F:\simroom\May 7 Economics ICA (Responses) - Form Responses 1 (1).csv"
OUTPUT_PATH = r"F:\simroom\Github Repos\projectimages\Econ12\May7ICAQwen\final-moderated-report.html"

def score_q1(ans):
    """HST /3. Prompt: Progressive or regressive? why?"""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if "regressive" in ans:
        score += 2
    elif "progressive" in ans:
        deductions.append("Incorrectly identified as progressive.")
        return 1, " ".join(deductions)
    else:
        deductions.append("Did not specify progressive or regressive.")
    if any(k in ans for k in ["poor", "low income", "lower income", "percentage", "proportion", "disposable", "disproportionate"]):
        score += 1
    else:
        deductions.append("Missing explanation of why it affects low-income earners disproportionately.")
    return min(score, 3), " ".join(deductions) if deductions else "Full credit for correct identification and reasoning."

def score_q2(ans):
    """Negative Externality /3. Prompt: Give an example."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if any(k in ans for k in ["pollut", "smoke", "factory", "dump", "spill", "waste", "noise", "smoking", "second-hand", "chemical"]):
        score = 3
    elif any(k in ans for k in ["third party", "uninvolved", "outsider", "not involved", "aren't involved", "aren\u2019t involved", "someone else", "unrelated"]):
        score = 2
        deductions.append("Understands the definition (impact on non-participants) but example could be more clear/classic.")
    else:
        score = 1
        deductions.append("Example provided does not clearly illustrate a negative externality.")
    return min(score, 3), " ".join(deductions) if deductions else "Clear, relevant example provided."

def score_q3(ans):
    """Market Failure /3. Prompt: Describe an example."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if any(k in ans for k in ["tragedy", "commons", "monopol", "externality", "public good", "asymmetric", "crash", "depression", "bank run", "stock market"]):
        score = 3
    else:
        score = 1
        deductions.append("Example provided is not a standard case of market failure.")
    return min(score, 3), " ".join(deductions) if deductions else "Valid example of market failure described."

def score_q4(ans):
    """Monetary Policy /4."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if any(k in ans for k in ["money supply", "value of money", "interest rate", "inflation", "growth", "economy", "monetary"]):
        score += 2
    else:
        deductions.append("Vague or missing definition of monetary policy.")
    if any(k in ans for k in ["interest rate", "overnight rate", "target rate", "discount rate"]):
        score += 2
    else:
        deductions.append("Did not identify interest rates/overnight rate as the primary tool.")
    return min(score, 4), " ".join(deductions) if deductions else "Correctly defined policy and identified interest rates as the tool."

def score_q5(ans):
    """CDIC / Banking /4."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if any(k in ans for k in ["cdic", "cidc", "insurance", "government", "canada deposit"]):
        score += 1
    else:
        deductions.append("Did not name the protection/agency (CDIC).")
    if "100" in ans or "hundred thousand" in ans:
        score += 1
    else:
        deductions.append("Did not state the protection limit ($100,000).")
    if any(k in ans for k in ["loan", "lend", "invest", "mortgage"]):
        score += 2
    else:
        deductions.append("Did not explain that the bank lends out deposits.")
    return min(score, 4), " ".join(deductions) if deductions else "Comprehensive answer covering CDIC and bank lending."

def score_q6(ans):
    """Tragedy of the Commons /4."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []
    if any(k in ans for k in ["tragedy", "commons", "tradgedy", "tragety"]):
        score += 2
    else:
        deductions.append("Did not name the 'Tragedy of the Commons' principle.")
    if any(k in ans for k in ["self-interest", "greedy", "own gain", "individual", "maximize", "self interest"]):
        score += 2
    else:
        deductions.append("Missing explanation of why individual self-interest leads to the outcome.")
    return min(score, 4), " ".join(deductions) if deductions else "Identified principle and explained the incentive problem."

def score_q7(ans):
    """Themes /4. Prompt: TWO themes, overview, effect in 2026."""
    ans = ans.lower().strip()
    if not ans or ans in [".", "*"]: return 0, "No response provided."
    score = 0
    deductions = []

    # Broad ideas from dossiers
    dossier_ideas = {
        'housing': ["rent", "expensive", "buy", "corporat", "financial", "home", "cost of living", "afford", "house"],
        'ai': ["job", "replace", "automat", "disrupt", "algorithm", "technology", "generative", "work", "artificial"],
        'inequality': ["gap", "wealth", "rich", "poor", "money", "concentrat", "class", "inequality"],
        'trap': ["trap", "hustle", "burnout", "debt", "cycle", "poverty", "side"]
    }

    found_themes = [t for t, ks in dossier_ideas.items() if any(k in ans for k in ks)]
    num_themes = len(set(found_themes))
    idea_hits = sum(1 for theme_ks in dossier_ideas.values() for k in theme_ks if k in ans)
    has_2026 = any(k in ans for k in ["2026", "future", "affect", "impact", "result", "happen", "will"])

    if num_themes >= 2:
        score += 2
    elif num_themes == 1:
        score += 1
        deductions.append("Only addressed one major theme (required two).")
    else:
        deductions.append("Did not clearly address the major themes from the dossiers.")

    # Comprehensiveness and Future Link - generous threshold
    if num_themes >= 2 and has_2026:
        if len(ans) > 600 or (len(ans) > 400 and idea_hits > 8):
            score += 2
        elif len(ans) > 300:
            score += 1
            deductions.append("Good general overview, but could be more comprehensive in detail.")
        else:
            deductions.append("Response is too brief to be considered a 'comprehensive' overview.")
    else:
        if not has_2026:
            deductions.append("Missing explanation of how these issues affect the future/2026.")

    return min(score, 4), " ".join(deductions) if deductions else "Comprehensive overview with strong future links and varied ideas."

def get_report():
    students = []
    with open(CSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        for row in reader:
            if not row or len(row) < 11: continue
            name = row[2].strip()
            if not name: name = row[1].split('@')[0]

            q1_ans = row[4]
            q2_ans = row[5]
            q3_ans = row[6]
            q4_ans = row[7]
            q5_ans = row[8]
            q6_ans = row[9]
            q7_ans = row[10]

            s1, c1 = score_q1(q1_ans)
            s2, c2 = score_q2(q2_ans)
            s3, c3 = score_q3(q3_ans)
            s4, c4 = score_q4(q4_ans)
            s5, c5 = score_q5(q5_ans)
            s6, c6 = score_q6(q6_ans)
            s7, c7 = score_q7(q7_ans)

            total = s1+s2+s3+s4+s5+s6+s7
            students.append({
                'name': name,
                'scores': [s1, s2, s3, s4, s5, s6, s7],
                'comments': [c1, c2, c3, c4, c5, c6, c7],
                'responses': [q1_ans, q2_ans, q3_ans, q4_ans, q5_ans, q6_ans, q7_ans],
                'total': total
            })

    students.sort(key=lambda x: x['total'], reverse=True)
    avg = sum(s['total'] for s in students)/len(students) if students else 0
    mx = max(s['total'] for s in students) if students else 0
    mn = min(s['total'] for s in students) if students else 0

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Final Moderated ICA Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;900&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg: #121212;
            --card: #1e1e1e;
            --accent: #bb86fc;
            --text: #e0e0e0;
            --orange: #ff9800;
        }}
        body {{ font-family: 'Outfit', sans-serif; background: var(--bg); color: var(--text); padding: 40px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        header {{ text-align: center; margin-bottom: 60px; }}
        h1 {{ font-size: 3rem; font-weight: 900; color: var(--accent); }}
        .stats {{ display: flex; justify-content: space-around; margin-bottom: 40px; }}
        .stat-card {{ background: var(--card); padding: 20px; border-radius: 8px; text-align: center; width: 22%; border: 1px solid #333; }}
        .stat-val {{ font-size: 2rem; font-weight: 900; color: var(--accent); }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 60px; background: var(--card); border-radius: 8px; overflow: hidden; }}
        th, td {{ padding: 15px; text-align: center; border-bottom: 1px solid #333; }}
        th {{ background: #252525; font-family: 'Courier Prime', monospace; }}
        .name-cell {{ text-align: left; font-weight: 600; }}
        .score-pill {{ padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; }}
        .high {{ background: rgba(76,175,80,0.2); color: #81c784; }}
        .mid {{ background: rgba(255,235,59,0.2); color: #fff176; }}
        .low {{ background: rgba(244,67,54,0.2); color: #e57373; }}
        .student-block {{ background: var(--card); padding: 30px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #333; }}
        .student-title {{ font-size: 1.5rem; font-weight: 900; margin-bottom: 20px; display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 10px; }}
        .q-block {{ margin-bottom: 20px; padding: 15px; background: #252525; border-radius: 8px; }}
        .q-text {{ font-family: 'Courier Prime', monospace; color: var(--accent); font-weight: bold; margin-bottom: 10px; }}
        .ans-text {{ margin-bottom: 10px; color: #bbb; font-style: italic; }}
        .comment-text {{ font-size: 0.9rem; color: var(--orange); }}
    </style>
</head>
<body>
<div class="container">
    <header>
        <h1>May 7 ICA Moderated Report</h1>
        <p>Final pass with per-question deduction reasoning and conceptual focus.</p>
    </header>
    <div class="stats">
        <div class="stat-card"><div class="stat-val">{len(students)}</div><div>Students</div></div>
        <div class="stat-card"><div class="stat-val">{avg:.1f}</div><div>Average</div></div>
        <div class="stat-card"><div class="stat-val">{mx}</div><div>Max</div></div>
        <div class="stat-card"><div class="stat-val">{mn}</div><div>Min</div></div>
    </div>
    <table>
        <thead><tr>
            <th class="name-cell">Student</th>
            <th>Q1 (/3)</th><th>Q2 (/3)</th><th>Q3 (/3)</th><th>Q4 (/4)</th><th>Q5 (/4)</th><th>Q6 (/4)</th><th>Q7 (/4)</th>
            <th>Total (/25)</th>
        </tr></thead>
        <tbody>
"""
    for s in students:
        html_content += f"<tr><td class='name-cell'>{s['name']}</td>"
        maxes = [3,3,3,4,4,4,4]
        for i in range(7):
            val = s['scores'][i]
            cls = "high" if val/maxes[i] >= 0.75 else "mid" if val/maxes[i] >= 0.5 else "low"
            html_content += f"<td><span class='score-pill {cls}'>{val}</span></td>"
        total_cls = "high" if s['total']/25 >= 0.75 else "mid" if s['total']/25 >= 0.5 else "low"
        html_content += f"<td><span class='score-pill {total_cls}'>{s['total']}</span></td></tr>"

    html_content += "</tbody></table>\n<h2>Detailed Moderation Notes</h2>\n"

    q_labels = [
        "Q1: HST Progressive vs Regressive",
        "Q2: Negative Externality Example",
        "Q3: Market Failure Example",
        "Q4: Monetary Policy & BoC Tool",
        "Q5: Bank Protection (CDIC) & Lending",
        "Q6: Tragedy of the Commons",
        "Q7: Thematic Links Analysis"
    ]

    for s in students:
        html_content += f"""
<div class="student-block">
  <div class="student-title"><span>{s['name']}</span><span>{s['total']}/25</span></div>
"""
        for i in range(7):
            mx = [3,3,3,4,4,4,4][i]
            html_content += f"""
  <div class="q-block">
    <div class="q-text">{q_labels[i]} ({s['scores'][i]}/{mx})</div>
    <div class="ans-text">"{html.escape(s['responses'][i])}"</div>
    <div class="comment-text">Moderation Note: {s['comments'][i]}</div>
  </div>"""
        html_content += "\n</div>"

    html_content += "\n</div>\n</body>\n</html>\n"
    return html_content

if __name__ == "__main__":
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    report = get_report()
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"Generated report at {OUTPUT_PATH}")
