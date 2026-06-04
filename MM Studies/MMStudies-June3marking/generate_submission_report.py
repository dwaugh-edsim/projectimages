import json
import re
from collections import defaultdict

# Read student database
with open('extracted_submissions.json', encoding='utf-8') as f:
    data = json.load(f)

# Resolve keys (handling any unicode issues in simulation names)
def find_key(d, fragment):
    for k in d:
        if fragment.lower() in k.lower():
            return k
    return None

irssa_key = find_key(data, 'IRSSA')
scoop_key = find_key(data, 'Sixties')
liam_key = find_key(data, 'Liam')

LIAM_QUESTIONS = [
    'ans-q1-risk', 'ans-q2-trc', 'ans-q3-marshall', 'ans-q4-gladue',
    'ans-q5-circle', 'ans-q6-comparison', 'ans-q7-recidivism',
    'ans-q8-relations', 'ans-q9-maya', 'ans-q10-leo'
]
SLIDE_QUESTIONS = ['slide_1', 'slide_2', 'slide_3', 'slide_4', 'slide_5', 'slide_6']

def base_name(s):
    return re.sub(r'\s*\(.*?\)', '', s).strip().lower()

def is_placeholder_pin(s):
    return 'abcd' in s.lower()

def get_preferred_name(variants):
    # Filter out placeholders
    reals = [v for v in variants if not is_placeholder_pin(v)]
    if reals:
        # Prefer the one with standard casing / longest or first
        return sorted(reals, key=len)[-1]
    return sorted(variants, key=len)[-1]

# Collect all students per block and their variants
block_students = defaultdict(lambda: defaultdict(list))
for sim_key in [irssa_key, scoop_key, liam_key]:
    if not sim_key:
        continue
    for block_key, students in data[sim_key].items():
        b = 'A' if 'a block' in block_key.lower() else 'C'
        for s in students.keys():
            if s == "MRWAUGH (XOXO)" or base_name(s) == "dave" or base_name(s) == "mrwaugh": # Exclude test accounts
                continue
            bname = base_name(s)
            if s not in block_students[b][bname]:
                block_students[b][bname].append(s)

# For each block, construct row data
report_data = {}

for block in ['A', 'C']:
    students_in_block = []
    
    # Sort students alphabetically by base name
    for bname in sorted(block_students[block].keys()):
        variants = block_students[block][bname]
        pref_name = get_preferred_name(variants)
        
        # Get details for each simulation
        sim_statuses = {}
        for sim_name, sim_key, questions in [
            ('IRSSA', irssa_key, SLIDE_QUESTIONS),
            ('Scoop', scoop_key, SLIDE_QUESTIONS),
            ('Liam', liam_key, LIAM_QUESTIONS)
        ]:
            if not sim_key:
                sim_statuses[sim_name] = {'answered': 0, 'total': len(questions), 'status': 'Missing'}
                continue
                
            # Find which variant was used in this simulation
            block_full_key = None
            for bk in data[sim_key]:
                bk_clean = 'A' if 'a block' in bk.lower() else 'C'
                if bk_clean == block:
                    block_full_key = bk
                    break
            
            sub_info = None
            matched_variant = None
            if block_full_key:
                for k, info in data[sim_key][block_full_key].items():
                    if base_name(k) == bname:
                        sub_info = info
                        matched_variant = k
                        break
            
            if sub_info:
                r = sub_info['rationales']
                answered = sum(1 for q in questions if str(r.get(q, '')).strip())
                status = 'Missing'
                if answered == len(questions):
                    status = 'Completed'
                elif answered > 0:
                    status = 'In Progress'
                sim_statuses[sim_name] = {
                    'answered': answered,
                    'total': len(questions),
                    'status': status,
                    'variant': matched_variant
                }
            else:
                sim_statuses[sim_name] = {
                    'answered': 0,
                    'total': len(questions),
                    'status': 'Missing'
                }
        
        # Sourcing / verification notes
        notes = []
        # Check if aliases were used
        used_variants = set()
        for k, v in sim_statuses.items():
            if 'variant' in v:
                used_variants.add(v['variant'])
        
        if len(used_variants) > 1:
            notes.append(f"Submissions found under aliases: {', '.join(sorted(used_variants))}")
        
        # Check missing details
        missing_details = []
        for name, v in sim_statuses.items():
            if v['status'] == 'In Progress':
                missing_details.append(f"{name}: {v['answered']}/{v['total']}")
            elif v['status'] == 'Missing':
                missing_details.append(f"{name}: Missing")
                
        if not missing_details:
            notes.append("All core elements successfully completed.")
        else:
            if len(missing_details) == 3:
                notes.append("All core elements missing.")
            else:
                notes.append(", ".join(missing_details))
                
        students_in_block.append({
            'name': pref_name,
            'bname': bname,
            'variants': variants,
            'statuses': sim_statuses,
            'notes': " | ".join(notes)
        })
        
    report_data[block] = students_in_block

# Find students with all elements missing
all_missing = {'A': [], 'C': []}
for block in ['A', 'C']:
    for s in report_data[block]:
        missing_count = sum(1 for k, v in s['statuses'].items() if v['status'] == 'Missing')
        if missing_count == 3:
            all_missing[block].append(s['name'])

# Now let's generate HTML
html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="MM Studies student database submission status report for Block A and Block C.">
    <title>MM Studies | Student Submission Status Report</title>
    <style>
        :root {{
            --text-color: #000000;
            --bg-color: #ffffff;
            --border-color: #000000;
            --gray-light: #f2f2f2;
            --gray-dark: #333333;
            --amber-bg: #fffbeb;
            --amber-border: #d97706;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: var(--text-color);
            background-color: var(--bg-color);
            line-height: 1.3;
            font-size: 11px;
            padding: 12px 18px;
        }}

        .report-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 6px;
            margin-bottom: 12px;
        }}

        .header-title-area {{
            flex-grow: 1;
        }}

        .report-header h1 {{
            font-size: 16px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }}

        .report-header p {{
            font-size: 10px;
            color: var(--gray-dark);
            text-transform: uppercase;
            font-weight: 600;
        }}

        .btn-toggle {{
            background: #000;
            color: #fff;
            border: 1px solid var(--border-color);
            padding: 5px 12px;
            font-size: 9.5px;
            text-transform: uppercase;
            font-weight: 700;
            cursor: pointer;
            border-radius: 3px;
            transition: all 0.2s ease;
        }}

        .btn-toggle:hover {{
            background: #333;
        }}

        .blocks-container {{
            display: flex;
            gap: 20px;
            width: 100%;
            align-items: flex-start;
        }}

        .block-column {{
            flex: 1;
            min-width: 0;
        }}

        .block-title {{
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 3px;
            margin-bottom: 8px;
            background-color: var(--gray-light);
            padding: 3px 6px;
        }}

        .missing-box {{
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            margin-bottom: 10px;
            background-color: var(--gray-light);
        }}

        .missing-box h2 {{
            font-size: 10.5px;
            text-transform: uppercase;
            margin-bottom: 3px;
            display: flex;
            align-items: center;
            gap: 5px;
        }}

        .missing-box ul {{
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            font-weight: bold;
            font-size: 10.5px;
        }}

        .missing-box li::before {{
            content: "• ";
        }}

        .table-container {{
            width: 100%;
            margin-bottom: 10px;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }}

        th, td {{
            border: 1px solid var(--border-color);
            padding: 4px 6px;
            vertical-align: middle;
            transition: all 0.15s ease;
        }}

        th {{
            background-color: var(--gray-light);
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
        }}

        .center {{
            text-align: center;
        }}

        .student-name {{
            font-weight: 700;
            white-space: nowrap;
            font-size: 11px;
        }}

        .status-badge {{
            font-size: 9px;
            text-transform: uppercase;
            font-weight: 700;
            display: inline-block;
        }}

        .status-missing {{
            text-decoration: underline;
            color: #b91c1c;
        }}

        .status-progress {{
            color: #d97706;
        }}

        .status-complete {{
            color: #15803d;
        }}

        .notes-cell {{
            font-size: 9px;
            color: #4b5563;
        }}

        .report-footer {{
            margin-top: 15px;
            text-align: center;
            font-size: 8.5px;
            color: var(--gray-dark);
            border-top: 1px dashed var(--border-color);
            padding-top: 6px;
        }}

        /* HIDING NOTES CLASS EFFECTS */
        .hide-notes .notes-col,
        .hide-notes .notes-cell {{
            display: none !important;
        }}

        .hide-notes th,
        .hide-notes td {{
            padding: 6px 10px; /* larger padding */
        }}

        .hide-notes .student-name {{
            font-size: 12px;
        }}

        .hide-notes .status-badge {{
            font-size: 10.5px;
        }}

        .hide-notes th {{
            font-size: 11.5px;
        }}

        .hide-notes .block-title {{
            font-size: 14.5px;
            padding: 5px 8px;
        }}

        @media print {{
            body {{
                padding: 0;
                margin: 0;
            }}
            tr {{
                page-break-inside: avoid;
            }}
            .btn-toggle {{
                display: none;
            }}
        }}
    </style>
</head>
<body class="hide-notes"> <!-- Hidden by default to maximize display size -->

    <main class="report-container">
        
        <!-- Header Section -->
        <header class="report-header">
            <div class="header-title-area">
                <h1>Mi'kmaw &amp; Indigenous Studies: Submission Status Report</h1>
                <p>Classroom LCD Status Board • June 4, 2026</p>
            </div>
            <button id="btnToggle" class="btn-toggle" onclick="toggleNotes()">Show Notes Column</button>
        </header>

        <!-- Side-by-Side Blocks -->
        <div class="blocks-container">
"""

for block in ['A', 'C']:
    missing_list_html = ""
    if all_missing[block]:
        missing_list_html = f"""
            <section class="missing-box">
                <h2>⚠️ All 3 Core Elements Missing</h2>
                <ul>
                    {"".join(f"<li>{name}</li>" for name in all_missing[block])}
                </ul>
            </section>
        """
        
    rows_html = []
    for s in report_data[block]:
        # Status cells
        cells = []
        for sim_name in ['IRSSA', 'Scoop', 'Liam']:
            status_info = s['statuses'][sim_name]
            ans = status_info['answered']
            tot = status_info['total']
            stat = status_info['status']
            
            if stat == 'Completed':
                cells.append(f'<td class="center"><span class="status-badge status-complete">Complete ({ans}/{tot})</span></td>')
            elif stat == 'In Progress':
                cells.append(f'<td class="center"><span class="status-badge status-progress">Partial ({ans}/{tot})</span></td>')
            else:
                cells.append(f'<td class="center"><span class="status-badge status-missing">Missing</span></td>')
                
        row = f"""
                    <tr>
                        <td class="student-name">{s['name']}</td>
                        {cells[0]}
                        {cells[1]}
                        {cells[2]}
                        <td class="notes-cell">{s['notes']}</td>
                    </tr>"""
        rows_html.append(row)

    html_content += f"""
            <!-- Block {block} Column -->
            <div class="block-column">
                <h2 class="block-title">Block {block} (Waugh)</h2>
                {missing_list_html}
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 30%;">Student Name</th>
                                <th class="center" style="width: 23%;">IRSSA Dossier</th>
                                <th class="center" style="width: 23%;">Sixties Scoop</th>
                                <th class="center" style="width: 24%;">Liam's Journey</th>
                                <th class="notes-col" style="width: 40%;">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {"".join(rows_html)}
                        </tbody>
                    </table>
                </div>
            </div>
    """

html_content += """
        </div>

        <!-- Footer Section -->
        <footer class="report-footer">
            Mi'kmaw &amp; Indigenous Studies 11 • Outcome Evidence Status • June 4, 2026
        </footer>

    </main>

    <script>
        function toggleNotes() {
            const body = document.body;
            const btn = document.getElementById('btnToggle');
            if (body.classList.contains('hide-notes')) {
                body.classList.remove('hide-notes');
                btn.textContent = 'Hide Notes Column';
            } else {
                body.classList.add('hide-notes');
                btn.textContent = 'Show Notes Column';
            }
        }
    </script>

</body>
</html>
"""

# Write out file
with open('submission_status_report.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Generated submission_status_report.html successfully!")
