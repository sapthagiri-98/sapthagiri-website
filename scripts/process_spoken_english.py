import pypdfium2
import re
import json
import os

CLASSES = [
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
]

os.makedirs('Portal/spoken_pdf', exist_ok=True)

def parse_and_slice_pdf(file_path, file_label):
    print(f"Processing {file_label}: {file_path}...")
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
                    num = re.search(r'\d+', raw_cls).group(0)
                    found_cls = f"Class {num}"
                elif raw_cls.lower() == 'nursery':
                    found_cls = 'Nursery'
                elif raw_cls.lower() == 'lkg':
                    found_cls = 'LKG'
                elif raw_cls.lower() == 'ukg':
                    found_cls = 'UKG'
                found_day = int(m_day.group(1) or m_day.group(2))
                break
                
        if found_cls and found_day:
            lesson_starts.append((i, found_cls, found_day))
            
    print(f"Found {len(lesson_starts)} lessons in {file_label}.")
    
    lessons = []
    for idx, (start_page, cls_name, day_num) in enumerate(lesson_starts):
        end_page = lesson_starts[idx + 1][0] - 1 if idx + 1 < len(lesson_starts) else num_pages - 1
        
        # 1. Slice and export independent PDF for this Day & Class
        clean_cls_name = cls_name.replace(' ', '_')
        pdf_filename = f"{clean_cls_name}_Day_{day_num}.pdf"
        pdf_rel_path = f"spoken_pdf/{pdf_filename}"
        pdf_full_path = f"Portal/{pdf_rel_path}"
        
        slice_pdf = pypdfium2.PdfDocument.new()
        page_indices = list(range(start_page, end_page + 1))
        slice_pdf.import_pages(pdf, page_indices)
        slice_pdf.save(pdf_full_path)
        slice_pdf.close()
        
        # 2. Extract clean text & metadata using pypdfium2
        pages_txt = []
        for p_idx in page_indices:
            pages_txt.append(pdf[p_idx].get_textpage().get_text_range())
            
        first_txt = pages_txt[0]
        last_txt = pages_txt[-1]
        combined_txt = '\n\n'.join(pages_txt)
        
        # Title
        m_title = re.search(r'పాఠ[ం్య][^:]*:\s*([^\n|]+)', first_txt)
        raw_title = m_title.group(1).strip() if m_title else f"Day {day_num} Lesson"
        raw_title = re.sub(r'^[^\w\s\u0C00-\u0C7F]+', '', raw_title).strip()
        
        # Objective
        m_obj = re.search(r'లక్ష్యం[^:]*:\s*([^\n]+)', first_txt)
        obj = m_obj.group(1).strip() if m_obj else ""
        
        # Video URL
        m_video = re.search(r'(https?://(?:www\.)?youtu[^\s\n\r]+)', combined_txt)
        video_url = m_video.group(1) if m_video else ""
        
        # Checklist from self-check section
        checklists = []
        for line in last_txt.split('\n'):
            line_s = line.strip()
            if any(marker in line_s for marker in ['☐', '', '•', '- ']) and ('నేను' in line_s or 'పిల్ల' in line_s or 'విద్యార్థి' in line_s or 'గుర్తించాను' in line_s or 'చేశాను' in line_s or 'వివరించాను' in line_s or 'ఇచ్చాను' in line_s or 'అవకాశం' in line_s):
                cleaned_chk = line_s.replace('•', '').replace('☐', '').replace('', '').replace('’', '').strip()
                if cleaned_chk and len(cleaned_chk) > 10:
                    checklists.append(cleaned_chk)
                    
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

def run():
    files = [
        (r'C:\Users\vipul\Downloads\Spoken_English_Day1_Day2_Nursery_to_Class10_Telugu_Final.pdf', 'Days 1-2'),
        (r'C:\Users\vipul\Downloads\Spoken_English_Day3_Day4_Continuation_Telugu_Final.pdf', 'Days 3-4'),
        (r'C:\Users\vipul\Downloads\Spoken_English_Day5_Day6_Continuation_Redo_Telugu_Final.pdf', 'Days 5-6'),
        (r'C:\Users\vipul\Downloads\Spoken_English_Day7_Day8_Continuation_Nursery_to_Class10_Telugu.pdf', 'Days 7-8'),
    ]
    
    # Auto-discover any future Spoken_English_Day*.pdf in Downloads (e.g. Day 9, Day 10, etc.)
    downloads = os.path.expanduser(r'C:\Users\vipul\Downloads')
    known_paths = set(os.path.normpath(f[0]).lower() for f in files)
    
    # Ignore older duplicate drafts
    ignore_files = {
        'spoken_english_day3_day4_nursery_to_class10_telugu_final.pdf',
        'spoken_english_day5_day6_continuation_nursery_to_class10_telugu.pdf'
    }
    
    if os.path.exists(downloads):
        for fname in os.listdir(downloads):
            if fname.lower().endswith('.pdf') and 'spoken_english' in fname.lower() and 'day' in fname.lower():
                if fname.lower() in ignore_files:
                    continue
                full_p = os.path.normpath(os.path.join(downloads, fname))
                if full_p.lower() not in known_paths:
                    files.append((full_p, fname))
                    known_paths.add(full_p.lower())
    
    all_lessons = []
    for fpath, label in files:
        if os.path.exists(fpath):
            all_lessons.extend(parse_and_slice_pdf(fpath, label))
        else:
            print(f"Warning: {fpath} not found.")
            
    print(f"\nTotal lessons processed: {len(all_lessons)}")
    
    # Save JSON and client JS
    by_key = {}
    for item in all_lessons:
        key = f"{item['class']}||{item['day']}"
        by_key[key] = item
        
    js_content = 'window.SpokenEnglishData = ' + json.dumps(by_key, ensure_ascii=False) + ';\n'
    with open('Portal/data/spoken-english-lessons.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    print("Updated Portal/data/spoken-english-lessons.js")
    
    # Generate clean SQL seed
    sql = """-- =========================================================================
-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAYS 1 TO 6 COMPLETE)
-- With authentic Telugu extracted via pypdfium2 and slice PDFs linked
-- =========================================================================

DO $$
BEGIN

  DELETE FROM app.syllabus_session_tasks 
  WHERE task_key LIKE 'SPOKEN::%' OR subject IN ('Spoken English', 'Spoken Skills');

  DELETE FROM app.syllabus_lessons 
  WHERE subject IN ('Spoken English', 'Spoken Skills') OR item_type = 'SpokenEnglish';

"""
    for item in all_lessons:
        cls = item['class'].replace("'", "''")
        subject = 'Spoken English'
        day_num = item['day']
        name = item['title'].replace("'", "''")
        item_type = 'SpokenEnglish'
        sort_order = day_num * 10
        lesson_no = str(day_num)
        drive_link = item['pdf_url']

        sql += f"""  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('{cls}', '{subject}', '{name}', '{item_type}', {sort_order}, '{lesson_no}', 'Daily', '{drive_link}');\n"""

    sql += "\n  -- Checklist Tasks\n"
    for item in all_lessons:
        cls = item['class'].replace("'", "''")
        subject = 'Spoken English'
        day_num = item['day']
        name = item['title'].replace("'", "''")

        for idx, chk in enumerate(item['checklist']):
            task_num = idx + 1
            t_key = f"SPOKEN::{cls}::{day_num}::CHK::{task_num}".replace("'", "''")
            content = chk.replace("'", "''")
            session_name = 'Daily Checklist'

            sql += f"""  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('{cls}', '{subject}', '{name}', '{session_name}', {task_num}, '{t_key}', '{content}', false);\n"""

    sql += "\nEND $$;\n"

    with open('scripts/seed_spoken_english.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
    with open('scripts/seed_spoken_english_days1_to_6.sql', 'w', encoding='utf-8') as f:
        f.write(sql)
    print("Updated scripts/seed_spoken_english.sql and scripts/seed_spoken_english_days1_to_6.sql")

if __name__ == '__main__':
    run()

