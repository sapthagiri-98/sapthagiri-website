import json

all_lessons = json.load(open('scripts/all_spoken_english_days1_to_6.json', encoding='utf-8'))

sql = """-- =========================================================================
-- CLEAN IDEMPOTENT SPOKEN ENGLISH SEED (DAYS 1 TO 6)
-- Works on any PostgreSQL / Supabase table structure without ON CONFLICT constraints
-- =========================================================================

DO $$
BEGIN

  -- 1. Clean previous Spoken English seed records
  DELETE FROM app.syllabus_session_tasks 
  WHERE task_key LIKE 'SPOKEN::%' OR subject IN ('Spoken English', 'Spoken Skills');

  DELETE FROM app.syllabus_lessons 
  WHERE subject IN ('Spoken English', 'Spoken Skills') OR item_type = 'SpokenEnglish';

  -- 2. Insert Lessons
"""

for item in all_lessons:
    cls = item['class'].replace("'", "''")
    subject = 'Spoken English'
    day_num = item['day']
    name = item['title'].replace("'", "''")
    item_type = 'SpokenEnglish'
    sort_order = day_num * 10
    lesson_no = str(day_num)

    sql += f"""  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
  VALUES ('{cls}', '{subject}', '{name}', '{item_type}', {sort_order}, '{lesson_no}', 'Daily');\n"""

sql += "\n  -- 3. Insert Checklist Tasks\n"

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

sql += """
END $$;
"""

with open('scripts/seed_spoken_english_days1_to_6.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"Generated clean idempotent script: scripts/seed_spoken_english_days1_to_6.sql ({len(sql)} chars)")
