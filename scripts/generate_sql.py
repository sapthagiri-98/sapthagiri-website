import json

data = json.load(open('scripts/extracted_day5_day6.json', encoding='utf-8'))

sql_statements = []
sql_statements.append('-- =========================================================================')
sql_statements.append('-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAY 5 & DAY 6)')
sql_statements.append('-- =========================================================================\n')

for item in data:
    cls = item['class'].replace("'", "''")
    subject = 'Spoken English'
    day_num = item['day']
    name = item['title'].replace("'", "''")
    item_type = 'SpokenEnglish'
    sort_order = day_num * 10
    lesson_no = str(day_num)
    
    # 1. Insert lesson
    sql = f"""INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('{cls}', '{subject}', '{name}', '{item_type}', {sort_order}, '{lesson_no}', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;"""
    sql_statements.append(sql)

    # 2. Insert checklist tasks into syllabus_session_tasks
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

with open('scripts/seed_spoken_english_day5_day6.sql', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(sql_statements))

print('Wrote scripts/seed_spoken_english_day5_day6.sql with', len(sql_statements), 'statements')
