import csv
from datetime import datetime

file_path = r'c:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Independentprojects\Copy of Independent Project Brainstorm and Planning (Responses) - Form Responses 1.csv'

def parse_date(date_str):
    return datetime.strptime(date_str, '%m/%d/%Y %H:%M:%S')

submissions = {}

with open(file_path, mode='r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        email = row['Email Address'].strip().lower()
        timestamp = parse_date(row['Timestamp'])
        
        if email not in submissions or timestamp > submissions[email]['timestamp']:
            row['timestamp'] = timestamp
            submissions[email] = row

# Sort by name for the report
sorted_submissions = sorted(submissions.values(), key=lambda x: x['Name'])

report = "# Mi'kmaw Studies 11 - Independent Project Appraisal\n\n"
report += "## Appraisal of Student Proposals (De-duplicated)\n\n"
report += "| Student Name | Project Type | Topic/Idea | Idea Strength | Plan Clarity | Flags/Notes |\n"
report += "| :--- | :--- | :--- | :--- | :--- | :--- |\n"

for s in sorted_submissions:
    name = s['Name']
    p_type = s['What kind of project?']
    topic = s['Proposed Independent Project']
    steps = f"{s['Project Steps: Step 1 (Required)']} | {s['Project Steps: Step 2 (Required)']} | {s['Project Steps: Step 3 (Required)']}"
    
    # Check for vagueness in Art Piece
    flag = ""
    is_art = "B. Creative Art Piece" in p_type or "Other" in p_type
    
    # Criteria for vague: No specific subject mentioned in topic or steps
    vague_keywords = ["painting", "drawing", "artwork", "art piece", "project", "creative"]
    topic_lower = topic.lower()
    
    is_vague = False
    if is_art:
        # If the topic is just "painting" or "making a project" without a subject
        if len(topic.split()) < 4 and any(word in topic_lower for word in vague_keywords):
            is_vague = True
        # Special check for Caleb Chandler case
        if "A painting with a few paragraphs" in topic:
            is_vague = True
            
    if is_vague:
        flag = "⚠️ **Vague Topic:** Painting/Art mentioned but subject is not specified."
    
    # Strength/Clarity Logic (Heuristic)
    strength = "Strong" if len(topic) > 30 else "Moderate"
    if is_vague: strength = "Weak (Vague)"
    
    clarity = "Detailed" if len(steps) > 100 else "Standard"
    if "gain research" in steps.lower() and len(steps) < 50: clarity = "Generic"

    report += f"| {name} | {p_type[:15]}... | {topic[:50]}... | {strength} | {clarity} | {flag} |\n"

with open(r'c:\Antigravity\simroom\Github Repos\projectimages\MM Studies\Independentprojects\independent_project_appraisal.md', 'w', encoding='utf-8') as f:
    f.write(report)

print("Report generated.")
