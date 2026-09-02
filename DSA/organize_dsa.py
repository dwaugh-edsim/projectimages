import os

base_dir = r"Z:\simroom\DSA"
files_dir = os.path.join(base_dir, "files")

modules = [
    {
        "dir": "01_Class_Culture_and_Climate",
        "title": "Class Culture and Climate",
        "desc": "Back-to-school community-building activities, classroom norms, anchor charts, and icebreakers.",
        "files": ["Anchor_Chart_Assignment", "Classroom_Counter_Assignment", "Ice_Breaker_Games_Assignment", "Icebreaker_Word_Art_Assignment"],
        "links": [
            ("Class Culture Survey (Google Form)", "https://forms.gle/smZwVgYK8YKXQFdr5")
        ]
    },
    {
        "dir": "02_My_Interests",
        "title": "My Interests",
        "desc": "Exploration of student passions, hobbies, and personal strengths.",
        "files": ["Interests_Assignment"],
        "links": [
            ("How to Make a Copy Guide (Google Drive)", "https://drive.google.com/file/d/15O1MPp4pyl2ShfxjN40PMxWOGj0bZREC/view?usp=sharing")
        ]
    },
    {
        "dir": "03_My_Values",
        "title": "My Values",
        "desc": "Values badge assignment identifying core student ethics, priorities, and character strengths.",
        "files": ["DSA_Student_Values_Badge_Assignment"],
        "links": [
            ("How to Make a Copy Guide (Google Drive)", "https://drive.google.com/file/d/15O1MPp4pyl2ShfxjN40PMxWOGj0bZREC/view?usp=sharing")
        ]
    },
    {
        "dir": "04_My_Attention",
        "title": "My Attention",
        "desc": "Attention audit, focus management, screen time awareness, and mindfulness.",
        "files": ["Attention_Assignment"],
        "links": [
            ("How to Make a Copy Guide (Google Drive)", "https://drive.google.com/file/d/15O1MPp4pyl2ShfxjN40PMxWOGj0bZREC/view?usp=sharing")
        ]
    },
    {
        "dir": "05_My_Resume",
        "title": "My Resume (Middle School Edition)",
        "desc": "Middle school resume building personal history, skills, volunteer work, and leadership.",
        "files": ["My_Resume_Assignment_Middle_School"],
        "links": [
            ("How to Make a Copy Guide (Google Drive)", "https://drive.google.com/file/d/15O1MPp4pyl2ShfxjN40PMxWOGj0bZREC/view?usp=sharing")
        ]
    },
    {
        "dir": "06_My_School_Club_Proposal",
        "title": "My School Club Proposal",
        "desc": "Civic agency project where students draft, pitch, and organize a middle school club.",
        "files": ["My_School_Club_Proposal"],
        "links": [
            ("How to Make a Copy Guide (Google Drive)", "https://drive.google.com/file/d/15O1MPp4pyl2ShfxjN40PMxWOGj0bZREC/view?usp=sharing")
        ]
    },
    {
        "dir": "07_DSA_Student_Council",
        "title": "DSA Student Council Leadership Projects",
        "desc": "Four major Integrated Learning Block service projects: Caring Buddies, Breakfast Club, Intramurals, and School Spirit.",
        "files": ["Caring_Buddies_Assignment", "Breakfast_Club_Community_Service_Project", "Intramural_League_Assignment", "Community_Exploration_School_Spirit_Project"],
        "links": [
            ("Student Council Overview (Ziteboard)", "https://view.ziteboard.com/shared/42385804106611")
        ]
    },
    {
        "dir": "08_DSA_Mapping_Challenge",
        "title": "DSA Mapping Challenge (Minecraft & GIS)",
        "desc": "Spatial exploration project connecting school mapping to Minecraft Monday build challenges.",
        "files": ["DSA_Mapping_Challenge_Assignment"],
        "links": [
            ("Pre-Activity Check-In (Google Form)", "https://docs.google.com/forms/d/e/1FAIpQLSdQ7oQY2MUzLcwjZm8xtBaWNhwhmIFcP6ysP6MxbwSQxmZ2nQ/viewform"),
            ("Past Projects Gallery (Google Site)", "https://sites.google.com/gnspes.ca/buccisminecraftmonday/dsa-mapping-challenge?authuser=0")
        ]
    },
    {
        "dir": "09_Questioning_and_ICA",
        "title": "Questioning & Inquiry-Based Learning (ICA)",
        "desc": "Framework for formulating driving inquiry questions and the Century Project.",
        "files": ["Questioning_and_ICA_Presentation", "Century_Project_Assignment"],
        "links": [
            ("Questioning ICA (Google Form)", "https://forms.gle/kDoLdoHG54kmqvWt6")
        ]
    },
    {
        "dir": "10_Unit_Guide_and_Rubrics",
        "title": "Unit Guide & Assessment Rubrics",
        "desc": "Master unit syllabus, competency breakdown, and Mr. Bucci's marking rubric.",
        "files": ["Welcome_Back_Grade_8_Unit_Guide", "Buccis_Marking_Rubric"],
        "links": []
    },
    {
        "dir": "11_Kayak_Corner",
        "title": "Kayak Corner (Canadian History Comics & Quizzes)",
        "desc": "Reading comprehension and historical inquiry using Canada's History Kayak comics.",
        "files": [],
        "links": [
            ("Kayak Corner Quiz (Google Form)", "https://forms.gle/pmiFoR8n3jTd1Czu7")
        ]
    }
]

# Generate Master README.md
master_readme = """# DSA (Dartmouth South Academy) — Welcome Back 8s Hub

> **Source:** Cloned from Ryan Bucci's Grade 8 Social Studies & Integrated Learning Site (`bucciswelcomeback8s`).
> **Structure:** 11 curriculum modules containing full lesson guides, assignment templates, marking rubrics, and direct links to Google Forms / interactive resources.

---

## Curriculum Modules Index

| # | Module | Core Focus / Major Assignments | Formats Available |
|---|--------|--------------------------------|-------------------|
| 01 | [Class Culture & Climate](01_Class_Culture_and_Climate/README.md) | Class Culture Survey, Anchor Charts, Classroom Counter, Icebreakers, Word Art | PDF, DOCX, TXT, Form |
| 02 | [My Interests](02_My_Interests/README.md) | Student passion mapping & interest audit | PDF, DOCX, TXT |
| 03 | [My Values](03_My_Values/README.md) | DSA Student Values Badge Assignment & character strengths | PDF, DOCX, TXT |
| 04 | [My Attention](04_My_Attention/README.md) | Attention audit, digital wellness & focus management | PDF, DOCX, TXT |
| 05 | [My Resume](05_My_Resume/README.md) | Middle School Edition resume building & self-reflection | PDF, DOCX, TXT |
| 06 | [My School Club Proposal](06_My_School_Club_Proposal/README.md) | Civic initiative & school club design project | PDF, DOCX, TXT |
| 07 | [DSA Student Council](07_DSA_Student_Council/README.md) | 4 Service Projects: Caring Buddies, Breakfast Club, Intramurals, School Spirit | PDF, DOCX, TXT, Ziteboard |
| 08 | [DSA Mapping Challenge](08_DSA_Mapping_Challenge/README.md) | School geography, spatial mapping & Minecraft Monday integration | PDF, DOCX, TXT, Form |
| 09 | [Questioning & ICA](09_Questioning_and_ICA/README.md) | Inquiry questions framework & Century Project assignment | PDF, PPTX, DOCX, Form |
| 10 | [Unit Guide & Rubrics](10_Unit_Guide_and_Rubrics/README.md) | Welcome Back Unit Guide & Bucci's Holistic Marking Rubric | PDF, DOCX, TXT |
| 11 | [Kayak Corner](11_Kayak_Corner/README.md) | Canada's History Kayak magazine reading & comprehension quizzes | Form |

---

## Resource Directory

All raw exported files (Word `.docx`, Acrobat `.pdf`, PowerPoint `.pptx`, and plaintext `.txt`) are archived in the [`files/`](files/) directory.
"""

with open(os.path.join(base_dir, "README.md"), "w", encoding="utf-8") as f:
    f.write(master_readme)

# Generate Module READMEs
for mod in modules:
    mod_path = os.path.join(base_dir, mod["dir"])
    os.makedirs(mod_path, exist_ok=True)
    
    readme_content = f"# {mod['title']}\n\n{mod['desc']}\n\n---\n\n## Assignments & Documents\n"
    if mod["files"]:
        for file_name in mod["files"]:
            txt_file = os.path.join(files_dir, file_name + ".txt")
            txt_content = ""
            if os.path.exists(txt_file):
                with open(txt_file, "r", encoding="utf-8", errors="ignore") as tf:
                    txt_content = tf.read().strip()
            
            clean_name = file_name.replace("_", " ")
            readme_content += f"\n### {clean_name}\n"
            readme_content += f"- **Downloads:** [`{file_name}.pdf`](../files/{file_name}.pdf) | [`{file_name}.docx`](../files/{file_name}.docx)\n"
            if os.path.exists(os.path.join(files_dir, file_name + ".pptx")):
                readme_content += f"- **Slide Deck:** [`{file_name}.pptx`](../files/{file_name}.pptx)\n"
            if txt_content:
                readme_content += f"\n#### Assignment Instructions / Content:\n```text\n{txt_content}\n```\n"
    else:
        readme_content += "\n*No document files attached for this module.*\n"
        
    if mod["links"]:
        readme_content += "\n---\n\n## Online Forms & External Resources\n"
        for l_title, l_url in mod["links"]:
            readme_content += f"- [{l_title}]({l_url})\n"
            
    with open(os.path.join(mod_path, "README.md"), "w", encoding="utf-8") as rf:
        rf.write(readme_content)

print("DSA site clone and directory organization completed successfully!")
