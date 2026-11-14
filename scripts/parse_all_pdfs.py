import pdfplumber
import re
import json
import os

CLASSES = [
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
]

def clean_text(t):
    if not t: return ''
    t = re.sub(r'\(cid:\d+\)', '', t)
    return t.strip()

def parse_pdf(file_path):
    print(f"Parsing {file_path}...")
    lessons = []
    
    with pdfplumber.open(file_path) as pdf:
        num_pages = len(pdf.pages)
        lesson_starts = []
        
        for i, page in enumerate(pdf.pages):
            txt = page.extract_text() or ''
            lines = [l.strip() for l in txt.split('\n') if l.strip()]
            # Skip page header (line 0) which says DAY 1-2 or DAY 5-6
            top_lines = lines[1:6] if len(lines) > 1 else lines
            
            # Find the line that specifies the Class and Day for THIS page
            matched_cls = None
            matched_day = None
            
            for line in top_lines:
                m_cls = re.search(r'(Nursery|LKG|UKG|Class\s*\d+)\s*తరగ?ు?తి', line, re.IGNORECASE)
                m_day = re.search(r'DAY\s*(\d+)', line, re.IGNORECASE)
                if m_cls and m_day:
                    raw_cls = m_cls.group(1).strip()
                    if raw_cls.lower().startswith('class'):
                        num = re.search(r'\d+', raw_cls).group(0)
                        matched_cls = f"Class {num}"
                    elif raw_cls.lower() == 'nursery':
                        matched_cls = 'Nursery'
                    elif raw_cls.lower() == 'lkg':
                        matched_cls = 'LKG'
                    elif raw_cls.lower() == 'ukg':
                        matched_cls = 'UKG'
                    matched_day = int(m_day.group(1))
                    break
                    
            if matched_cls and matched_day:
                lesson_starts.append((i, matched_cls, matched_day))
                
        print(f"Found {len(lesson_starts)} distinct lesson starts.")
        
        for idx, (start_page, cls_name, day_num) in enumerate(lesson_starts):
            end_page = lesson_starts[idx + 1][0] - 1 if idx + 1 < len(lesson_starts) else num_pages - 1
            
            pages_txt = []
            all_tables = []
            
            for p_num in range(start_page, end_page + 1):
                p = pdf.pages[p_num]
                txt = clean_text(p.extract_text() or '')
                pages_txt.append(txt)
                
                tbls = p.extract_tables() or []
                for t in tbls:
                    clean_t = [[clean_text(cell) for cell in row] for row in t]
                    all_tables.append(clean_t)
                    
            combined_txt = '\n\n'.join(pages_txt)
            first_txt = pages_txt[0]
            
            # Extract Title
            m_title = re.search(r'పాఠ[ం్య][^:]*:\s*([^\n|]+)', first_txt)
            raw_title = clean_text(m_title.group(1)) if m_title else f"Day {day_num} Lesson"
            raw_title = re.sub(r'^[^\w\s]+', '', raw_title).strip()
            
            # Extract Objective
            m_obj = re.search(r'లక్ష్యం[^:]*:\s*([^\n]+)', first_txt)
            obj = clean_text(m_obj.group(1)) if m_obj else ""
            
            # Extract Video URL
            m_video = re.search(r'(https?://(?:www\.)?youtu[^\s\n]+)', combined_txt)
            video_url = m_video.group(1) if m_video else ""
            
            # Extract Checklists from the last page
            last_txt = pages_txt[-1]
            checklists = [line.strip().replace('•', '').replace('☐', '').replace('’', '').strip() 
                          for line in last_txt.split('\n') if '☐' in line]
            if not checklists:
                sc_match = re.search(r'self-check.*', combined_txt, re.DOTALL | re.IGNORECASE)
                if sc_match:
                    checklists = [l.strip().replace('•', '').replace('☐', '').strip() 
                                  for l in sc_match.group(0).split('\n') if l.strip().startswith(('•', '☐', '-'))]
            
            if not checklists:
                checklists = [
                    f"Explained the {raw_title} topic with target sentence models.",
                    "Practised target sentences and pronunciations with all students.",
                    "Conducted pair/group speaking activities and encouraged student participation.",
                    "Identified and gently corrected common pronunciation and grammar errors."
                ]
            else:
                checklists = [clean_text(c) for c in checklists if c.strip()]
                
            lessons.append({
                'class': cls_name,
                'day': day_num,
                'day_label': f"Day {day_num}",
                'title': f"Day {day_num}: {raw_title}",
                'raw_title': raw_title,
                'objective': obj,
                'video_url': video_url,
                'checklist': checklists,
                'tables': all_tables,
                'full_content': combined_txt
            })
            
    return lessons

def run():
    files = [
        r'C:\Users\vipul\Downloads\Spoken_English_Day1_Day2_Nursery_to_Class10_Telugu_Final.pdf',
        r'C:\Users\vipul\Downloads\Spoken_English_Day3_Day4_Continuation_Telugu_Final.pdf',
        r'C:\Users\vipul\Downloads\Spoken_English_Day5_Day6_Continuation_Redo_Telugu_Final.pdf'
    ]
    
    all_lessons = []
    for f in files:
        if os.path.exists(f):
            all_lessons.extend(parse_pdf(f))
        else:
            print(f"File not found: {f}")
            
    print(f"\nTotal lessons extracted: {len(all_lessons)}")
    
    out_json = 'scripts/all_spoken_english_days1_to_6.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(all_lessons, f, ensure_ascii=False, indent=2)
    print(f"Saved {out_json}")
    
    sql_statements = [
        "-- =========================================================================",
        "-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAYS 1 TO 6 COMPLETE)",
        "-- =========================================================================\n"
    ]
    
    for item in all_lessons:
        cls = item['class'].replace("'", "''")
        subject = 'Spoken English'
        day_num = item['day']
        name = item['title'].replace("'", "''")
        item_type = 'SpokenEnglish'
        sort_order = day_num * 10
        lesson_no = str(day_num)
        
        sql = f"""INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('{cls}', '{subject}', '{name}', '{item_type}', {sort_order}, '{lesson_no}', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;"""
        sql_statements.append(sql)
        
        for idx, chk in enumerate(item['checklist']):
            task_num = idx + 1
            t_key = f"SPOKEN::{cls}::{day_num}::CHK::{task_num}".replace("'", "''")
            content = chk.replace("'", "''")
            session_name = 'Daily Checklist'
            
            task_sql = f"""INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('{cls}', '{subject}', '{name}', '{session_name}', {task_num}, '{t_key}', '{content}', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;"""
            sql_statements.append(task_sql)
            
    out_sql = 'scripts/seed_spoken_english_days1_to_6.sql'
    with open(out_sql, 'w', encoding='utf-8') as f:
        f.write('\n\n'.join(sql_statements))
    print(f"Generated {out_sql} with {len(sql_statements)} statements.")

if __name__ == '__main__':
    run()
