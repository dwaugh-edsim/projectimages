#!/usr/bin/env python3
"""Process March 30 CSV data and generate HTML results and Markdown summary."""

import csv
import json
import re
from datetime import datetime
from pathlib import Path

# Correct answers for matching (from debrief_assignment.html items array)
CORRECT_MATCHES = {
    "Barter": "Trading a power bank directly for a box of tissues without using any money.",
    "Double Coincidence of Wants": "Failing to trade because you have cards but the other person needs tissues, and neither of you wants what the other has.",
    "Medium of Exchange": "Using gold coins to buy an apple instead of having to find a specific trade partner who wants your spare staples.",
    "Scarcity": "The fundamental problem that there wasn't enough bread printed for everyone in the room to finish their mission cards.",
    "Shortage": "The situation after the 'drought' where the sudden removal of wheat meant many students couldn't find any, despite having the money.",
    "Inflation": "A general rise in prices across the room because Mr Waugh injected more cash into the system.",
    "Deflation": "Prices for bookmarks dropping because Mr Waugh only had 29 gold coins and couldn't afford to pay the original price.",
    "Liquidity": "Mr Waugh randomly dropping extra dollar bills onto students' desks to increase the amount of cash available for trading.",
    "Monopoly": "The 'Dead' students in the graveyard being the only ones left with wheat and charging whatever they wanted because there was no competition.",
    "Specialization": "One student focusing only on cutting paper while another focused only on taping to increase their total output of bookmarks.",
    "Division of Labor": "Breaking the bookmark-making process into a 'factory line' where each person performed one specific task.",
    "Incentives": "Students forming 'corporations' because they realized they could earn more gold coins by working together than as individuals.",
    "Rational Self-Interest": "Students focusing solely on completing their own mission cards to 'survive,' regardless of how it impacted the rest of the market.",
    "The Invisible Hand": "Prices for bread and wheat adjusting naturally based on student demand after the drought, without Mr Waugh setting a price.",
    "Competition": "The 'Artisan' student producing a single high-quality bookmark while the 'Corporation' next to him produced ten faster, forcing everyone to consider price vs. quality."
}

# Definition keywords for grading
DEFINITION_KEY = {
    "Barter": ["trade", "exchange", "goods", "services", "money", "direct", "swap"],
    "Double Coincidence of Wants": ["both", "want", "each other", "mutual", "trade", "match"],
    "Medium of Exchange": ["used", "buying", "selling", "easier", "standard", "value"],
    "Scarcity": ["limited", "unlimited", "resources", "wants", "fundamental", "problem"],
    "Shortage": ["temporary", "not enough", "available", "demand", "supply"],
    "Inflation": ["prices", "increase", "rise", "general", "purchasing", "fall"],
    "Deflation": ["decrease", "prices", "general", "fall", "drop"],
    "Liquidity": ["quickly", "easily", "asset", "cash", "spent", "convert"],
    "Monopoly": ["one", "complete", "control", "product", "service", "market"],
    "Specialization": ["focusing", "specific", "task", "skill", "efficient", "expert"],
    "Division of Labor": ["breaking", "smaller", "parts", "different", "people", "steps"],
    "Incentives": ["motivate", "act", "reward", "punishment", "behavior"],
    "Rational Self-Interest": ["choices", "benefit", "best", "outcome", "decision"],
    "The Invisible Hand": ["natural", "balance", "without", "rules", "government", "control"],
    "Competition": ["multiple", "sellers", "buyers", "same", "customers", "market"]
}


def compare_matches(student: str, correct: str) -> bool:
    """Lenient comparison - normalizes text before comparing."""
    if not student and not correct:
        return True
    if not student or not correct:
        return False
    
    def normalize(s: str) -> str:
        # Remove trailing punctuation
        s = re.sub(r'[.,!?;:]+$', '', s.lower())
        # Normalize multiple spaces
        s = re.sub(r'\s+', ' ', s)
        # Accept either "Mr Waugh" or "Prof Smith" (teacher name variations)
        s = re.sub(r'\b(professor|prof|mr|mr\.?)\s+smith\b', 'mr waugh', s, flags=re.IGNORECASE)
        return s.strip()
    
    return normalize(student) == normalize(correct)


def grade_definition(term: str, definition: str) -> dict:
    """Grade definition quality using keyword matching."""
    if not definition or definition.strip() == '':
        return {'score': 0, 'maxScore': 3, 'feedback': 'No definition provided'}
    
    def_lower = definition.lower()
    keywords = DEFINITION_KEY.get(term, [])
    match_count = sum(1 for kw in keywords if kw.lower() in def_lower)
    
    score = min(3, int((match_count / len(keywords)) * 4)) if keywords else 0
    quality = 'good' if score >= 3 else ('partial' if score >= 2 else 'weak')
    
    return {
        'score': score,
        'maxScore': 3,
        'quality': quality,
        'keywordMatches': match_count,
        'totalKeywords': len(keywords),
        'feedback': 'Good definition with key concepts' if score >= 3 else ('Partial understanding' if score >= 2 else 'Needs more detail')
    }


def parse_csv(csv_content: str) -> dict:
    """Parse CSV file and extract student data."""
    students = {}
    
    # Use csv module to properly handle quoted fields
    reader = csv.reader(csv_content.strip().split('\n'))
    header = next(reader)  # Skip header
    
    for row in reader:
        if len(row) < 4:
            continue
        
        timestamp = row[0]
        pin = row[1]
        name = row[2]
        responses_json = row[3]
        
        # Skip rows where name looks like response data (malformed rows)
        if name in CORRECT_MATCHES.values() or 'Trading' in name or 'Using' in name:
            continue
        
        try:
            responses = json.loads(responses_json)
            
            if name not in students:
                students[name] = {'pin': pin, 'name': name, 'responses': {}}
            
            # Update with latest responses for each term
            for resp in responses:
                if isinstance(resp, dict) and 'term' in resp:
                    students[name]['responses'][resp['term']] = {
                        'definition': resp.get('definition', ''),
                        'match': resp.get('match', '')
                    }
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON for {name}: {e}")
    
    return students


def grade_student(student: dict) -> dict:
    """Grade a student's submission."""
    term_results = []
    correct_count = 0
    definitions = []
    
    for term, correct_match in CORRECT_MATCHES.items():
        response = student['responses'].get(term, {'definition': '', 'match': ''})
        student_match = response.get('match', '')
        definition = response.get('definition', '')
        
        is_correct = compare_matches(student_match, correct_match)
        is_empty = not student_match or student_match.strip() == ''
        
        if is_correct:
            correct_count += 1
        
        term_results.append({
            'term': term,
            'studentMatch': student_match,
            'correctMatch': correct_match,
            'isCorrect': is_correct,
            'isEmpty': is_empty,
            'definition': definition
        })
        
        # Grade definition
        def_grade = grade_definition(term, definition)
        definitions.append({
            'term': term,
            'definition': definition,
            **def_grade
        })
    
    status = 'complete' if correct_count == 15 else ('partial' if correct_count >= 10 else 'incomplete')
    
    return {
        'name': student['name'],
        'pin': student['pin'],
        'correctMatches': correct_count,
        'status': status,
        'termResults': term_results,
        'definitions': definitions,
        'definitionCount': sum(1 for d in definitions if d['definition'].strip())
    }


def generate_html_results(students_data: list) -> str:
    """Generate HTML results page."""
    now = datetime.now()
    date = now.strftime('%b %d, %Y')
    time = now.strftime('%I:%M %p %Z')
    iso_timestamp = now.isoformat()
    
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Adam Smith Market Project - Debrief Results ({date})</title>
    <meta name="last-updated" content="{iso_timestamp}">
    <style>
        :root {{
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --secondary: #f59e0b;
            --success: #10b981;
            --error: #ef4444;
            --bg: #0f172a;
            --card: #1e293b;
            --text: #f8fafc;
            --text-dim: #94a3b8;
        }}
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            padding: 20px;
            line-height: 1.6;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        header {{
            text-align: center;
            padding: 30px 0;
            border-bottom: 2px solid var(--primary);
            margin-bottom: 30px;
        }}
        h1 {{ color: var(--primary); font-size: 2rem; margin-bottom: 10px; }}
        .subtitle {{ 
            color: var(--text-dim); 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            gap: 10px;
            flex-wrap: wrap;
        }}
        .freshness-badge {{
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }}
        .freshness-badge::before {{
            content: '✓';
            display: inline-block;
        }}
        
        .student-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }}
        .student-card {{
            background: var(--card);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
        }}
        .student-card:hover {{ transform: translateY(-3px); border-color: var(--primary); }}
        .student-card.complete {{ border-left: 4px solid var(--success); }}
        .student-card.partial {{ border-left: 4px solid var(--secondary); }}
        .student-card.incomplete {{ border-left: 4px solid var(--error); }}
        
        .student-name {{ font-weight: bold; font-size: 1.1rem; margin-bottom: 10px; }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
        }}
        .status-badge.complete {{ background: var(--success); }}
        .status-badge.partial {{ background: var(--secondary); }}
        .status-badge.incomplete {{ background: var(--error); }}
        
        .modal-overlay {{
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            overflow-y: auto;
            padding: 40px 20px;
        }}
        .modal-overlay.active {{ display: block; }}
        .modal {{
            background: var(--card);
            max-width: 1000px;
            margin: 0 auto;
            border-radius: 12px;
            padding: 30px;
            position: relative;
        }}
        .modal-close {{
            position: absolute;
            top: 15px; right: 20px;
            font-size: 2rem;
            cursor: pointer;
            color: var(--text-dim);
        }}
        .modal-close:hover {{ color: var(--text); }}
        
        .results-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        .results-table th, .results-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .results-table th {{ background: rgba(0,0,0,0.2); color: var(--primary); }}
        .status-correct {{ color: var(--success); font-weight: bold; }}
        .status-incorrect {{ color: var(--error); font-weight: bold; }}
        .status-empty {{ color: var(--text-dim); }}
        
        .todo-section {{
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid var(--error);
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }}
        .todo-section h4 {{ color: var(--error); margin-bottom: 10px; }}
        .todo-section ul {{ margin-left: 20px; }}
        .todo-section li {{ margin-bottom: 5px; color: var(--text-dim); }}
        
        .pin-input-section {{
            text-align: center;
            padding: 40px;
        }}
        .pin-input {{
            font-size: 2rem;
            padding: 15px;
            width: 200px;
            text-align: center;
            border: 2px solid var(--primary);
            border-radius: 8px;
            background: var(--card);
            color: var(--text);
            margin-bottom: 20px;
        }}
        .pin-btn {{
            background: var(--primary);
            color: white;
            padding: 15px 40px;
            border: none;
            border-radius: 8px;
            font-size: 1.2rem;
            cursor: pointer;
        }}
        .pin-btn:hover {{ background: var(--primary-dark); }}
        
        .results-view {{ display: none; }}
        .results-view.active {{ display: block; }}
        
        .back-btn {{
            background: transparent;
            border: 2px solid var(--primary);
            color: var(--primary);
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 20px;
        }}
        .back-btn:hover {{ background: var(--primary); color: white; }}
        
        .definition-table {{ margin-top: 20px; }}
        .def-good {{ color: var(--success); }}
        .def-partial {{ color: var(--secondary); }}
        .def-weak {{ color: var(--error); }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Adam Smith Market Project - Debrief Results</h1>
            <p class="subtitle">
                <span>Generated: {date} at {time}</span>
                <span class="freshness-badge">Fresh Data</span>
            </p>
        </header>
        
        <div class="pin-input-section" id="pinSection">
            <h2 style="margin-bottom: 20px;">Enter Your PIN to View Results</h2>
            <input type="text" class="pin-input" id="pinInput" placeholder="Enter PIN" maxlength="10">
            <br>
            <button class="pin-btn" onclick="checkPIN()">View My Results</button>
            <p id="pinError" style="color: var(--error); margin-top: 15px; display: none;">PIN not found. Please check and try again.</p>
        </div>
        
        <div class="results-view" id="resultsView">
            <button class="back-btn" onclick="showPINSection()">← Back to PIN Entry</button>
            <div id="resultsContent"></div>
        </div>
    </div>
    
    <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
        <div class="modal" onclick="event.stopPropagation()">
            <span class="modal-close" onclick="closeModal()">&times;</span>
            <div id="modalContent"></div>
        </div>
    </div>

    <script>
        const students = {json.dumps(students_data)};
        
        function checkPIN() {{
            const pin = document.getElementById('pinInput').value.trim();
            const student = students.find(s => s.pin === pin);
            
            if (!student) {{
                document.getElementById('pinError').style.display = 'block';
                return;
            }}
            
            document.getElementById('pinSection').style.display = 'none';
            document.getElementById('resultsView').classList.add('active');
            
            const incompleteTerms = student.termResults.filter(r => !r.isCorrect && !r.isEmpty);
            const emptyTerms = student.termResults.filter(r => r.isEmpty);
            
            let todoHtml = '';
            if (incompleteTerms.length > 0 || emptyTerms.length > 0) {{
                todoHtml = `
                    <div class="todo-section" id="todo-section">
                        <h4>⚠️ TODO - Incomplete Work</h4>
                        <ul>
                            ${{incompleteTerms.map(r => `<li><strong>${{r.term}}</strong> - Your match was incorrect</li>`).join('')}}
                            ${{emptyTerms.map(r => `<li><strong>${{r.term}}</strong> - No answer provided</li>`).join('')}}
                        </ul>
                    </div>
                `;
            }}
            
            document.getElementById('resultsContent').innerHTML = `
                <h2 style="color: var(--primary);">Results for: ${{student.name}}</h2>
                <p style="color: var(--text-dim); margin: 10px 0 30px;">PIN: ${{student.pin}}</p>
                
                <div style="display: flex; gap: 30px; margin-bottom: 30px;">
                    <div style="text-align: center; padding: 20px; background: var(--card); border-radius: 12px; flex: 1;">
                        <div style="font-size: 3rem; color: ${{student.correctMatches === 15 ? 'var(--success)' : 'var(--error)'}};">${{student.correctMatches}}/15</div>
                        <div style="color: var(--text-dim);">Correct Matches</div>
                    </div>
                    <div style="text-align: center; padding: 20px; background: var(--card); border-radius: 12px; flex: 1;">
                        <div style="font-size: 3rem; color: var(--secondary);">${{student.definitionCount}}/15</div>
                        <div style="color: var(--text-dim);">Definitions Written</div>
                    </div>
                </div>
                
                <h3 style="margin-bottom: 15px;">Detailed Results</h3>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Your Answer</th>
                            <th>Correct Answer</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${{student.termResults.map(r => `
                            <tr>
                                <td><strong>${{r.term}}</strong></td>
                                <td style="${{r.isEmpty ? 'color: var(--text-dim); font-style: italic;' : ''}}">${{r.isEmpty ? '(no answer)' : escapeHtml(r.studentMatch)}}</td>
                                <td>${{escapeHtml(r.correctMatch)}}</td>
                                <td class="${{r.isEmpty ? 'status-empty' : (r.isCorrect ? 'status-correct' : 'status-incorrect')}}">
                                    ${{r.isEmpty ? 'Empty' : (r.isCorrect ? '✓ Correct' : '✗ Incorrect')}}
                                </td>
                            </tr>
                        `).join('')}}
                    </tbody>
                </table>
                
                <h3 style="margin-bottom: 15px; margin-top: 25px;">Definition Quality</h3>
                <table class="results-table definition-table">
                    <thead>
                        <tr>
                            <th>Term</th>
                            <th>Your Definition</th>
                            <th>Quality</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${{student.definitions.map(d => `
                            <tr>
                                <td><strong>${{d.term}}</strong></td>
                                <td style="${{!d.definition ? 'color: var(--text-dim); font-style: italic;' : ''}}">${{d.definition ? escapeHtml(d.definition) : '(no definition)'}}</td>
                                <td class="${{d.quality === 'good' ? 'def-good' : (d.quality === 'partial' ? 'def-partial' : 'def-weak')}}">
                                    ${{d.quality === 'good' ? '✓ Good' : (d.quality === 'partial' ? '~ Partial' : '✗ Weak')}}
                                </td>
                            </tr>
                        `).join('')}}
                    </tbody>
                </table>
                
                ${{todoHtml}}
            `;
        }}
        
        function showPINSection() {{
            document.getElementById('pinSection').style.display = 'block';
            document.getElementById('resultsView').classList.remove('active');
            document.getElementById('pinError').style.display = 'none';
        }}
        
        function escapeHtml(text) {{
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }}
        
        function closeModal(event) {{
            if (!event || event.target === document.getElementById('modalOverlay')) {{
                document.getElementById('modalOverlay').classList.remove('active');
            }}
        }}
    </script>
</body>
</html>'''


def generate_markdown_summary(students_data: list) -> str:
    """Generate Markdown summary."""
    now = datetime.now()
    date = now.strftime('%b %d, %Y')
    
    md = f"# Student Marking Results - March 30, {now.year}\n\n"
    md += f"**Generated:** {date}\n\n"
    md += "---\n\n"
    
    # Summary stats
    total = len(students_data)
    complete = sum(1 for s in students_data if s['status'] == 'complete')
    partial = sum(1 for s in students_data if s['status'] == 'partial')
    incomplete = sum(1 for s in students_data if s['status'] == 'incomplete')
    
    md += "## Summary\n\n"
    md += "| Metric | Count |\n|--------|-------|\n"
    md += f"| Total Students | {total} |\n"
    md += f"| Complete (15/15) | {complete} |\n"
    md += f"| Partial (10-14/15) | {partial} |\n"
    md += f"| Incomplete (<10/15) | {incomplete} |\n\n"
    
    # Individual results
    md += "## Individual Results\n\n"
    md += "| Student Name | PIN | Score | Status | Definitions |\n"
    md += "|--------------|-----|-------|--------|-------------|\n"
    
    for student in students_data:
        md += f"| {student['name']} | {student['pin']} | {student['correctMatches']}/15 | {student['status']} | {student['definitionCount']}/15 |\n"
    
    return md


def main():
    """Main function."""
    base_dir = Path(__file__).parent.parent
    csv_path = base_dir / 'adam debrief  mAR 30 3pm- Debriefs.csv'
    output_html = base_dir / 'answerresults.html'
    output_md = base_dir / 'markingresults3-30.md'
    
    print('Processing March 30 CSV data...')
    print(f'Reading: {csv_path}')
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        csv_content = f.read()
    
    students = parse_csv(csv_content)
    print(f'Found {len(students)} students')
    
    graded_students = [grade_student(s) for s in students.values()]
    
    # Generate HTML
    html = generate_html_results(graded_students)
    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Generated: {output_html}')
    
    # Generate Markdown
    md = generate_markdown_summary(graded_students)
    with open(output_md, 'w', encoding='utf-8') as f:
        f.write(md)
    print(f'Generated: {output_md}')
    
    # Print summary
    complete = sum(1 for s in graded_students if s['status'] == 'complete')
    partial = sum(1 for s in graded_students if s['status'] == 'partial')
    incomplete = sum(1 for s in graded_students if s['status'] == 'incomplete')
    
    print('\n=== Summary ===')
    print(f'Total: {len(graded_students)}')
    print(f'Complete: {complete}')
    print(f'Partial: {partial}')
    print(f'Incomplete: {incomplete}')


if __name__ == '__main__':
    main()
