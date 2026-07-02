import os
import re
import json
import win32com.client
import sys

# Define base paths
BASE_DIR = r"E:\Antigravity\simroom\Github Repos\projectimages\Cit9\Country-Profile-Project"
STUDENT_DIR = os.path.join(BASE_DIR, "Student work June 19 version")
OUTPUT_DIR = os.path.join(STUDENT_DIR, "converted")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Parse dashboard topics and claims
def parse_dashboard():
    dashboard_path = os.path.join(BASE_DIR, "country_profile_dashboard.html")
    if not os.path.exists(dashboard_path):
        print(f"Error: Dashboard not found at {dashboard_path}")
        return [], {}
        
    with open(dashboard_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Match topics
    topics_list = []
    matches = re.findall(r'id:\s*(\d+),\s*country:\s*"(.*?)",\s*issue:\s*"(.*?)",\s*questions:\s*"(.*?)"', content)
    for m in matches:
        topics_list.append({
            "id": int(m[0]),
            "country": m[1],
            "issue": m[2],
            "questions": m[3]
        })
        
    # Match claimed topics
    claimed_topics = {}
    claimed_match = re.search(r"const claimedTopics = \{(.*?)\};", content, re.DOTALL)
    if claimed_match:
        claimed_raw = claimed_match.group(1)
        matches_claims = re.findall(r'(\d+):\s*"(.*?)"', claimed_raw)
        for m in matches_claims:
            claimed_topics[int(m[0])] = m[1]
            
    return topics_list, claimed_topics

# Save text from shape recursively
def extract_text_from_shape(shape):
    text = []
    try:
        # Check if shape is a group (msoGroup = 6)
        if shape.Type == 6:
            for sub_shape in shape.GroupItems:
                text.extend(extract_text_from_shape(sub_shape))
        # Check if shape is a table
        elif shape.HasTable:
            table = shape.Table
            for row in range(1, table.Rows.Count + 1):
                for col in range(1, table.Columns.Count + 1):
                    cell = table.Cell(row, col)
                    if cell.Shape.HasTextFrame and cell.Shape.TextFrame.HasText:
                        txt = cell.Shape.TextFrame.TextRange.Text.strip()
                        if txt:
                            text.append(txt)
        # Check normal text frame
        elif shape.HasTextFrame:
            if shape.TextFrame.HasText:
                txt = shape.TextFrame.TextRange.Text.strip()
                if txt:
                    text.append(txt)
    except Exception as e:
        # Ignore shape-specific reading errors (unsupported shapes, etc.)
        pass
    return text

# Match a file to a topic
def find_matching_topic(filename, text_content, topics_list, claimed_topics):
    filename_lower = filename.lower()
    
    # 1. Match by country name in the filename
    for topic in topics_list:
        country_lower = topic["country"].lower()
        if country_lower in filename_lower:
            return topic
            
    # 2. Match keywords in the filename
    keyword_map = {
        "amazon": "Brazil",
        "deforestation": "Brazil",
        "wildfires": "Australia",
        "refugee": "United Kingdom",
        "surveillance": "China",
        "uyghur": "China",
        "famine": "Ethiopia",
        "earthquake": "Turkey",
        "palm oil": "Indonesia",
        "semiconductor": "Taiwan",
        "cholera": "Yemen",
        "fentanyl": "Mexico",
        "cartel": "Mexico",
        "afghanistan": "Afghanistan",
        "syria": "Syria",
        "finland": "Finland"
    }
    for kw, country in keyword_map.items():
        if kw in filename_lower:
            for topic in topics_list:
                if topic["country"].lower() == country.lower():
                    return topic
                    
    # 3. Match by student names in the filename
    for topic_id, students in claimed_topics.items():
        individual_names = re.split(r'\s+&\s+|\s+and\s+|,', students.lower())
        for name in individual_names:
            name = name.strip()
            if len(name) >= 3:
                pattern = r'\b' + re.escape(name) + r'\b'
                if re.search(pattern, filename_lower):
                    for topic in topics_list:
                        if topic["id"] == topic_id:
                            return topic
                    
    # 4. Fallback search (using extracted text)
    if text_content:
        text_lower = text_content.lower()
        for topic in topics_list:
            country_lower = topic["country"].lower()
            if country_lower in text_lower:
                return topic
        for topic_id, students in claimed_topics.items():
            individual_names = re.split(r'\s+&\s+|\s+and\s+|,', students.lower())
            for name in individual_names:
                name = name.strip()
                if len(name) >= 3:
                    pattern = r'\b' + re.escape(name) + r'\b'
                    if re.search(pattern, text_lower):
                        for topic in topics_list:
                            if topic["id"] == topic_id:
                                return topic

    return None

def main():
    print("Parsing dashboard configuration...")
    topics_list, claimed_topics = parse_dashboard()
    print(f"Loaded {len(topics_list)} topics and {len(claimed_topics)} claims.")

    # Initialize COM apps
    print("Starting MS PowerPoint and MS Word COM automation...")
    ppt_app = win32com.client.Dispatch("PowerPoint.Application")
    word_app = win32com.client.Dispatch("Word.Application")
    
    # Hide Word if possible
    word_app.Visible = False
    
    submissions = []
    
    # Get all student files
    files = [f for f in os.listdir(STUDENT_DIR) if os.path.isfile(os.path.join(STUDENT_DIR, f))]
    
    for filename in files:
        if filename.startswith("~$") or filename.startswith("."):
            continue
            
        file_path = os.path.join(STUDENT_DIR, filename)
        file_size = os.path.getsize(file_path)
        ext = os.path.splitext(filename)[1].lower()
        
        # Safe directory name for output files
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.splitext(filename)[0])
        student_folder_rel = f"converted/{safe_name}"
        student_folder_abs = os.path.join(OUTPUT_DIR, safe_name)
        
        print(f"\nProcessing: {filename} ({file_size / 1024:.1f} KB)")
        
        slides_data = []
        paragraphs_data = []
        doc_html_path_rel = ""
        is_success = False
        raw_text_corpus = ""
        
        if ext == ".pptx":
            try:
                os.makedirs(student_folder_abs, exist_ok=True)
                # Open presentation headlessly (WithWindow = False)
                pres = ppt_app.Presentations.Open(os.path.abspath(file_path), True, False, False)
                
                # Export slides as JPG
                pres.SaveAs(os.path.abspath(student_folder_abs), 17) # 17 = ppSaveAsJPG
                
                # Extract slide text
                for slide in pres.Slides:
                    slide_index = slide.SlideIndex
                    slide_title = ""
                    try:
                        if slide.Shapes.HasTitle:
                            slide_title = slide.Shapes.Title.TextFrame.TextRange.Text.strip()
                    except Exception:
                        pass
                        
                    slide_text = []
                    for shape in slide.Shapes:
                        slide_text.extend(extract_text_from_shape(shape))
                        
                    # Remove title from shape text if it's duplicated
                    if slide_title and slide_title in slide_text:
                        slide_text = [t for t in slide_text if t != slide_title]
                        
                    raw_text_corpus += " " + slide_title + " " + " ".join(slide_text)
                    
                    # File path check: PowerPoint saves files as Slide1.JPG, Slide2.JPG etc.
                    image_filename = f"Slide{slide_index}.JPG"
                    # Check case sensitivity (it might save as JPG or jpg)
                    if not os.path.exists(os.path.join(student_folder_abs, image_filename)):
                        image_filename = f"slide{slide_index}.jpg"
                        if not os.path.exists(os.path.join(student_folder_abs, image_filename)):
                            # Check all files in folder to match
                            for f_in_folder in os.listdir(student_folder_abs):
                                if f_in_folder.lower() == f"slide{slide_index}.jpg":
                                    image_filename = f_in_folder
                                    break
                                    
                    slides_data.append({
                        "slideIndex": slide_index,
                        "title": slide_title,
                        "text": slide_text,
                        "image": f"{student_folder_rel}/{image_filename}"
                    })
                    
                pres.Close()
                is_success = True
                print(f"-> Successfully exported {len(slides_data)} slides.")
                
            except Exception as e:
                print(f"-> Error exporting slides: {e}")
                
        elif ext == ".docx":
            try:
                os.makedirs(student_folder_abs, exist_ok=True)
                doc = word_app.Documents.Open(os.path.abspath(file_path), False, True)
                
                # Save as HTML
                html_filename = "document.html"
                doc_html_path_abs = os.path.join(student_folder_abs, html_filename)
                doc_html_path_rel = f"{student_folder_rel}/{html_filename}"
                doc.SaveAs(doc_html_path_abs, 8) # 8 = wdFormatHTML
                
                # Extract text paragraphs
                for para in doc.Paragraphs:
                    txt = para.Range.Text.strip()
                    if txt:
                        paragraphs_data.append(txt)
                        raw_text_corpus += " " + txt
                        
                doc.Close()
                is_success = True
                print(f"-> Successfully exported Word document to HTML ({len(paragraphs_data)} paragraphs).")
                
            except Exception as e:
                print(f"-> Error exporting Word document: {e}")
                
        else:
            print(f"-> Skipping unsupported file type: {ext}")
            continue
            
        if is_success:
            # Find matching topic and claim
            matched_topic = find_matching_topic(filename, raw_text_corpus, topics_list, claimed_topics)
            
            topic_id = None
            country = "Unmatched"
            issue = "Unmatched"
            questions = ""
            student_names = "Unmatched"
            
            if matched_topic:
                topic_id = matched_topic["id"]
                country = matched_topic["country"]
                issue = matched_topic["issue"]
                questions = matched_topic["questions"]
                student_names = claimed_topics.get(topic_id, "Claimed but unknown")
                print(f"-> Matched to Topic ID {topic_id}: {country} - {issue} ({student_names})")
            else:
                print("-> Could not match file to a claimed topic/student.")
                
            submissions.append({
                "filename": filename,
                "fileSize": file_size,
                "studentNames": student_names,
                "topicId": topic_id,
                "country": country,
                "issue": issue,
                "questions": questions,
                "type": ext[1:],
                "convertedFolder": student_folder_rel,
                "slides": slides_data,
                "documentHtml": doc_html_path_rel,
                "paragraphs": paragraphs_data
            })

    # Close COM applications
    print("\nShutting down COM automation...")
    ppt_app.Quit()
    word_app.Quit()
    
    # Save the JS database file
    output_js_path = os.path.join(OUTPUT_DIR, "extracted_data.js")
    js_content = f"// Automatically generated by convert_submissions.py\nconst studentSubmissions = {json.dumps(submissions, indent=4)};\n"
    
    with open(output_js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"\nCompleted! Written extracted data database to: {output_js_path}")
    print(f"Total processed files: {len(submissions)}")
    matched_count = len([s for s in submissions if s["topicId"] is not None])
    print(f"Successfully matched: {matched_count} of {len(submissions)}")

if __name__ == "__main__":
    main()
