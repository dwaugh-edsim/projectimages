import os
import urllib.request

ww2_base = r"Z:\simroom\DSA\WW2_Unit"
files_dir = os.path.join(ww2_base, "files")
os.makedirs(files_dir, exist_ok=True)

docs = [
    ("1J-QfSs5ntGPD4fFbpcFXgJdkFvBINalr3aEp2ImGPAA", "WW1_Review_Assignment", "doc"),
    ("1i6tJ2ESzDZsnrxn-86H6JvnEp3FdXKFsVAEF4vLJzAw", "WW1_Review_Quizzes_List", "doc"),
    ("1RhcZxCuYx5lhCenv_FawLIvhBYwYK8kb2Kh2wN6-iDw", "Propaganda_Poster_Assignment", "doc"),
    ("12yZsFd5k1ywlQ0behNKCcGjgExr-z5O_HgdhjADMc7s", "Victoria_Cross_Information_Slides", "slide"),
    ("1qIiRCrWiLsLCdxq717YTCiLrnvH9P14gL2Dvvj9DGsE", "Victoria_Cross_Webquest_Assignment", "doc"),
    ("1Gd7r_JCoEdHJXzz_7cAelEokAuF1eKsNN28XBn21C6A", "WW2_Unit_Case_Study_Template", "doc"),
    ("1nV2-r9oXzhruXtNwoS447GV8J2ebCMFsAxb3fUpouX4", "Primary_Source_Analysis_Assignment", "slide"),
    ("1dWF_gL5BsFVBQ8sTB_KyScS0ZpDIMEpiR_mzKutfehA", "WW2_Research_Essay_Assignment", "doc"),
    ("1OjbIKzJMPv-sq3hc7hROI87aFw6JShKjoMzEGa6R_rc", "Brainstorming_Topic_Slides", "slide"),
    ("1WEUJ0nSsjwcthLD0A1DxQHx0viIOyNWTW3puWrGzjPM", "Five_Paragraph_Essay_Organizer_Slides", "slide"),
    ("1iWPZvQql6GZa2ybTxbS2E7-1CPXgufFYoiYePCJslkQ", "Jordan_Example_5_Paragraph_Essay_Slides", "slide"),
    ("1NEc2IyYPLrP-dgTSy85EGGoX9t1n7cCZ1JAqlrMlMRg", "Intro_Conclusion_Tips_Slides", "slide"),
    ("1eTKC41Wzkdzm6EBquyQH9bVlhAHTBe1NwNi2SqIkXcE", "Victoria_Cross_Essay_Sample", "doc")
]

print("Starting downloads for WW2 documents and slides...")

for doc_id, name, kind in docs:
    if kind == "doc":
        formats = [
            ("txt", f"https://docs.google.com/document/d/{doc_id}/export?format=txt"),
            ("pdf", f"https://docs.google.com/document/d/{doc_id}/export?format=pdf"),
            ("docx", f"https://docs.google.com/document/d/{doc_id}/export?format=docx")
        ]
    elif kind == "slide":
        formats = [
            ("pdf", f"https://docs.google.com/presentation/d/{doc_id}/export/pdf"),
            ("pptx", f"https://docs.google.com/presentation/d/{doc_id}/export/pptx")
        ]
    
    for ext, url in formats:
        file_path = os.path.join(files_dir, f"{name}.{ext}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as resp, open(file_path, "wb") as f:
                f.write(resp.read())
            print(f"Downloaded: {name}.{ext}")
        except Exception as e:
            print(f"Failed {name}.{ext}: {e}")

print("Document and slide downloads completed!")
