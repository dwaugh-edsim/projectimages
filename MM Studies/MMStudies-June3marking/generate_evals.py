"""
Generate 4 evaluation HTML files from extracted_submissions.json.
Each file includes detailed per-student, per-question rubric feedback.
"""
import json, html, re

with open('extracted_submissions.json', encoding='utf-8') as f:
    data = json.load(f)

# Resolve keys (they have garbled unicode for em-dash)
def find_key(d, fragment):
    for k in d:
        if fragment.lower() in k.lower():
            return k
    return None

IRSSA_KEY  = find_key(data, 'IRSSA')
SCOOP_KEY  = find_key(data, 'Sixties')
LIAM_KEY   = find_key(data, 'Liam')

# ─────────────────────────────────────────────────────────────────────────────
# RUBRIC DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

IRSSA_RUBRIC = {
    "slide_1": {
        "label": "Slide 1 — Why IRSSA 2007 was a turning point",
        "benchmark": "Student should explain that the IRSSA ended decades of silence, established a $1.9 billion framework (5 pillars), and moved Canada from individual lawsuits to a national reconciliation process.",
        "keywords": ["1.9 billion", "pillar", "acknowledge", "compensation", "trc", "turning point", "formal", "recognition"],
        "thin_patterns": ["said sorry", "apology", "gave money", "important", "government admitted"],
        "strong_patterns": ["1.9 billion", "five pillar", "national", "framework", "ending silence", "state-sponsored", "comprehensive"],
    },
    "slide_2": {
        "label": "Slide 2 — Most critical IRSSA pillar (with justification)",
        "benchmark": "Student names one specific pillar AND explains why it matters more than the others for long-term reconciliation. The TRC is the strongest answer (creates shared record, 94 Calls to Action), but Health & Healing, CEP, or IAP are valid with clear justification.",
        "keywords": ["trc", "truth and reconciliation", "health", "healing", "cep", "iap", "commemoration", "because", "most important"],
        "thin_patterns": ["trc is good", "most important", "because it helped"],
        "strong_patterns": ["94 calls to action", "survivor testimonies", "long-term", "intergenerational", "public education", "national record"],
    },
    "slide_3": {
        "label": "Slide 3 — Shubenacadie school facts",
        "benchmark": "Shubenacadie Indian Residential School: operated 1929–1967 = 38 years; administered by the Roman Catholic Church (Roman Catholic Archdiocese of Halifax / Missionary Oblates of Mary Immaculate).",
        "keywords": ["1929", "1967", "38", "roman catholic", "shubenacadie", "oblate", "sisters of charity"],
        "thin_patterns": [],
        "strong_patterns": ["1929", "38 years"],
        "fact_check": True,
        "correct_years": "1929–1967 (38 years)",
        "correct_church": "Roman Catholic Church"
    },
    "slide_4": {
        "label": "Slide 4 — CEP and TRC applied to Betty Ross (Sugar Falls)",
        "benchmark": "Student connects Betty Ross's experience in Sugar Falls to both pillars specifically: CEP = financial recognition for time at school; TRC = truth-telling scene where Betty shares her story with students mirrors TRC's documentation mandate.",
        "keywords": ["betty", "sugar falls", "cep", "trc", "story", "tell", "truth-telling", "compensation", "recognize"],
        "thin_patterns": ["helped her", "gave money", "shared her story"],
        "strong_patterns": ["sugar falls", "truth-telling", "smudge", "tells students", "documents", "her experience", "collective"],
    },
    "slide_5": {
        "label": "Slide 5 — Why Beyond 94 projects stall",
        "benchmark": "Student identifies specific structural barriers: governments announce funding but don't follow through; requires multi-government coordination; political priorities shift; lack of clear timelines. Best answers cite specific examples from the tracker.",
        "keywords": ["stall", "funding", "government", "coordination", "timeline", "follow through", "proposed", "underway"],
        "thin_patterns": ["lack of money", "government lazy", "slow"],
        "strong_patterns": ["multi-government", "coordination", "federal provincial", "political priority", "timeline", "accountability", "structural"],
    },
    "slide_6": {
        "label": "Slide 6 — Biggest regional reconciliation challenge",
        "benchmark": "Strong answers connect IRSSA limitations to ongoing local issues: 1752 Treaty rights (Leo Francis case), economic reconciliation for Mi'kmaq, the gap between apologies and real change. Weak answers are generic ('need to do better').",
        "keywords": ["1752", "leo", "economic", "treaty", "mikmaq", "mi'kmaq", "land", "resources", "nova scotia", "beyond 94"],
        "thin_patterns": ["need to do better", "more money", "more support", "biggest challenge"],
        "strong_patterns": ["1752 treaty", "leo francis", "economic reconciliation", "moderate livelihood", "self-determination", "treaty rights"],
    }
}

LIAM_RUBRIC = {
    "ans-q1-risk": {
        "label": "Q1 — Actuarial Bias & Prison Demographics",
        "benchmark": "Student should compare men (25.2%→33%) AND women (36.1%→50%) separately, note women's figures widened faster, and explain that actuarial scoring penalizes poverty/history (not criminal intent) — a proxy for systemic colonial harm.",
        "keywords": ["actuarial", "bias", "33%", "50%", "women", "men", "poverty", "risk", "systemic", "overrepresentation"],
        "thin_patterns": ["unfair", "wrong", "indigenous people are overrepresented"],
        "strong_patterns": ["25.2", "36.1", "actuarial", "widened", "poverty", "history", "systemic bias", "proxy"],
    },
    "ans-q2-trc": {
        "label": "Q2 — TRC Call to Action #30 & Intergenerational Trauma",
        "benchmark": "Student explains TRC #30 demands governments eliminate Indigenous overrepresentation in the justice system, AND connects to intergenerational trauma from residential schools (Liam's grandfather → Liam's circumstances).",
        "keywords": ["call to action 30", "#30", "overrepresentation", "eliminate", "intergenerational", "residential school", "grandfather", "trauma"],
        "thin_patterns": ["wants to help", "reduce", "residential schools were bad"],
        "strong_patterns": ["call to action 30", "eliminate overrepresentation", "intergenerational", "grandfather", "liam", "residential school trauma"],
    },
    "ans-q3-marshall": {
        "label": "Q3 — Donald Marshall Jr.",
        "benchmark": "Student explains: Mi'kmaw man wrongly convicted of murder in Nova Scotia (1971), spent 11 years in prison before exoneration; Royal Commission found systemic racism in police/prosecutors/courts; landmark case for Indigenous justice reform.",
        "keywords": ["donald marshall", "wrongful conviction", "nova scotia", "11 years", "royal commission", "systemic racism", "exonerated"],
        "thin_patterns": ["was wrongly convicted", "justice system failed him"],
        "strong_patterns": ["11 years", "royal commission", "systemic racism", "nova scotia", "1971", "exonerated", "mi'kmaw"],
    },
    "ans-q4-gladue": {
        "label": "Q4 — Gladue Rights & Funding Gap",
        "benchmark": "Student explains: substantive equality = courts consider an individual's Indigenous background and colonial history in sentencing (not just equal treatment); Gladue funding gap = lack of community resources/Gladue reports means judges have no alternatives to offer.",
        "keywords": ["gladue", "substantive equality", "funding gap", "background", "colonial", "alternatives", "community resources", "report"],
        "thin_patterns": ["different treatment", "equal", "not enough money"],
        "strong_patterns": ["substantive equality", "gladue report", "funding gap", "community resources", "alternatives to jail", "colonial history", "background"],
    },
    "ans-q5-circle": {
        "label": "Q5 — Sentencing Circle Physical Design",
        "benchmark": "Student contrasts: conventional courts have elevated bench, robes, adversarial layout (hierarchy); circles have equal chair heights, no robes (no hierarchy), community members present. Eagle Feather = sacred object; speaker holding it is bound to tell truth.",
        "keywords": ["circle", "equal", "chairs", "robes", "hierarchy", "eagle feather", "sacred", "truth", "community"],
        "thin_patterns": ["sit in a circle", "everyone is equal", "feather means truth"],
        "strong_patterns": ["chair height", "no robes", "no hierarchy", "eagle feather", "sacred", "bound to truth", "adversarial", "conventional court"],
    },
    "ans-q6-comparison": {
        "label": "Q6 — Conventional vs. Restorative Justice",
        "benchmark": "Student should compare: conventional = punish offender, adversarial (Crown vs defence), victim is witness; restorative = repair harm, community healing, victim is central participant with voice.",
        "keywords": ["punish", "repair", "victim", "community", "adversarial", "healing", "restorative", "conventional"],
        "thin_patterns": ["different goals", "one punishes and one heals"],
        "strong_patterns": ["adversarial", "repair harm", "victim has a voice", "community", "healing plan", "central participant"],
    },
    "ans-q7-recidivism": {
        "label": "Q7 — Bill C-5, Recidivism & Root Causes",
        "benchmark": "Student states: Indigenous-led restorative programs reduce recidivism by ~30-40% (or similar specific figure from Fact Check); Bill C-5 alone is insufficient because poverty, housing, and trauma (root causes) create the conditions for re-offending.",
        "keywords": ["recidivism", "30%", "40%", "reduce", "bill c-5", "root cause", "poverty", "housing", "trauma", "systemic"],
        "thin_patterns": ["less likely to re-offend", "law change isn't enough"],
        "strong_patterns": ["recidivism", "reduce", "bill c-5", "root cause", "poverty", "social determinants", "housing", "trauma"],
    },
    "ans-q8-relations": {
        "label": "Q8 — Msit No'kmaq & The Two Paths",
        "benchmark": "Student defines Msit No'kmaq as 'All My Relations' — interconnectedness of all beings (people, nature, community); connects sweetgrass braid symbolism; contrasts cold grey prison walls (conventional/punitive path) with warm golden sunset (restorative/community path).",
        "keywords": ["msit no'kmaq", "all my relations", "sweetgrass", "interconnect", "grey", "golden", "two paths", "braid", "symbolism"],
        "thin_patterns": ["means everyone is connected", "the braid is important"],
        "strong_patterns": ["all my relations", "sweetgrass braid", "interconnectedness", "grey walls", "golden sunset", "two paths", "visual contrast"],
    },
    "ans-q9-maya": {
        "label": "Q9 — Reservation Housing & Status Exclusions (Maya Paul connection)",
        "benchmark": "Student connects Liam's housing insecurity to: Indian Act status codes that excluded people from band membership (Bill C-31, 6(1)/6(2) status); reserve housing shortages that pushed families off-reserve; Sixties Scoop family separations (Maya Paul's grandmother) → loss of connections → housing insecurity.",
        "keywords": ["maya", "indian act", "status", "reserve", "housing", "sixties scoop", "bill c-31", "band", "off-reserve"],
        "thin_patterns": ["maya paul had similar problems", "housing was hard"],
        "strong_patterns": ["indian act", "status", "reserve", "sixties scoop", "maya paul", "family separation", "off-reserve", "bill c-31"],
    },
    "ans-q10-leo": {
        "label": "Q10 — Treaty Rights & Authority (Leo 1752 connection)",
        "benchmark": "Student connects: conventional courts ignoring Mi'kmaw community authority parallels the jurisdiction clashes in Leo's 1752 case; both show Crown overriding Indigenous self-governance; sentencing circles represent Indigenous legal authority that colonial courts don't recognize — same tension as the truckhouse raid.",
        "keywords": ["leo", "1752", "treaty", "jurisdiction", "mi'kmaw", "self-governance", "authority", "sovereignty", "colonial"],
        "thin_patterns": ["both have problems with the government", "indigenous rights"],
        "strong_patterns": ["1752 treaty", "leo francis", "jurisdiction", "self-governance", "sovereignty", "mi'kmaw authority", "colonial", "override"],
    }
}

SCOOP_RUBRIC = {
    "slide_1": {
        "label": "Slide 1 — Sixties Scoop: What happened to Maya's grandmother Annie Googoo?",
        "benchmark": "Student should describe: Annie was forcibly apprehended as a child from her Mi'kmaw family, placed with a non-Indigenous family, lost her Mi'kmaw identity, language, and connection to community. This was part of a national policy of removing Indigenous children.",
        "keywords": ["apprehended", "removed", "non-indigenous", "family", "culture", "language", "identity", "scoop", "annie", "googoo"],
        "thin_patterns": ["taken away", "adopted", "lost culture"],
        "strong_patterns": ["forcibly", "apprehended", "non-indigenous family", "identity loss", "language", "mi'kmaw", "policy"],
    },
    "slide_2": {
        "label": "Slide 2 — Indian Act status codes and their effect on Annie/Maya",
        "benchmark": "Student should explain how Indian Act Section 12(1)(b) or 6(1)/6(2) status rules stripped status from Indigenous women who married non-Indigenous men (and their children). Annie's loss of status affected her children's and Maya's connection to the band and reserve.",
        "keywords": ["indian act", "status", "section 12", "6(1)", "marry", "lost status", "band membership", "maya"],
        "thin_patterns": ["lost her status", "indian act was unfair"],
        "strong_patterns": ["section 12", "6(1)", "marry non-indigenous", "stripped status", "band membership", "intergenerational", "maya"],
    },
    "slide_3": {
        "label": "Slide 3 — How the Sixties Scoop differed from residential schools",
        "benchmark": "Key difference: residential schools kept children within Canada and Indigenous culture was partially traceable; Sixties Scoop placed children with non-Indigenous families, often in different provinces or countries, severing all cultural/family ties. Both were assimilation policies but Sixties Scoop was harder to reverse.",
        "keywords": ["residential school", "different", "non-indigenous", "adopt", "province", "country", "assimilation", "sever"],
        "thin_patterns": ["both took children away", "similar problems"],
        "strong_patterns": ["non-indigenous family", "different province", "country", "sever", "traceable", "assimilation", "harder to reverse"],
    },
    "slide_4": {
        "label": "Slide 4 — Government's justification and why it was wrong",
        "benchmark": "Government claimed children were removed for their 'best interests' / welfare. Student should identify why this was wrong: it was cultural genocide disguised as child welfare; the poverty on reserves that triggered removals was itself caused by colonial policies; Indigenous families had no voice in proceedings.",
        "keywords": ["best interest", "welfare", "cultural genocide", "colonial", "poverty", "no voice", "disguised", "reserve"],
        "thin_patterns": ["government lied", "it was wrong because"],
        "strong_patterns": ["cultural genocide", "best interests", "colonial poverty", "no voice", "disguised as welfare", "systemic"],
    },
    "slide_5": {
        "label": "Slide 5 — Legacy for Maya Paul today",
        "benchmark": "Student should discuss: Maya's disconnection from her Mi'kmaw identity, language, culture, and community; the intergenerational trauma she inherited; challenges in reclaiming identity; and connections to broader systemic inequities that affect housing, mental health, and belonging.",
        "keywords": ["maya", "identity", "language", "reconnect", "intergenerational", "trauma", "belonging", "community"],
        "thin_patterns": ["hard for maya", "she doesn't know her culture"],
        "strong_patterns": ["intergenerational trauma", "identity", "language", "reconnect", "belonging", "systemic", "community"],
    },
    "slide_6": {
        "label": "Slide 6 — Connecting to IRSSA and reconciliation today",
        "benchmark": "Strong answers connect: Sixties Scoop is not covered by IRSSA (different policy era); separate class action settlement in 2017; reconciliation must address Sixties Scoop survivors' identity loss, not just residential school survivors. Bonus: connection to Beyond 94 calls to action.",
        "keywords": ["irssa", "not covered", "class action", "2017", "reconciliation", "beyond 94", "identity", "separate", "settlement"],
        "thin_patterns": ["need reconciliation", "similar to irssa"],
        "strong_patterns": ["not covered by irssa", "separate settlement", "class action", "2017", "identity loss", "beyond 94"],
    }
}


# ─────────────────────────────────────────────────────────────────────────────
# EVALUATION LOGIC
# ─────────────────────────────────────────────────────────────────────────────

def score_response(text, rubric_entry):
    """
    Score a single text response 0-2:
      0 = empty or nonsense
      1 = present but thin / missing key concept
      2 = good understanding demonstrated
    Also return a specific feedback string.
    """
    if not text or not text.strip():
        return 0, "Not answered."

    t = text.lower()
    keywords = rubric_entry.get("keywords", [])
    strong = rubric_entry.get("strong_patterns", [])
    thin = rubric_entry.get("thin_patterns", [])
    word_count = len(text.split())

    strong_hits = sum(1 for p in strong if p.lower() in t)
    keyword_hits = sum(1 for k in keywords if k.lower() in t)

    if word_count < 15 and keyword_hits < 2:
        return 1, "Response is very brief — the idea is present but underdeveloped."

    if strong_hits >= 2:
        return 2, None  # Strong — no critical comment needed
    elif keyword_hits >= 3:
        return 2, None
    else:
        return 1, None  # present but thin — will fall through to specific feedback


def generate_feedback(student_name, responses, rubric, question_keys):
    """
    Returns (grade_1_to_5, answered_count, feedback_html)
    """
    total_questions = len(question_keys)
    answered = sum(1 for k in question_keys if responses.get(k, "").strip())
    
    # Score each question
    scores = {}
    for k in question_keys:
        text = responses.get(k, "")
        if not text.strip():
            scores[k] = (0, "Not answered.")
        else:
            scores[k] = score_response(text, rubric[k])

    total_score = sum(s for s, _ in scores.values())
    max_score = total_questions * 2

    # Convert to 5-point scale
    pct = total_score / max_score if max_score > 0 else 0
    if pct >= 0.85:
        grade = 5
    elif pct >= 0.70:
        grade = 4
    elif pct >= 0.50:
        grade = 3
    elif pct >= 0.25:
        grade = 2
    else:
        grade = 1

    # Also penalize heavy non-completion
    completion_pct = answered / total_questions
    if completion_pct < 0.4:
        grade = min(grade, 2)
    elif completion_pct < 0.6:
        grade = min(grade, 3)

    # Build feedback HTML
    fb_parts = []
    
    deficiency_items = []
    strength_items = []
    
    for k in question_keys:
        entry = rubric[k]
        label = entry["label"]
        text = responses.get(k, "").strip()
        score, _ = scores[k]

        if score == 0:
            deficiency_items.append(f'<li class="fb-missing"><strong>{html.escape(label)}:</strong> Not answered.</li>')
        elif score == 1:
            # Generate specific gap feedback
            t = text.lower()
            strong_patterns = entry.get("strong_patterns", [])
            missed = [p for p in strong_patterns if p.lower() not in t]
            gap_hint = ""
            if missed:
                gap_hint = f" Missing key concept: <em>{html.escape(missed[0])}</em>."
            benchmark = entry["benchmark"]
            # Pick one sentence from benchmark as hint
            benchmark_hint = benchmark.split('.')[0] + "."
            deficiency_items.append(
                f'<li class="fb-thin"><strong>{html.escape(label)}:</strong> '
                f'Response shows some understanding but is underdeveloped.{gap_hint} '
                f'<span class="fb-benchmark">Expected: {html.escape(benchmark_hint)}</span></li>'
            )
        else:
            strength_items.append(f'<li class="fb-strong"><strong>{html.escape(label)}:</strong> Good understanding demonstrated.</li>')

    return grade, answered, deficiency_items, strength_items


# ─────────────────────────────────────────────────────────────────────────────
# HTML TEMPLATE
# ─────────────────────────────────────────────────────────────────────────────

HTML_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Student evaluation report — {title}">
    <title>{title} — Evaluation Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-base: #0a0b10;
            --bg-card: #121420;
            --bg-hover: #1b1e32;
            --border-color: rgba(255, 255, 255, 0.08);
            --accent-blue: #5DADE2;
            --accent-blue-glow: rgba(93, 173, 226, 0.25);
            --text-main: #f0f3f8;
            --text-muted: #8fa0b5;
            --danger: #ff4757;
            --warning: #ffa502;
            --success: #2ed573;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ font-family: 'Inter', sans-serif; background-color: var(--bg-base); color: var(--text-main); line-height: 1.6; padding: 40px 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .gemini-header {{ display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--border-color); padding-bottom: 20px; margin-bottom: 30px; }}
        .gemini-logo {{ font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 2rem; letter-spacing: 3px; background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-transform: uppercase; }}
        .report-meta {{ text-align: right; }}
        .report-meta h1 {{ font-family: 'Outfit', sans-serif; font-size: 1.8rem; color: #fff; font-weight: 700; }}
        .report-meta p.subtitle {{ color: var(--text-muted); font-size: 0.95rem; margin-top: 4px; }}
        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 30px; }}
        .summary-stat {{ background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.2); transition: transform 0.3s; }}
        .summary-stat:hover {{ transform: translateY(-2px); border-color: var(--accent-blue); }}
        .summary-stat .number {{ font-size: 2.2rem; font-weight: bold; font-family: 'Outfit', sans-serif; color: var(--accent-blue); text-shadow: 0 0 10px var(--accent-blue-glow); }}
        .summary-stat .label {{ font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; font-weight: 600; }}
        .filter-bar {{ background: var(--bg-card); border: 1px solid var(--border-color); padding: 15px 20px; border-radius: 12px; margin-bottom: 25px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }}
        .search-box {{ flex-grow: 1; min-width: 200px; padding: 10px 16px; border: 1px solid var(--border-color); background: var(--bg-base); color: #fff; border-radius: 8px; font-size: 0.9rem; outline: none; }}
        .search-box:focus {{ border-color: var(--accent-blue); }}
        .filter-btn {{ padding: 8px 16px; border: 1px solid var(--border-color); background: var(--bg-base); color: var(--text-muted); border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s; }}
        .filter-btn:hover, .filter-btn.active {{ background: var(--accent-blue); color: #000; border-color: var(--accent-blue); }}
        #studentList {{ display: flex; flex-direction: column; gap: 16px; }}
        .student-card {{ background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); transition: all 0.3s; }}
        .student-card:hover {{ border-color: var(--accent-blue); box-shadow: 0 8px 30px var(--accent-blue-glow); }}
        .student-card.flagged {{ border-left: 5px solid var(--danger); }}
        .student-card.incomplete {{ border-left: 5px solid var(--warning); }}
        .student-card.test-account {{ opacity: 0.5; border-style: dashed; }}
        .student-header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }}
        .student-name {{ font-size: 1.3rem; font-weight: 700; font-family: 'Outfit', sans-serif; color: #fff; }}
        .grade-badge {{ padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 1rem; font-family: 'Outfit', sans-serif; }}
        .grade-5 {{ background: rgba(46,213,115,0.15); color: var(--success); border: 1px solid var(--success); }}
        .grade-4 {{ background: rgba(46,213,115,0.1); color: var(--success); border: 1px solid rgba(46,213,115,0.5); }}
        .grade-3 {{ background: rgba(255,165,2,0.15); color: var(--warning); border: 1px solid var(--warning); }}
        .grade-2 {{ background: rgba(255,71,87,0.1); color: var(--danger); border: 1px solid rgba(255,71,87,0.4); }}
        .grade-1 {{ background: rgba(255,71,87,0.2); color: var(--danger); border: 1px solid var(--danger); }}
        .completeness {{ font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; font-weight: 500; }}
        .feedback-section {{ margin-bottom: 14px; }}
        .feedback-section h4 {{ font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; font-weight: 700; }}
        .feedback-list {{ list-style: none; padding: 0; }}
        .feedback-list li {{ font-size: 0.9rem; padding: 7px 12px; border-radius: 6px; margin-bottom: 5px; }}
        .fb-missing {{ background: rgba(255,71,87,0.1); border-left: 3px solid var(--danger); color: #f8c4c8; }}
        .fb-thin {{ background: rgba(255,165,2,0.08); border-left: 3px solid var(--warning); color: #ffe0a0; }}
        .fb-strong {{ background: rgba(46,213,115,0.06); border-left: 3px solid rgba(46,213,115,0.4); color: #a8f0cb; }}
        .fb-benchmark {{ display: block; font-size: 0.8rem; opacity: 0.7; margin-top: 3px; font-style: italic; }}
        .toggle-responses-btn {{ background: rgba(93,173,226,0.1); border: 1px solid rgba(93,173,226,0.3); color: var(--accent-blue); padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; margin-top: 10px; transition: all 0.2s; }}
        .toggle-responses-btn:hover {{ background: rgba(93,173,226,0.2); }}
        .student-responses-detail {{ margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px; }}
        .question-response {{ background: rgba(255,255,255,0.03); border-left: 3px solid rgba(93,173,226,0.3); padding: 10px 14px; border-radius: 0 6px 6px 0; margin-bottom: 10px; font-size: 0.88rem; color: #cbd5e1; white-space: pre-wrap; }}
        .question-response strong {{ color: var(--accent-blue); display: block; margin-bottom: 4px; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }}
        .flag-note {{ color: var(--danger); font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; }}
        .incomplete-note {{ color: var(--warning); font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; }}
        .incomplete-badge {{ display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; background: rgba(255,165,2,0.12); color: var(--warning); border: 1px solid rgba(255,165,2,0.4); margin-left: 10px; vertical-align: middle; }}
    </style>
</head>
<body>
<div class="container">
    <div class="gemini-header">
        <div class="gemini-logo">GEMINI</div>
        <div class="report-meta">
            <h1>{title}</h1>
            <p class="subtitle">Generated: {date} · Mi'kmaw Studies 11 · Evaluation Report v2</p>
        </div>
    </div>

    <div class="summary">
        <div class="summary-stat"><div class="number">{total}</div><div class="label">Total Students</div></div>
        <div class="summary-stat"><div class="number">{grade5}</div><div class="label">Grade 5</div></div>
        <div class="summary-stat"><div class="number">{grade4}</div><div class="label">Grade 4</div></div>
        <div class="summary-stat"><div class="number">{grade3}</div><div class="label">Grade 3</div></div>
        <div class="summary-stat"><div class="number">{grade2plus1}</div><div class="label">Grade 1–2</div></div>
        <div class="summary-stat"><div class="number">{flagged}</div><div class="label">Flagged</div></div>
    </div>

    <div class="filter-bar">
        <input class="search-box" type="text" id="searchBox" placeholder="Search student..." oninput="filterStudents()">
        <button class="filter-btn active" onclick="filterGrade('all', this)">All</button>
        <button class="filter-btn" onclick="filterGrade('5', this)">Grade 5</button>
        <button class="filter-btn" onclick="filterGrade('4', this)">Grade 4</button>
        <button class="filter-btn" onclick="filterGrade('3', this)">Grade 3</button>
        <button class="filter-btn" onclick="filterGrade('2', this)">Grade 2</button>
        <button class="filter-btn" onclick="filterGrade('1', this)">Grade 1</button>
        <button class="filter-btn" onclick="filterGrade('flagged', this)">⚠ Flagged</button>
        <button class="filter-btn" onclick="filterGrade('incomplete', this)">⏳ Incomplete</button>
    </div>

    <div id="studentList">
"""

HTML_FOOT = """    </div>
</div>

<script>
function filterGrade(grade, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.student-card').forEach(card => {
        if (grade === 'all') { card.style.display = ''; return; }
        if (grade === 'flagged') { card.style.display = card.dataset.flagged === 'true' ? '' : 'none'; return; }
        if (grade === 'incomplete') { card.style.display = card.dataset.incomplete === 'true' ? '' : 'none'; return; }
        card.style.display = card.dataset.grade === grade ? '' : 'none';
    });
}
function filterStudents() {
    const q = document.getElementById('searchBox').value.toLowerCase();
    document.querySelectorAll('.student-card').forEach(card => {
        card.style.display = card.dataset.name.includes(q) ? '' : 'none';
    });
}
function toggleResponses(btn) {
    const detail = btn.nextElementSibling;
    const visible = detail.style.display !== 'none';
    detail.style.display = visible ? 'none' : 'block';
    btn.textContent = visible ? 'Show Student Responses' : 'Hide Student Responses';
}
</script>
</body>
</html>
"""

# ─────────────────────────────────────────────────────────────────────────────
# FLAGGING RULES
# ─────────────────────────────────────────────────────────────────────────────
FLAG_PATTERNS = [
    r'\bmrwaugh\b', r'\btest\b', r'\bxoxo\b', r'\babba\b',
    r'please fail me', r'sfhgm', r'zayden.*please',
    r'r2getg', r'\bloading\b', r'testing testing',
]

def is_flagged(student_name, responses, sim_key=""):
    name_lower = student_name.lower()
    if any(re.search(p, name_lower) for p in FLAG_PATTERNS):
        return True
    
    # Specific plagiarism check for Ruby (NECK) on the 60s Scoop (Maya Paul) simulation.
    # Her telemetry indicates copy-pasting (pasted: true) on all slides, and responses match Mae's.
    if "ruby" in name_lower and "neck" in name_lower and sim_key == "scoop":
        return True

    all_text = " ".join(str(v) for v in responses.values()).lower()
    if any(re.search(p, all_text) for p in FLAG_PATTERNS):
        return True
    # Very short total response
    total_chars = sum(len(str(v).strip()) for v in responses.values())
    if total_chars < 30:
        return True
    return False

def is_test(student_name):
    tl = student_name.lower()
    return 'mrwaugh' in tl or 'xoxo' in tl or 'dave' in tl or 'abba' in tl



# ─────────────────────────────────────────────────────────────────────────────
# CARD GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

QUESTION_LABELS = {
    "ans-q1-risk": "Q1 — Actuarial Bias & Prison Demographics",
    "ans-q2-trc": "Q2 — TRC Call to Action #30",
    "ans-q3-marshall": "Q3 — Donald Marshall Jr.",
    "ans-q4-gladue": "Q4 — Gladue Rights & Funding Gap",
    "ans-q5-circle": "Q5 — Sentencing Circle Design",
    "ans-q6-comparison": "Q6 — Conventional vs. Restorative Justice",
    "ans-q7-recidivism": "Q7 — Bill C-5 & Recidivism",
    "ans-q8-relations": "Q8 — Msit No'kmaq & Two Paths",
    "ans-q9-maya": "Q9 — Maya Paul Connection",
    "ans-q10-leo": "Q10 — Leo 1752 Treaty Connection",
}
IRSSA_LABELS = {
    "slide_1": "Slide 1 — IRSSA as turning point",
    "slide_2": "Slide 2 — Most critical IRSSA pillar",
    "slide_3": "Slide 3 — Shubenacadie school facts",
    "slide_4": "Slide 4 — Betty Ross / Sugar Falls",
    "slide_5": "Slide 5 — Beyond 94 stalling reasons",
    "slide_6": "Slide 6 — Regional reconciliation challenge",
}
SCOOP_LABELS = {
    "slide_1": "Slide 1 — Annie Googoo's apprehension",
    "slide_2": "Slide 2 — Indian Act status codes",
    "slide_3": "Slide 3 — How Sixties Scoop differed from residential schools",
    "slide_4": "Slide 4 — Government's justification and why it was wrong",
    "slide_5": "Slide 5 — Legacy for Maya Paul today",
    "slide_6": "Slide 6 — Connection to IRSSA and reconciliation",
}

def make_card(student_name, responses, rubric, question_keys, labels, sim_key=""):
    flagged = is_flagged(student_name, responses, sim_key)
    test = is_test(student_name)

    grade, answered, deficiency_items, strength_items = generate_feedback(
        student_name, responses, rubric, question_keys
    )

    total_q = len(question_keys)
    incomplete = (answered < total_q) and not test

    card_classes = "student-card"
    if flagged: card_classes += " flagged"
    elif incomplete: card_classes += " incomplete"
    if test: card_classes += " test-account"

    flagged_str = "true" if flagged else "false"
    incomplete_str = "true" if incomplete else "false"
    name_lower = html.escape(student_name.lower())
    name_display = html.escape(student_name)

    # Build feedback HTML
    fb_html = ""
    if deficiency_items:
        fb_html += '<div class="feedback-section"><h4>⚠ Areas Needing Improvement</h4><ul class="feedback-list">'
        fb_html += "".join(deficiency_items)
        fb_html += "</ul></div>"
    if strength_items:
        fb_html += '<div class="feedback-section"><h4>✓ Strengths</h4><ul class="feedback-list">'
        fb_html += "".join(strength_items)
        fb_html += "</ul></div>"
    if not fb_html:
        fb_html = '<div class="feedback-section"><h4>✓ Evaluation</h4><p style="color:var(--success);font-size:0.9rem;">Strong overall completion and demonstrated understanding.</p></div>'

    # Build responses detail
    resp_html = ""
    for k in question_keys:
        label = labels.get(k, k)
        text = responses.get(k, "").strip()
        if text:
            resp_html += f'<div class="question-response"><strong>{html.escape(label)}</strong>{html.escape(text)}</div>'
        else:
            resp_html += f'<div class="question-response" style="opacity:0.4;"><strong>{html.escape(label)}</strong><em>Not answered.</em></div>'

    flag_note = ""
    if flagged and not test:
        flag_note = '<div class="flag-note">⚠ FLAGGED: Response requires review — possible off-task or inappropriate content.</div>'
    if test:
        flag_note = '<div class="flag-note">🔧 TEST ACCOUNT — Teacher/system entry, not for grading.</div>'

    incomplete_badge = '<span class="incomplete-badge">⏳ INCOMPLETE</span>' if incomplete else ""
    incomplete_note = f'<div class="incomplete-note">⏳ Incomplete: only {answered}/{total_q} questions answered.</div>' if incomplete else ""

    card = f"""
        <div class="{card_classes}" data-grade="{grade}" data-name="{name_lower}" data-flagged="{flagged_str}" data-incomplete="{incomplete_str}">
            <div class="student-header">
                <span class="student-name">{name_display}{incomplete_badge}</span>
                <span class="grade-badge grade-{grade}">{grade}/5</span>
            </div>
            <div class="completeness">{answered}/{total_q} questions answered · Status: {responses.get('_status','submitted')}</div>
            {flag_note}{incomplete_note}
            {fb_html}
            <button class="toggle-responses-btn" onclick="toggleResponses(this)">Show Student Responses</button>
            <div class="student-responses-detail" style="display:none;">
                {resp_html}
            </div>
        </div>
"""
    return card, grade, flagged


# ─────────────────────────────────────────────────────────────────────────────
# FILE GENERATOR
# ─────────────────────────────────────────────────────────────────────────────
from datetime import date as dt_date

def generate_html(sim_key, block_name, title, rubric, question_keys, labels, output_file):
    block_data = data.get(sim_key, {}).get(block_name, {})
    if not block_data:
        print(f"  WARNING: No data for {sim_key} / {block_name}")
        return

    cards = []
    grades = []
    flagged_count = 0

    # Identify simple simulation identifier for flagging rules
    sim_id = ""
    if "scoop" in sim_key.lower():
        sim_id = "scoop"
    elif "irssa" in sim_key.lower():
        sim_id = "irssa"
    elif "liam" in sim_key.lower():
        sim_id = "liam"

    for student, info in block_data.items():
        if is_test(student):
            continue
        responses = dict(info.get("rationales", {}))
        responses['_status'] = info.get("status", "")
        card_html, grade, flagged = make_card(student, responses, rubric, question_keys, labels, sim_id)
        cards.append(card_html)
        grades.append(grade)
        if flagged:
            flagged_count += 1

    from collections import Counter
    gc = Counter(grades)
    total = len(grades)
    today = dt_date.today().strftime("%B %d, %Y")

    head = HTML_HEAD.format(
        title=title,
        date=today,
        total=total,
        grade5=gc.get(5,0),
        grade4=gc.get(4,0),
        grade3=gc.get(3,0),
        grade2plus1=gc.get(2,0)+gc.get(1,0),
        flagged=flagged_count,
    )

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(head)
        f.write("\n".join(cards))
        f.write(HTML_FOOT)

    print(f"  Written: {output_file} ({total} students, grades: {dict(gc)})")


# ─────────────────────────────────────────────────────────────────────────────
# MAIN — Generate all 4 files
# ─────────────────────────────────────────────────────────────────────────────
print("Generating evaluation HTML files...\n")

IRSSA_KEYS = ["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6"]
SCOOP_KEYS = ["slide_1","slide_2","slide_3","slide_4","slide_5","slide_6"]
LIAM_KEYS  = ["ans-q1-risk","ans-q2-trc","ans-q3-marshall","ans-q4-gladue",
              "ans-q5-circle","ans-q6-comparison","ans-q7-recidivism",
              "ans-q8-relations","ans-q9-maya","ans-q10-leo"]

# Justice — Restorative Justice / Liam's Journey
print("=== Justice / Liam's Journey ===")
generate_html(LIAM_KEY, "A Block (Waugh)",
    "Restorative Justice: Liam's Journey — A Block",
    LIAM_RUBRIC, LIAM_KEYS, QUESTION_LABELS,
    "gemini_justice_a_block_eval.html")

generate_html(LIAM_KEY, "C Block (Waugh)",
    "Restorative Justice: Liam's Journey — C Block",
    LIAM_RUBRIC, LIAM_KEYS, QUESTION_LABELS,
    "gemini_justice_c_block_eval.html")

# Maya Scoop — Sixties Scoop / Maya Paul
print("\n=== Sixties Scoop / Maya Paul ===")
generate_html(SCOOP_KEY, "A Block (Waugh)",
    "Sixties Scoop — Maya Paul — A Block",
    SCOOP_RUBRIC, SCOOP_KEYS, SCOOP_LABELS,
    "gemini_maya_scoop_a_block_eval.html")

generate_html(SCOOP_KEY, "C Block (Waugh)",
    "Sixties Scoop — Maya Paul — C Block",
    SCOOP_RUBRIC, SCOOP_KEYS, SCOOP_LABELS,
    "gemini_maya_scoop_c_block_eval.html")

# IRSSA — bonus files
print("\n=== IRSSA Settlement Dossier ===")
generate_html(IRSSA_KEY, "A Block (Waugh)",
    "IRSSA Settlement Dossier — A Block",
    IRSSA_RUBRIC, IRSSA_KEYS, IRSSA_LABELS,
    "gemini_irssa_a_block_eval.html")

generate_html(IRSSA_KEY, "C Block (Waugh)",
    "IRSSA Settlement Dossier — C Block",
    IRSSA_RUBRIC, IRSSA_KEYS, IRSSA_LABELS,
    "gemini_irssa_c_block_eval.html")

print("\nAll files generated.")
