import os
import re
import json

# Define base paths
BASE_DIR = r"E:\Antigravity\simroom\Github Repos\projectimages\Cit9\Country-Profile-Project"
CONVERTED_DIR = os.path.join(BASE_DIR, "Student-work-June18version", "converted")
DATA_FILE = os.path.join(CONVERTED_DIR, "extracted_data.js")
OUTPUT_FILE = os.path.join(CONVERTED_DIR, "prefilled_evaluations.js")

def evaluate_submission(sub):
    # Base text corpus
    text_blocks = []
    if sub["type"] == "pptx":
        for slide in sub["slides"]:
            if slide["title"]:
                text_blocks.append(slide["title"])
            if slide["text"]:
                text_blocks.extend(slide["text"])
    else:
        text_blocks.extend(sub["paragraphs"])
        
    full_text = " ".join(text_blocks)
    text_lower = full_text.lower()
    
    # Initialize scores and checks
    scores = {"intro": 1, "actions": 1, "consequences": 1, "canada": 1, "reflection": 1}
    check_citations = False
    check_visuals = True # Default to true, will disable if dense
    
    # Empty state / template checks
    if len(text_lower.strip()) < 50 or "placeholder" in text_lower or ("1. clear introduction" in text_lower and "2. analysis of actions" in text_lower):
        # Return Level 1 for everything as it's an empty template
        return {
            "scores": {"intro": 1, "actions": 1, "consequences": 1, "canada": 1, "reflection": 1},
            "checkCitations": False,
            "checkVisuals": False,
            "praise": "<strong>What's looking great:</strong><br>\n• The slide layout is initialized and ready for your content.",
            "nextSteps": "<strong>Next steps to focus on:</strong>\n<ul>\n  <li><strong>Replace template placeholders:</strong> This file currently contains empty template instructions. Replace all text and shapes with your own research.</li>\n  <li><strong>Add content:</strong> Research your country and selected global issue to complete slides 2-6.</li>\n</ul>"
        }

    # 1. Evaluate Introduction & Issue
    intro_keywords = ["geography", "location", "border", "population", "language", "culture", "capital", "map", "gdp", "economic", "g7", "polynesian", "history"]
    issue_keywords = ["issue", "global", "crisis", "problem", "affect", "million", "percent", "severity", "trend", "famine", "deforestation", "wildfire", "surveillance", "rights", "war", "poverty", "inequality"]
    
    intro_count = sum(1 for kw in intro_keywords if kw in text_lower)
    issue_count = sum(1 for kw in issue_keywords if kw in text_lower)
    
    if intro_count >= 4 and issue_count >= 3:
        scores["intro"] = 4
    elif intro_count >= 2 and issue_count >= 2:
        scores["intro"] = 3
    elif intro_count >= 1 or issue_count >= 1:
        scores["intro"] = 2
    else:
        scores["intro"] = 1
        
    # 2. Evaluate Actions & Evidence
    actions_keywords = ["government", "policy", "response", "actions", "law", "regulation", "act", "protocol", "accord", "treaty", "agreement", "investment", "ban", "initiative", "agency", "un", "united nations", "sign", "ratify", "ban", "funding", "effort", "enforce"]
    actions_count = sum(1 for kw in actions_keywords if kw in text_lower)
    
    if actions_count >= 5:
        scores["actions"] = 4
    elif actions_count >= 3:
        scores["actions"] = 3
    elif actions_count >= 1:
        scores["actions"] = 2
    else:
        scores["actions"] = 1
        
    # 3. Evaluate Consequences
    conseq_keywords = ["consequence", "intended", "unintended", "effect", "impact", "result", "outcome", "short-term", "long-term", "positive", "negative", "benefit", "suffer", "harm", "damage", "loss"]
    conseq_count = sum(1 for kw in conseq_keywords if kw in text_lower)
    
    has_type = ("intended" in text_lower or "unintended" in text_lower or "result" in text_lower or "outcome" in text_lower)
    has_time = ("short" in text_lower or "long" in text_lower or "effect" in text_lower or "impact" in text_lower)
    
    if has_type and has_time and conseq_count >= 5:
        scores["consequences"] = 4
    elif conseq_count >= 3:
        scores["consequences"] = 3
    elif conseq_count >= 1:
        scores["consequences"] = 2
    else:
        scores["consequences"] = 1
        
    # 4. Evaluate Canada Comparison
    canada_keywords = ["canada", "canadian", "ottawa", "trudeau", "province", "comparison", "compare", "similar", "different", "difference", "contrast", "indigenous", "trc"]
    canada_count = sum(1 for kw in canada_keywords if kw in text_lower)
    
    if "canada" in text_lower or "canadian" in text_lower:
        if any(kw in text_lower for kw in ["compare", "comparison", "similar", "different", "difference", "contrast"]):
            if canada_count >= 4:
                scores["canada"] = 4
            else:
                scores["canada"] = 3
        else:
            scores["canada"] = 2
    else:
        scores["canada"] = 1
        
    # 5. Evaluate Reflection
    reflect_keywords = ["care", "should care", "canadians", "reflection", "moral", "global citizen", "responsibility", "duty", "learn", "future", "affect", "connection"]
    reflect_count = sum(1 for kw in reflect_keywords if kw in text_lower)
    
    if "care" in text_lower or "reflection" in text_lower:
        if "canadian" in text_lower or "canadians" in text_lower:
            if reflect_count >= 4:
                scores["reflection"] = 4
            else:
                scores["reflection"] = 3
        else:
            scores["reflection"] = 2
    else:
        scores["reflection"] = 1
        
    # 6. Evaluate Citations
    citation_markers = ["http", "www", "cited", "sources", "references", "bibliography", "retrieved", "accessed", "website", ".com", ".org", ".gov", ".edu"]
    cite_count = sum(1 for marker in citation_markers if marker in text_lower)
    parenthetical_cites = len(re.findall(r'\(\d{4}\)', text_lower))
    
    if cite_count >= 3 or parenthetical_cites >= 2:
        check_citations = True
        
    # 7. Evaluate Visual Layout (Text Density)
    words = full_text.split()
    avg_words_per_slide = len(words) / len(sub["slides"]) if sub["type"] == "pptx" and len(sub["slides"]) > 0 else 0
    if sub["type"] == "pptx" and (avg_words_per_slide > 120 or len(sub["slides"]) > 20):
        # 39 slides (like Evie) or very dense text indicates too much clutter
        check_visuals = False
    elif sub["type"] == "docx" and len(words) > 1500:
        check_visuals = False

    # Draft Praise and Next Steps based on these auto-scores
    praise_points = []
    step_points = []
    
    if scores["intro"] >= 3:
        praise_points.append(f"Excellent work setting up your country background for {sub['country']}. The introduction to {sub['issue']} clearly establishes the global context.")
    else:
        step_points.append(f"<strong>Flesh out your country introduction:</strong> Introduce basic facts about {sub['country']} (location, language, culture) and define {sub['issue']} clearly on slide 2.")

    if scores["actions"] >= 3:
        praise_points.append("Your analysis of the government's response or lack of response is clear and supported by specific policies.")
    else:
        step_points.append("<strong>Detail government actions:</strong> Research exactly what policies, laws, or programs the government has implemented to respond to the issue.")

    if scores["consequences"] >= 3:
        praise_points.append("You did a solid job identifying intended and unintended consequences, along with short and long-term impacts.")
    else:
        step_points.append("<strong>Analyze consequences:</strong> Clearly separate intended results from unintended side-effects. Who suffers or benefits from these choices?")

    if scores["canada"] >= 3:
        praise_points.append("The comparison to Canada's actions is well-integrated and draws clear similarities or differences.")
    else:
        step_points.append("<strong>Add Canada comparison:</strong> Dedicate slides to compare how Canada is handling this same global issue relative to your selected country.")

    if scores["reflection"] >= 3:
        praise_points.append("Your reflection slide is thoughtful and provides a clear argument on why Canadians should care.")
    else:
        step_points.append("<strong>Develop your reflection:</strong> Make sure you clearly explain why everyday Canadians should care about this global issue (shared climate, moral duty, trade connections).")

    if check_citations:
        praise_points.append("Sources are cited correctly and credibility is high.")
    else:
        step_points.append("<strong>APA Citations:</strong> Add at least 2 credible sources formatted in proper APA style at the bottom of each slide.")

    if check_visuals:
        praise_points.append("Slides are formatted cleanly with concise bullet points and good visual organization.")
    else:
        step_points.append("<strong>Condense text and slides:</strong> Avoid giant paragraphs of text. Break them into brief bullet points and make sure to prune any template leftover slides.")

    # Combine
    praise_html = "<strong>What's looking great:</strong><br>\n" + "\n".join(f"• {p}" for p in praise_points)
    next_steps_html = "<strong>Next steps to focus on:</strong>\n<ul>\n" + "\n".join(f"  <li>{s}</li>" for s in step_points) + "\n</ul>"
    
    return {
        "scores": scores,
        "checkCitations": check_citations,
        "checkVisuals": check_visuals,
        "praise": praise_html,
        "nextSteps": next_steps_html
    }

def main():
    if not os.path.exists(DATA_FILE):
        print(f"Error: Database file not found at {DATA_FILE}")
        return

    print("Loading student submissions data...")
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        js_content = f.read()
        
    json_str = js_content.replace("// Automatically generated by convert_submissions.py\nconst studentSubmissions = ", "").rstrip(";\n")
    submissions = json.loads(json_str)
    
    prefilled = {}
    print("Evaluating submissions...")
    for sub in submissions:
        filename = sub["filename"]
        result = evaluate_submission(sub)
        prefilled[filename] = result
        print(f"  - Evaluated: {filename} (Calculated Level: {sum(result['scores'].values())/5:.1f})")
        
    # Write to prefilled_evaluations.js
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"// Automatically pre-filled evaluations\nconst prefilledEvaluations = {json.dumps(prefilled, indent=4)};\n")
        
    print(f"\nEvaluations pre-filled successfully! Written to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
