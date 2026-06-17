import json, os, re

base = r"E:\Antigravity\simroom\Github Repos\projectimages\MM Studies\CurrentIssuesComp"
html_dir = os.path.join(base, "html")
sources_dir = os.path.join(html_dir, "sources")
os.makedirs(sources_dir, exist_ok=True)

with open(os.path.join(base, "extracted_content.json"), "r", encoding="utf-8") as f:
    data = json.load(f)

def clean_text(t):
    t = t.strip()
    if t == "Image":
        return ""
    return t

def make_links_clickable(text):
    url_pattern = r'(https?://[^\s<>"]+)'
    return re.sub(url_pattern, r'<a href="\1" target="_blank">\1</a>', text)

def wrap_paragraphs(paragraphs, tables=None):
    html_parts = []
    for p in paragraphs:
        t = clean_text(p["text"])
        if not t:
            continue
        t = make_links_clickable(t)
        style = p.get("style", "normal")
        if style.startswith("Heading"):
            level = style.replace("Heading ", "")
            if level.isdigit() and int(level) <= 6:
                html_parts.append(f"<h{level}>{t}</h{level}>")
            else:
                html_parts.append(f"<p><strong>{t}</strong></p>")
        else:
            if "\n" in t:
                lines = t.split("\n")
                formatted = "<br>".join(make_links_clickable(l.strip()) for l in lines if l.strip())
                html_parts.append(f"<p>{formatted}</p>")
            else:
                html_parts.append(f"<p>{t}</p>")
    if tables:
        for table in tables:
            if not table or not table[0]:
                continue
            html_parts.append('<div class="source-table"><table>')
            for i, row in enumerate(table):
                cells = "".join(f"<td>{make_links_clickable(c)}</td>" for c in row)
                if i == 0:
                    html_parts.append(f"<tr class='header'>{cells}</tr>")
                else:
                    html_parts.append(f"<tr>{cells}</tr>")
            html_parts.append("</table></div>")
    return "\n      ".join(html_parts)

def wrap_slides(slides):
    html_parts = []
    for i, slide in enumerate(slides):
        texts = [clean_text(t) for t in slide if clean_text(t)]
        if not texts:
            continue
        html_parts.append(f'<div class="slide">')
        html_parts.append(f'  <div class="slide-num">Slide {i+1}</div>')
        for t in texts:
            t = make_links_clickable(t)
            if "\n" in t:
                lines = t.split("\n")
                formatted = "<br>".join(make_links_clickable(l.strip()) for l in lines if l.strip())
                html_parts.append(f"  <p>{formatted}</p>")
            else:
                html_parts.append(f"  <p>{t}</p>")
        html_parts.append(f'</div>')
    return "\n      ".join(html_parts)

def wrap_pages(pages):
    html_parts = []
    for i, page in enumerate(pages):
        if not page.strip():
            continue
        lines = page.split("\n")
        html_parts.append(f'<div class="pdf-page">')
        html_parts.append(f'  <div class="page-num">Page {i+1}</div>')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            line = make_links_clickable(line)
            if line.isupper() and len(line) > 3:
                html_parts.append(f"  <h3>{line}</h3>")
            elif re.match(r'^Section \d+', line):
                html_parts.append(f"  <h3>{line}</h3>")
            elif re.match(r'^[•￭]', line):
                html_parts.append(f"  <p class='bullet'>{line}</p>")
            else:
                html_parts.append(f"  <p>{line}</p>")
        html_parts.append(f'</div>')
    return "\n      ".join(html_parts)

SOURCE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600&display=swap');
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{
    font-family: 'Open Sans', sans-serif;
    background: #f8f5f0;
    color: #2C2C2C;
    line-height: 1.8;
  }}
  .header {{
    background: {color};
    color: #fff;
    padding: 2rem;
    text-align: center;
  }}
  .header h1 {{
    font-family: 'Merriweather', serif;
    font-size: 1.6rem;
    margin-bottom: 0.3rem;
  }}
  .header .src {{
    font-size: 0.85rem;
    opacity: 0.8;
  }}
  .back {{
    display: inline-block;
    margin: 1rem 2rem;
    color: {link_color};
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
  }}
  .back:hover {{ text-decoration: underline; }}
  .content {{
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem 1.5rem 3rem;
  }}
  .content h2 {{
    font-family: 'Merriweather', serif;
    color: {link_color};
    margin: 1.5rem 0 0.5rem;
    font-size: 1.3rem;
  }}
  .content h3 {{
    color: #6B6560;
    margin: 1.2rem 0 0.4rem;
    font-size: 1.05rem;
  }}
  .content p {{
    margin: 0.6rem 0;
    font-size: 0.95rem;
  }}
  .content a {{
    color: {link_color};
  }}
  .content .bullet {{
    padding-left: 1.5rem;
    text-indent: -0.8rem;
  }}
  .slide {{
    background: #fff;
    border-radius: 8px;
    padding: 1.2rem 1.5rem;
    margin: 1rem 0;
    border-left: 4px solid {link_color};
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }}
  .slide .slide-num {{
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.5rem;
  }}
  .pdf-page {{
    background: #fff;
    border-radius: 8px;
    padding: 1.5rem;
    margin: 1rem 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    border-top: 3px solid {link_color};
  }}
  .pdf-page .page-num {{
    font-size: 0.75rem;
    color: #999;
    margin-bottom: 0.5rem;
  }}
  .source-table {{
    overflow-x: auto;
    margin: 1rem 0;
  }}
  .source-table table {{
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  }}
  .source-table td {{
    padding: 0.5rem 0.8rem;
    border-bottom: 1px solid #eee;
    font-size: 0.9rem;
    vertical-align: top;
  }}
  .source-table tr.header td {{
    background: {color};
    color: #fff;
    font-weight: 600;
  }}
  footer {{
    text-align: center;
    padding: 2rem;
    color: #999;
    font-size: 0.8rem;
    border-top: 1px solid #ddd;
  }}
</style>
</head>
<body>
<div class="header">
  <h1>{title}</h1>
  <div class="src">Original Source Document</div>
</div>
<a href="{back}" class="back">&larr; Back to issue page</a>
<div class="content">
      {content}
</div>
<footer>Mi'kmaw Studies — Current Issues</footer>
</body>
</html>"""

source_pages = {}

# Issue 1 sources
for key in ["1. a Inquiry into Murdered and Missing Indigenous Women.pptx",
            "1. b The Inquiry into Missing and Murdered Aboriginal Women_ Answers.docx",
            "1. d Missing and Murdered Aboriginal Women in Canada.docx"]:
    d = data[key]
    if "slides" in d:
        content = wrap_slides(d["slides"])
    else:
        content = wrap_paragraphs(d["paragraphs"], d.get("tables"))
    slug = key.split(" ", 1)[0] + "-" + re.sub(r'[^a-z0-9]+', '-', key.lower())[4:].strip("-")[:40]
    slug = slug.replace(".", "")
    fname = f"src-{slug}.html"
    title = key.split(". ", 1)[1].split(".")[0] if ". " in key else key.replace(".docx","").replace(".pptx","")
    html = SOURCE_TEMPLATE.format(title=title, color="#8B2252", link_color="#8B2252",
                                   back="../issue1-mmiwg.html", content=content)
    with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
        f.write(html)
    source_pages[key] = f"sources/{fname}"

# Issue 3 sources
for key in ["3. a Uncontacted Tribes.docx", "3. c Elon Musk brings Internet to Remote Tribes.docx"]:
    d = data[key]
    if "slides" in d:
        content = wrap_slides(d["slides"])
    else:
        content = wrap_paragraphs(d["paragraphs"], d.get("tables"))
    slug = re.sub(r'[^a-z0-9]+', '-', key.lower()).strip("-")[:50]
    fname = f"src-{slug}.html"
    title = key.split(". ", 1)[1].split(".")[0] if ". " in key else key.replace(".docx","")
    html = SOURCE_TEMPLATE.format(title=title, color="#2D6A4F", link_color="#2D6A4F",
                                   back="../issue3-uncontacted-tribes.html", content=content)
    with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
        f.write(html)
    source_pages[key] = f"sources/{fname}"

# Issue 4 sources
for key in ["4. a Change has started\u2013How have things been changing for the better in Mi\u2019kmaw Communities.docx"]:
    d = data[key]
    content = wrap_paragraphs(d["paragraphs"], d.get("tables"))
    slug = "4a-change-has-started"
    fname = f"src-{slug}.html"
    title = "Change Has Started — Positive Change in Mi'kmaw Communities"
    html = SOURCE_TEMPLATE.format(title=title, color="#1A7A6D", link_color="#1A7A6D",
                                   back="../issue4-positive-change.html", content=content)
    with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
        f.write(html)
    source_pages[key] = f"sources/{fname}"

# Issue 5 sources
for key in ["5. a True Story_  2 Part Video.docx",
            "5. f Pocahontas Myth.doc.docx",
            "5. g The Pocahontas Myth Answers.docx",
            "5. h The Pocahontas Myth Questions.docx",
            "Positives and Negatives Highlights from Pocahontas.docx",
            "Reel Injun Questions.doc.docx",
            "The Real Story of Pocahontas.docx"]:
    d = data[key]
    if "slides" in d:
        content = wrap_slides(d["slides"])
    else:
        content = wrap_paragraphs(d["paragraphs"], d.get("tables"))
    slug = re.sub(r'[^a-z0-9]+', '-', key.lower()).strip("-")[:50]
    fname = f"src-{slug}.html"
    if ". " in key:
        title = key.split(". ", 1)[1].rsplit(".", 1)[0]
    else:
        title = key.rsplit(".", 1)[0]
    html = SOURCE_TEMPLATE.format(title=title, color="#6A3D7D", link_color="#6A3D7D",
                                   back="../issue5-pocahontas-media.html", content=content)
    with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
        f.write(html)
    source_pages[key] = f"sources/{fname}"

# Issue 5 PDF (Treaty Education)
key = "5. b High School Supplementary Resource Material for Treaty Education April 28.pdf"
d = data[key]
content = wrap_pages(d["pages"])
slug = "5b-treaty-education"
fname = f"src-{slug}.html"
title = "Treaty Education — Supplementary Resource Material"
html = SOURCE_TEMPLATE.format(title=title, color="#6A3D7D", link_color="#6A3D7D",
                               back="../issue5-pocahontas-media.html", content=content)
with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
    f.write(html)
source_pages[key] = f"sources/{fname}"

# Issue 7 sources
for key in ["7. a First Nations in the News Today.docx", "7. b In the News\u2026.docx"]:
    d = data[key]
    content = wrap_paragraphs(d["paragraphs"], d.get("tables"))
    slug = re.sub(r'[^a-z0-9]+', '-', key.lower()).strip("-")[:50]
    fname = f"src-{slug}.html"
    title = key.split(". ", 1)[1].split(".")[0] if ". " in key else key.replace(".docx","")
    html = SOURCE_TEMPLATE.format(title=title, color="#1565C0", link_color="#1565C0",
                                   back="../issue7-news-un-declaration.html", content=content)
    with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
        f.write(html)
    source_pages[key] = f"sources/{fname}"

key = "7. c UN Declaration on the Rights of Indigenous Peoples.pdf"
d = data[key]
content = wrap_pages(d["pages"])
slug = "7c-undrip"
fname = f"src-{slug}.html"
title = "UN Declaration on the Rights of Indigenous Peoples (UNDRIP)"
html = SOURCE_TEMPLATE.format(title=title, color="#1565C0", link_color="#1565C0",
                               back="../issue7-news-un-declaration.html", content=content)
with open(os.path.join(sources_dir, fname), "w", encoding="utf-8") as f:
    f.write(html)
source_pages[key] = f"sources/{fname}"

# Save mapping
with open(os.path.join(base, "source_mapping.json"), "w", encoding="utf-8") as f:
    json.dump(source_pages, f, ensure_ascii=False, indent=2)

print(f"Created {len(source_pages)} source HTML pages in {sources_dir}")
for k, v in source_pages.items():
    print(f"  {k} -> {v}")
