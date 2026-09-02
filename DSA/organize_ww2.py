import os

ww2_base = r"Z:\simroom\DSA\WW2_Unit"
files_dir = os.path.join(ww2_base, "files")

modules = [
    {
        "dir": "01_Module_1_WW1_Review",
        "title": "Module 1: World War 1 Review",
        "desc": "Review of the causes, warfare, and key takeaways of WW1 before diving into WW2. Features paragraph-writing practice and political cartoon analysis.",
        "files": ["WW1_Review_Assignment", "WW1_Review_Quizzes_List"],
        "links": [
            ("Political Cartoon Virtual Exhibit (CoSpaces VR)", "https://edu.cospaces.io/KSV-EMS"),
            ("Exit Slip Activity (Google Form)", "https://forms.gle/srej4M7WTKL14GN16")
        ]
    },
    {
        "dir": "02_Module_2_Propaganda_and_Timelines",
        "title": "Module 2: Propaganda & WW2 Timelines",
        "desc": "Exploration of wartime propaganda techniques, timeline mapping, and creating an original wartime propaganda poster.",
        "files": ["Propaganda_Poster_Assignment"],
        "links": [
            ("Module 2 Quiz (Google Form)", "https://forms.gle/9r2yg5F1r1H9uw4G8"),
            ("Primary Source Quiz (Google Form)", "https://forms.gle/xJXw1m3XAs5re3yt5"),
            ("Primary Source VR Game (CoSpaces)", "https://edu.cospaces.io/TMK-VVS"),
            ("Poster ICA (Google Form)", "https://forms.gle/tPBYqvs3BCaAR5ya9"),
            ("Instructional Video: Propaganda Poster Assignment (Drive Video)", "https://drive.google.com/file/d/1Jt8Lemspiq6ynZy0TKBEAWW4a5q8fpDe/preview?authuser=0")
        ]
    },
    {
        "dir": "03_Module_3_Canada_at_War_and_Victoria_Cross",
        "title": "Module 3: Canada at War & The Victoria Cross",
        "desc": "Examining Canada's declaration of war, mobilization, and researching Canadian Victoria Cross heroes across WW1 and WW2.",
        "files": ["Victoria_Cross_Information_Slides", "Victoria_Cross_Webquest_Assignment"],
        "links": [
            ("Student Quiz: Canada at War (Google Form)", "https://forms.gle/VfHEvmVugRGtALqP9"),
            ("John Francis Young Check-In (Google Form)", "https://forms.gle/bwMDCYvCybhGZNyx9"),
            ("Instructional Video: Victoria Cross Assignment (Drive Video)", "https://drive.google.com/file/d/1cffTSY2V9GDurv-jCk6VV5JSoi_6SFR3/preview?authuser=0")
        ]
    },
    {
        "dir": "04_Module_4_Economic_Impact_and_Battle_of_France",
        "title": "Module 4: Economic Impact & The Battle of France",
        "desc": "Analysis of wartime industrial production, victory bonds, rationing, and the rapid fall of France in 1940.",
        "files": [],
        "links": [
            ("Student Quiz: Economic Impact (Google Form)", "https://forms.gle/4JBDog4GwxV57kkz7"),
            ("Module 4 Exit Slip (Google Form)", "https://forms.gle/MENxpJcsFWzQS9jt7")
        ]
    },
    {
        "dir": "05_Module_5_War_Measures_Act_and_Battle_of_Britain",
        "title": "Module 5: War Measures Act & The Battle of Britain",
        "desc": "Canadian civil liberties under the War Measures Act, internment camps, and the pivotal aerial Battle of Britain.",
        "files": [],
        "links": [
            ("Student Quiz: War Measures Act (Google Form)", "https://forms.gle/DeFW44uDXQyAVKLP8"),
            ("Module 5 Exit Slip (Google Form)", "https://forms.gle/7z2Lj85vM4ha2j3M6"),
            ("Instructional Video: Battle of Britain Breakdown (Drive Video)", "https://drive.google.com/file/d/1L5pvM26twQKDOVQQwzNDx2ocNVPgS-85/preview?authuser=0")
        ]
    },
    {
        "dir": "06_Class_Notes_and_Frontlines",
        "title": "Class Notes & The Four Frontlines",
        "desc": "Interactive whiteboards, recorded lesson videos, and formative exit slips for four major campaign areas.",
        "files": [],
        "links": [
            ("Section 1: Battle of France Whiteboard (Ziteboard)", "https://view.ziteboard.com/shared/54252163802613"),
            ("Section 1 Exit Slip (Google Form)", "https://forms.gle/CJNhHeRg9F7ziDd39"),
            ("Section 1 Lesson Video", "https://drive.google.com/file/d/1PpokbZRdev2tdgknC7P062Ek0lPz-pfa/preview?authuser=0"),
            ("Section 2: Battle of Britain Whiteboard (Ziteboard)", "https://view.ziteboard.com/shared/44504763802612"),
            ("Section 2 Exit Slip (Google Form)", "https://forms.gle/SkiXVoqYwj3owEFk6"),
            ("Section 2 Lesson Video", "https://drive.google.com/file/d/1L5pvM26twQKDOVQQwzNDx2ocNVPgS-85/preview?authuser=0"),
            ("Section 3: Eastern & Italian Fronts Whiteboard (Ziteboard)", "https://view.ziteboard.com/shared/21709473312614"),
            ("Section 3 Exit Slip (Google Form)", "https://forms.gle/M6LbUGqp1cJbto7C7"),
            ("Section 4: D-Day & Normandy Whiteboard (Ziteboard)", "https://view.ziteboard.com/shared/04185295325618"),
            ("Section 4 Exit Slip (Google Form)", "https://forms.gle/w1CZZzgDm4AmjwSL7")
        ]
    },
    {
        "dir": "07_Primary_Source_Analysis",
        "title": "Primary Source Analysis Assignment",
        "desc": "Slide-based critical evaluation of primary source artifacts, photographs, and documents from WW2.",
        "files": ["Primary_Source_Analysis_Assignment"],
        "links": []
    },
    {
        "dir": "08_Unit_Case_Study",
        "title": "Unit Case Study Template",
        "desc": "Summative case study framework synthesizing the social, political, and military impacts of WW2.",
        "files": ["WW2_Unit_Case_Study_Template"],
        "links": []
    },
    {
        "dir": "09_WW2_Research_Essay",
        "title": "WW2 Research Essay (5-Paragraph Framework)",
        "desc": "Complete scaffolded essay-writing sequence: topic brainstorming, 5-paragraph organizer, student exemplar (Jordan's essay), intro/conclusion tips, and Victoria Cross sample essay.",
        "files": [
            "WW2_Research_Essay_Assignment",
            "Brainstorming_Topic_Slides",
            "Five_Paragraph_Essay_Organizer_Slides",
            "Jordan_Example_5_Paragraph_Essay_Slides",
            "Intro_Conclusion_Tips_Slides",
            "Victoria_Cross_Essay_Sample"
        ],
        "links": [
            ("Video Walkthrough: How to Use 5 Paragraph Essay Template", "https://drive.google.com/file/d/1hUsr87M_NrRNkpzbCpcMl9FOr_0HQ8CM/preview?authuser=0")
        ]
    },
    {
        "dir": "10_Assessment_Island_and_Virtual_Galleries",
        "title": "Assessment Island & CoSpaces Virtual Galleries",
        "desc": "Gamified 3D virtual assessment worlds where students navigate 3D environments to solve historical challenges.",
        "files": [],
        "links": [
            ("Propaganda Posters VR Gallery (CoSpaces)", "https://edu.cospaces.io/CHG-FWZ"),
            ("Propaganda Posters Gallery Exit Slip (Google Form)", "https://forms.gle/qAcvRMZSkFn6mFsP9"),
            ("Assessment Island: Propaganda Posters (CoSpaces)", "https://edu.cospaces.io/TMK-VVS"),
            ("Assessment Island: Canada's Women's 150 (CoSpaces)", "https://edu.cospaces.io/BHK-SQA"),
            ("Assessment Island: Letter of Notification (CoSpaces)", "https://edu.cospaces.io/HGX-SJE")
        ]
    }
]

# Write WW2 Master README.md
master_readme = """# World War 2 Curriculum Hub — Mr. Bucci's Unit

> **Source:** Cloned from Ryan Bucci's Grade 8/9 Social Studies World War 2 Site (`bucciww2`).
> **Reference Text:** *Duncan, Ian. World War 2. Edited by Jill Colyer, Rubicon, 2021.*
> **Structure:** 10 curriculum modules containing structured assignments, 5-paragraph research essay scaffolds, 3D CoSpaces virtual exhibits, video walkthroughs, and Google Forms exit slips.

---

## Unit Modules Index

| # | Module | Core Topics / Key Deliverables | Formats Available |
|---|--------|--------------------------------|-------------------|
| 01 | [Module 1: WW1 Review](01_Module_1_WW1_Review/README.md) | WW1 review paragraph assignment, quiz index, CoSpaces political cartoon gallery | PDF, DOCX, TXT, Form, CoSpaces |
| 02 | [Module 2: Propaganda & Timelines](02_Module_2_Propaganda_and_Timelines/README.md) | Propaganda poster assignment, ICA form, primary source VR obstacle quiz, timeline | PDF, DOCX, TXT, Forms, Video |
| 03 | [Module 3: Canada at War & Victoria Cross](03_Module_3_Canada_at_War_and_Victoria_Cross/README.md) | Victoria Cross slide presentation & webquest assignment, Canada at War quiz | PDF, PPTX, DOCX, TXT, Form, Video |
| 04 | [Module 4: Economic Impact & France](04_Module_4_Economic_Impact_and_Battle_of_France/README.md) | Industrial production, rationing, victory bonds, Battle of France | Forms |
| 05 | [Module 5: War Measures Act & Britain](05_Module_5_War_Measures_Act_and_Battle_of_Britain/README.md) | Civil liberties, internment, Battle of Britain video analysis | Forms, Video |
| 06 | [Class Notes & Frontlines](06_Class_Notes_and_Frontlines/README.md) | Ziteboard interactive whiteboards & lesson videos for France, Britain, Eastern/Italian fronts, D-Day | Ziteboard, Video, Forms |
| 07 | [Primary Source Analysis](07_Primary_Source_Analysis/README.md) | Primary source artifact analysis template slide deck | PDF, PPTX |
| 08 | [Unit Case Study](08_Unit_Case_Study/README.md) | Summative unit case study synthesis template | PDF, DOCX, TXT |
| 09 | [WW2 Research Essay](09_WW2_Research_Essay/README.md) | 5-part essay scaffold: brainstorming, organizer slides, exemplar deck, writing tips, sample VC essay | PDF, PPTX, DOCX, TXT, Video |
| 10 | [Assessment Island & VR Galleries](10_Assessment_Island_and_Virtual_Galleries/README.md) | Gamified 3D virtual assessment worlds & student poster showcase | CoSpaces VR, Forms |

---

## Local Files Directory

All exported Word documents (`.docx`), Acrobat PDFs (`.pdf`), PowerPoint slide decks (`.pptx`), and plaintext files (`.txt`) are stored in [`files/`](files/).
"""

with open(os.path.join(ww2_base, "README.md"), "w", encoding="utf-8") as f:
    f.write(master_readme)

# Write each module's README.md
for mod in modules:
    mod_path = os.path.join(ww2_base, mod["dir"])
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
            readme_content += f"- **Downloads:** [`{file_name}.pdf`](../files/{file_name}.pdf)"
            if os.path.exists(os.path.join(files_dir, file_name + ".docx")):
                readme_content += f" | [`{file_name}.docx`](../files/{file_name}.docx)"
            if os.path.exists(os.path.join(files_dir, file_name + ".pptx")):
                readme_content += f" | [`{file_name}.pptx`](../files/{file_name}.pptx)"
            readme_content += "\n"
            
            if txt_content:
                readme_content += f"\n#### Document Content Preview:\n```text\n{txt_content}\n```\n"
    else:
        readme_content += "\n*No document files attached for this module.*\n"
        
    if mod["links"]:
        readme_content += "\n---\n\n## Online Forms, Videos & External Resources\n"
        for l_title, l_url in mod["links"]:
            readme_content += f"- [{l_title}]({l_url})\n"
            
    with open(os.path.join(mod_path, "README.md"), "w", encoding="utf-8") as rf:
        rf.write(readme_content)

print("WW2 Unit folders and READMEs generated successfully!")
