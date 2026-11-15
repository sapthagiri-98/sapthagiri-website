import os
import sys
import re
import json
import urllib.request
import pypdfium2

DRIVE_FOLDER_ID = "1mmwlX_D5VDN_F2VdJAu25UxR3r61BDuP"
SUPABASE_URL = "https://denmdonkbmcmqfxlunpy.functions.supabase.co/syllabus-api"
SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbm1kb25rYm1jbXFmeGx1bnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODAzMzYsImV4cCI6MjEwMTc1NjMzNn0.afDstbxNeOzkCCdx5GqUdedJAsQYSgZajYQlDoaIDWk"
SYNC_SECRET = os.environ.get("SPOKEN_SYNC_SECRET", "sapthagiri-spoken-sync-2026")

os.makedirs('Portal/spoken_pdf', exist_ok=True)
os.makedirs('downloads_cache', exist_ok=True)
os.makedirs('source_pdfs', exist_ok=True)

CANONICAL_DAY_VIDEOS = {
    1: "https://youtu.be/quFHfZQykPM",
    2: "https://youtu.be/I3HlLh6quiI",
    3: "https://youtu.be/QXEoK1xSy-g",
    4: "https://youtu.be/h1dnnkAaXOM",
    5: {
        "pre": "https://youtu.be/eDRPyixzp1s",
        "default": "https://youtu.be/qnlpvTyuOmU"
    },
    6: "https://youtu.be/bglFgPtuAyk",
    7: "https://youtu.be/gzVRGpLBYuQ",
    8: "https://youtu.be/rQILYS9_FGc"
}

def resolve_video_url(combined_txt, pdf_full_path, cls_name, day_num):
    # 1. Check extracted printable text
    m_vid = re.search(r'(https?://(?:www\.)?youtu[^\s\n\r"\'<>]+)', combined_txt)
    if m_vid:
        candidate = m_vid.group(1).rstrip('.,;:"\')')
        if len(candidate) > 12:
            return candidate

    # 2. Check raw PDF bytes (embedded link annotations, URIs)
    if os.path.exists(pdf_full_path):
        try:
            with open(pdf_full_path, 'rb') as f:
                raw_bytes = f.read()
                raw_matches = re.findall(rb'https?://(?:www\.)?youtu[^\s()<>\x00-\x1f\x7f-\xff]+', raw_bytes)
                if raw_matches:
                    for rm in raw_matches:
                        clean_u = rm.decode('utf-8', errors='ignore').rstrip('.,;:"\')')
                        if len(clean_u) > 12:
                            return clean_u
        except Exception:
            pass

    # 3. Canonical day-wise curriculum video mapping fallback
    v = CANONICAL_DAY_VIDEOS.get(int(day_num))
    if isinstance(v, dict):
        is_pre = any(k in str(cls_name).lower() for k in ['nursery', 'lkg', 'ukg'])
        return v["pre"] if is_pre else v["default"]
    return v or ""

def download_drive_folder():
    """Download any new PDFs from Google Drive folder using gdown if available."""
    try:
        import gdown
        print(f"Checking Google Drive folder: {DRIVE_FOLDER_ID}...")
        gdown.download_folder(id=DRIVE_FOLDER_ID, output='downloads_cache', quiet=False, use_cookies=False)
    except Exception as e:
        err_msg = str(e)
        print(f"\n[Drive Notice] Google Drive folder download could not complete: {err_msg}")
        if "401" in err_msg or "permission" in err_msg.lower():
            print("==> ACTION REQUIRED IN GOOGLE DRIVE <==")
            print("The Google Drive folder is currently Restricted.")
            print("Please open: https://drive.google.com/drive/folders/1mmwlX_D5VDN_F2VdJAu25UxR3r61BDuP")
            print("Click 'Share' -> Under 'General access', change from 'Restricted' to 'Anyone with the link' (Viewer).")
            print("=========================================\n")

def parse_and_slice_pdf(file_path):
    print(f"Parsing and slicing: {file_path}...")
    pdf = pypdfium2.PdfDocument(file_path)
    num_pages = len(pdf)
    
    lesson_starts = []
    for i in range(num_pages):
        tp = pdf[i].get_textpage()
        txt = tp.get_text_range()
        lines = [l.strip() for l in txt.split('\n') if l.strip()]
        search_lines = lines[1:6] if len(lines) > 1 else lines
        found_cls = None
        found_day = None
        for line in search_lines:
            m_cls = re.search(r'(Nursery|LKG|UKG|Class\s*\d+)\s*తరగ?ు?తి', line, re.I)
            m_day = re.search(r'(?:DAY\s*(\d+)|(\d+)\s*DAY)', line, re.I)
            if m_cls and m_day:
                raw_cls = m_cls.group(1).strip()
                if raw_cls.lower().startswith('class'):
                    found_cls = 'Class ' + re.search(r'\d+', raw_cls).group(0)
                else:
                    found_cls = raw_cls.upper() if raw_cls.lower() in ['lkg', 'ukg'] else 'Nursery'
                found_day = int(m_day.group(1) or m_day.group(2))
                break
        if found_cls and found_day:
            lesson_starts.append((i, found_cls, found_day))
            
    print(f"Found {len(lesson_starts)} lessons in {os.path.basename(file_path)}.")
    lessons = []
    
    for idx, (start_page, cls_name, day_num) in enumerate(lesson_starts):
        end_page = lesson_starts[idx + 1][0] - 1 if idx + 1 < len(lesson_starts) else num_pages - 1
        
        # 1. Slice and export independent PDF
        clean_cls_name = cls_name.replace(' ', '_')
        pdf_filename = f"{clean_cls_name}_Day_{day_num}.pdf"
        pdf_rel_path = f"spoken_pdf/{pdf_filename}"
        pdf_full_path = f"Portal/{pdf_rel_path}"
        
        slice_pdf = pypdfium2.PdfDocument.new()
        page_indices = list(range(start_page, end_page + 1))
        slice_pdf.import_pages(pdf, page_indices)
        slice_pdf.save(pdf_full_path)
        slice_pdf.close()
        
        # 2. Extract metadata
        pages_txt = [pdf[p].get_textpage().get_text_range() for p in page_indices]
        first_txt = pages_txt[0]
        combined_txt = '\n\n'.join(pages_txt)
        
        m_title = re.search(r'పాఠ[ం్య][^:]*:\s*([^\n|]+)', first_txt)
        raw_title = m_title.group(1).strip() if m_title else f"Day {day_num} Lesson"
        raw_title = re.sub(r'^[^\w\s\u0C00-\u0C7F]+', '', raw_title).strip()
        
        m_obj = re.search(r'లక్ష్యం[^:]*:\s*([^\n]+)', first_txt)
        obj = m_obj.group(1).strip() if m_obj else ""
        
        video_url = resolve_video_url(combined_txt, pdf_full_path, cls_name, day_num)
        
        # Checklist
        checklists = []
        for p_txt in pages_txt:
            if re.search(r'self[\s\-]check', p_txt, re.I):
                capture = False
                for line in p_txt.split('\n'):
                    ls = line.strip()
                    if re.search(r'self[\s\-]check', ls, re.I):
                        capture = True
                        continue
                    if capture:
                        if re.match(r'^(?:\[\s*\]|[☐•\-])\s*(.*)', ls):
                            item = re.sub(r'^[\[\]☐•\-\s]+', '', ls).strip()
                            if len(item) > 5:
                                checklists.append(item)
                        elif ls.startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', 'SPOKEN')):
                            if checklists:
                                break
            if checklists:
                break
                
        if not checklists:
            checklists = [
                f"Explained the {raw_title} topic with target sentence models.",
                "Practised target sentences and pronunciations with all students.",
                "Conducted pair/group speaking activities and encouraged student participation.",
                "Identified and gently corrected common pronunciation and grammar errors."
            ]
            
        lessons.append({
            'class': cls_name,
            'day': day_num,
            'day_label': f"Day {day_num}",
            'title': f"Day {day_num}: {raw_title}",
            'raw_title': raw_title,
            'objective': obj,
            'video_url': video_url,
            'pdf_url': pdf_rel_path,
            'checklist': checklists,
            'page_count': len(page_indices)
        })
        
    pdf.close()
    return lessons

def push_to_supabase(all_lessons):
    """Pushes lessons and tasks directly to Supabase via syllabus-api Edge Function."""
    lessons_payload = []
    tasks_payload = []
    
    for item in all_lessons:
        cls = item['class']
        day_num = item['day']
        name = item['title']
        drive_link = item['pdf_url']
        
        lessons_payload.append({
            'class': cls,
            'name': name,
            'lesson_no': str(day_num),
            'day': day_num,
            'drive_link': drive_link,
            'target_month': 'November'
        })
        
        for idx, chk in enumerate(item['checklist']):
            task_num = idx + 1
            tasks_payload.append({
                'class': cls,
                'lesson_name': name,
                'task_num': task_num,
                'task_key': f"SPOKEN::{cls}::{day_num}::CHK::{task_num}",
                'content': chk
            })
            
    print(f"Pushing {len(lessons_payload)} lessons and {len(tasks_payload)} checklist tasks to Supabase...")
    req_body = json.dumps({
        'fn': 'syncSpokenEnglishCatalog',
        'args': [lessons_payload, tasks_payload]
    }).encode('utf-8')
    
    req = urllib.request.Request(
        SUPABASE_URL,
        data=req_body,
        headers={
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON,
            'Authorization': f'Bearer {SUPABASE_ANON}',
            'x-sync-secret': SYNC_SECRET
        }
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print("Supabase Sync Response:", res)
    except Exception as e:
        print(f"Supabase Sync Notice (Deploy edge function to enable auto-sync): {e}")

def run():
    download_drive_folder()
    
    # Check source_pdfs, downloads_cache, user Downloads, and Windows Downloads path
    candidate_dirs = [
        'source_pdfs',
        'downloads_cache',
        os.path.expanduser('~/Downloads'),
        'C:/Users/vipul/Downloads'
    ]
    all_files = []
    for d in candidate_dirs:
        if os.path.exists(d):
            for f in os.listdir(d):
                if f.lower().endswith('.pdf') and ('spoken_english' in f.lower() or 'day' in f.lower()):
                    fp = os.path.join(d, f)
                    if fp not in all_files:
                        all_files.append(fp)
                        
    # Sort files by day number
    def sort_key(p):
        m = re.search(r'day\s*(\d+)', os.path.basename(p), re.I)
        return int(m.group(1)) if m else 999
    all_files.sort(key=sort_key)
    
    print(f"Found {len(all_files)} Spoken English source PDFs.")
    all_lessons = []
    for fp in all_files:
        all_lessons.extend(parse_and_slice_pdf(fp))
        
    if not all_lessons:
        print("\n[ERROR] No Spoken English source PDFs found to process.")
        print("To fix this:")
        print("1. Set Google Drive folder permissions to 'Anyone with the link can view' (currently restricted).")
        print("   URL: https://drive.google.com/drive/folders/1mmwlX_D5VDN_F2VdJAu25UxR3r61BDuP")
        print("2. OR upload your PDF directly to the 'source_pdfs/' folder in this repo.")
        print("3. OR run 'Sync_Spoken_English.bat' locally on your PC where Downloads folder has the PDFs.\n")
        sys.exit(1)
        
    print(f"Total processed lessons across all classes: {len(all_lessons)}")
    
    # Save client JS data
    by_key = {}
    for item in all_lessons:
        by_key[f"{item['class']}||{item['day']}"] = item
        
    js_content = 'window.SpokenEnglishData = ' + json.dumps(by_key, ensure_ascii=False) + ';\n'
    with open('Portal/data/spoken-english-lessons.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Updated Portal/data/spoken-english-lessons.js")
    
    # Sync directly to Supabase via API (Zero SQL)
    push_to_supabase(all_lessons)

if __name__ == '__main__':
    run()
