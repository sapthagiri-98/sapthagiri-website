-- =========================================================================

-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAYS 1 TO 6 COMPLETE)

-- =========================================================================


INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 1, 'SPOKEN::Nursery::1::CHK::1', 'Explained the Greetings: Hello, Good morning, Bye-bye topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 2, 'SPOKEN::Nursery::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 3, 'SPOKEN::Nursery::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 4, 'SPOKEN::Nursery::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 1, 'SPOKEN::Nursery::2::CHK::1', 'Explained the Classroom objects: book, bag, pen, chair topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 2, 'SPOKEN::Nursery::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 3, 'SPOKEN::Nursery::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 4, 'SPOKEN::Nursery::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 1, 'SPOKEN::LKG::1::CHK::1', 'Explained the Greetings and my name topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 2, 'SPOKEN::LKG::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 3, 'SPOKEN::LKG::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 4, 'SPOKEN::LKG::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 1, 'SPOKEN::LKG::2::CHK::1', 'Explained the Classroom objects: This is a… topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 2, 'SPOKEN::LKG::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 3, 'SPOKEN::LKG::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 4, 'SPOKEN::LKG::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::UKG::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::UKG::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::UKG::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::UKG::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 1, 'SPOKEN::UKG::2::CHK::1', 'Explained the Classroom objects and What is this? topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 2, 'SPOKEN::UKG::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 3, 'SPOKEN::UKG::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 4, 'SPOKEN::UKG::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 1::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 1::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 1::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 1::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 1, 'SPOKEN::Class 1::2::CHK::1', 'Explained the Classroom objects: This is a… / It is a… topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 2, 'SPOKEN::Class 1::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 3, 'SPOKEN::Class 1::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 4, 'SPOKEN::Class 1::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 2::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 2::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 2::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 2::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 1, 'SPOKEN::Class 2::2::CHK::1', 'Explained the Classroom objects: This is a… / It is a… topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 2, 'SPOKEN::Class 2::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 3, 'SPOKEN::Class 2::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 4, 'SPOKEN::Class 2::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 3::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 3::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 3::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 3::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 3::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 3::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 3::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 3::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 4::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 4::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 4::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 4::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 4::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 4::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 4::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 4::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 5::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 5::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 5::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 5::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 5::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 5::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 5::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 5::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 6::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 6::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 6::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 6::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 6::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 6::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 6::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 6::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 7::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 7::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 7::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 7::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 7::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 7::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 7::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 7::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 8::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 8::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 8::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 8::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 8::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 8::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 8::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 8::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 9::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 9::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 9::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 9::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 9::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 9::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 9::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 9::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 10::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 10::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 10::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 10::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 10::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 10::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 10::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 10::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం', 'Daily Checklist', 1, 'SPOKEN::Nursery::3::CHK::1', 'Explained the ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం', 'Daily Checklist', 2, 'SPOKEN::Nursery::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం', 'Daily Checklist', 3, 'SPOKEN::Nursery::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వక్తిని చూపించూడం', 'Daily Checklist', 4, 'SPOKEN::Nursery::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 4: చూరలు: Clap, Jump, Sit, Stand', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 4: చూరలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 1, 'SPOKEN::Nursery::4::CHK::1', 'Explained the చూరలు: Clap, Jump, Sit, Stand topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 4: చూరలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 2, 'SPOKEN::Nursery::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 4: చూరలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 3, 'SPOKEN::Nursery::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 4: చూరలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 4, 'SPOKEN::Nursery::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 1, 'SPOKEN::LKG::3::CHK::1', 'Explained the What is this? Who is this? Where is it? topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 2, 'SPOKEN::LKG::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 3, 'SPOKEN::LKG::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 4, 'SPOKEN::LKG::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 1, 'SPOKEN::LKG::4::CHK::1', 'Explained the I can…: Action sentences topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 2, 'SPOKEN::LKG::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 3, 'SPOKEN::LKG::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 4, 'SPOKEN::LKG::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 1, 'SPOKEN::UKG::3::CHK::1', 'Explained the What, Who and Where questions topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 2, 'SPOKEN::UKG::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 3, 'SPOKEN::UKG::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 4, 'SPOKEN::UKG::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయంగలున?', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయంగలున?', 'Daily Checklist', 1, 'SPOKEN::UKG::4::CHK::1', 'Explained the I can / I cannot: ఏమి చేయంగలున? topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయంగలున?', 'Daily Checklist', 2, 'SPOKEN::UKG::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయంగలున?', 'Daily Checklist', 3, 'SPOKEN::UKG::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయంగలున?', 'Daily Checklist', 4, 'SPOKEN::UKG::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 1, 'SPOKEN::Class 1::3::CHK::1', 'Explained the Question words: What, Who, Where topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 2, 'SPOKEN::Class 1::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 3, 'SPOKEN::Class 1::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 4, 'SPOKEN::Class 1::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 1, 'SPOKEN::Class 1::4::CHK::1', 'Explained the Can / cannot: ability and simple requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 2, 'SPOKEN::Class 1::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 3, 'SPOKEN::Class 1::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 4, 'SPOKEN::Class 1::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 1, 'SPOKEN::Class 2::3::CHK::1', 'Explained the Question words: What, Who, Where topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 2, 'SPOKEN::Class 2::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 3, 'SPOKEN::Class 2::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 4, 'SPOKEN::Class 2::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 1, 'SPOKEN::Class 2::4::CHK::1', 'Explained the Can / cannot: ability and simple requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 2, 'SPOKEN::Class 2::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 3, 'SPOKEN::Class 2::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 4, 'SPOKEN::Class 2::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 3::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 3::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 3::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 3::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 3::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 3::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 3::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 3::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 4::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 4::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 4::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 4::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 4::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 4::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 4::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 4::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 5::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 5::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 5::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 5::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 5::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 5::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 5::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 5::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 6::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 6::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 6::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 6::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 6::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 6::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 6::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 6::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 7::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 7::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 7::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 7::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 7::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 7::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 7::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 7::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 8::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 8::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 8::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 8::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 8::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 8::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 8::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 8::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 1, 'SPOKEN::Class 9::3::CHK::1', 'Explained the Question words for a short interview topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 2, 'SPOKEN::Class 9::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 3, 'SPOKEN::Class 9::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 4, 'SPOKEN::Class 9::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 1, 'SPOKEN::Class 9::4::CHK::1', 'Explained the Can: ability, permission and polite requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 2, 'SPOKEN::Class 9::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 3, 'SPOKEN::Class 9::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 4, 'SPOKEN::Class 9::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'SpokenEnglish', 30, '3', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 1, 'SPOKEN::Class 10::3::CHK::1', 'Explained the Question words for a short interview topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 2, 'SPOKEN::Class 10::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 3, 'SPOKEN::Class 10::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 4, 'SPOKEN::Class 10::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'SpokenEnglish', 40, '4', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 1, 'SPOKEN::Class 10::4::CHK::1', 'Explained the Can: ability, permission and polite requests topic with target sentence models.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 2, 'SPOKEN::Class 10::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 3, 'SPOKEN::Class 10::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 4, 'SPOKEN::Class 10::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 1, 'SPOKEN::Nursery::5::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 2, 'SPOKEN::Nursery::5::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 3, 'SPOKEN::Nursery::5::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Nursery', 'Spoken English', 'Day 6: రేప్పు చేసే పనులు: Today / Tomorrow', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 6: రేప్పు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 1, 'SPOKEN::Nursery::6::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 6: రేప్పు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 2, 'SPOKEN::Nursery::6::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Nursery', 'Spoken English', 'Day 6: రేప్పు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 3, 'SPOKEN::Nursery::6::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 1, 'SPOKEN::LKG::5::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 2, 'SPOKEN::LKG::5::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 3, 'SPOKEN::LKG::5::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 1, 'SPOKEN::LKG::6::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 2, 'SPOKEN::LKG::6::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 3, 'SPOKEN::LKG::6::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 1, 'SPOKEN::UKG::5::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 2, 'SPOKEN::UKG::5::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 3, 'SPOKEN::UKG::5::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 1, 'SPOKEN::UKG::6::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 2, 'SPOKEN::UKG::6::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 3, 'SPOKEN::UKG::6::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 1, 'SPOKEN::Class 1::5::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 2, 'SPOKEN::Class 1::5::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 3, 'SPOKEN::Class 1::5::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 1, 'SPOKEN::Class 1::6::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 2, 'SPOKEN::Class 1::6::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 3, 'SPOKEN::Class 1::6::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 1, 'SPOKEN::Class 2::5::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 2, 'SPOKEN::Class 2::5::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలువాట: Do you…? / Yes, I do.', 'Daily Checklist', 3, 'SPOKEN::Class 2::5::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 1, 'SPOKEN::Class 2::6::CHK::1', 'నేను మదురోజు వీడియో చ&సి, వాకా%లును practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 2, 'SPOKEN::Class 2::6::CHK::2', 'పిలులుక మాట్లా డే అవంకాశ్న ఇచాVను; notebook రాయిచడానికే సమయం ఖరV చేయంలేదు.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 3, 'SPOKEN::Class 2::6::CHK::3', 'ఎవంర్తింక్రిం ఇకా సహ్వాయం అవంసరమో గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 1, 'SPOKEN::Class 3::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 2, 'SPOKEN::Class 3::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 3, 'SPOKEN::Class 3::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 4, 'SPOKEN::Class 3::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 3::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 3::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 3::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 3::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 1, 'SPOKEN::Class 4::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 2, 'SPOKEN::Class 4::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 3, 'SPOKEN::Class 4::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 4, 'SPOKEN::Class 4::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 4::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 4::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 4::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 4::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 1, 'SPOKEN::Class 5::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 2, 'SPOKEN::Class 5::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 3, 'SPOKEN::Class 5::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలువాట గర్తించ్చి పశ్న_లు', 'Daily Checklist', 4, 'SPOKEN::Class 5::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 5::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 5::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 5::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 5::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 6::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 6::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 6::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 6::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 6::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 6::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 6::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 6::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 7::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 7::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 7::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 7::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 7::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 7::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 7::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 7::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 8::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 8::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 8::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 8::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 8::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 8::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 8::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 8::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 9::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 9::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 9::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 9::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 9::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 9::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 9::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 9::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 10::5::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 10::5::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 10::5::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 10::5::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month)
VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'Daily')
ON CONFLICT (class, subject, name) DO UPDATE SET 
  sort_order = EXCLUDED.sort_order,
  lesson_no = EXCLUDED.lesson_no,
  item_type = EXCLUDED.item_type;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 10::6::CHK::1', 'నేను మదురోజు assigned video చ&సి, మఖ%మైను వాకా%లును 5 సార practice చేశాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 10::6::CHK::2', 'నేను నేరVకను_ patternను నా మాటలో అరb చేసకని పిలులుక సరళ్లుగా వివంర్తించాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 10::6::CHK::3', 'పతి విదా%ర్తింbక్రిం పశ్న _ అడంగడానిక్రిం, సమాధాను చెప1డానిక్రిం మర్తింయం జటలుగా practice చేయండానిక్రిం అవంకాశ్న', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;

INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 10::6::CHK::4', 'తప్పు1 వాకా%లును సర్తింగా model చేసి, సహ్వాయం అవంసరమైనువార్తింని గర్తిం చాను.', false)
ON CONFLICT (task_key) DO UPDATE SET
  content = EXCLUDED.content,
  lesson_name = EXCLUDED.lesson_name;