-- =========================================================================
-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAYS 1 TO 6 COMPLETE)
-- With authentic Telugu extracted via pypdfium2 and slice PDFs linked
-- =========================================================================

DO $$
BEGIN

  DELETE FROM app.syllabus_session_tasks 
  WHERE task_key LIKE 'SPOKEN::%' OR subject IN ('Spoken English', 'Spoken Skills');

  DELETE FROM app.syllabus_lessons 
  WHERE subject IN ('Spoken English', 'Spoken Skills') OR item_type = 'SpokenEnglish';

  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Nursery_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Nursery_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/LKG_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/LKG_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/UKG_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/UKG_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_1_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_1_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_2_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_2_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_3_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_3_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_4_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_4_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_5_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_5_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_6_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_6_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_7_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_7_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_8_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_8_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_9_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_9_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'SpokenEnglish', 10, '1', 'November', 'spoken_pdf/Class_10_Day_1.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'SpokenEnglish', 20, '2', 'November', 'spoken_pdf/Class_10_Day_2.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Nursery_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 4: చర్యలు: Clap, Jump, Sit, Stand', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Nursery_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/LKG_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/LKG_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/UKG_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయగలను?', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/UKG_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_1_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_1_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_2_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_2_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_3_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_3_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_4_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_4_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_5_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_5_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_6_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_6_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_7_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_7_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_8_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_8_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_9_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_9_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'SpokenEnglish', 30, '3', 'November', 'spoken_pdf/Class_10_Day_3.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'SpokenEnglish', 40, '4', 'November', 'spoken_pdf/Class_10_Day_4.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Nursery_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 6: రేపు చేసే పనులు: Today / Tomorrow', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Nursery_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/LKG_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/LKG_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/UKG_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/UKG_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_1_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_1_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_2_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_2_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_3_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_3_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_4_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_4_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_5_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_5_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_6_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_6_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_7_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_7_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_8_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_8_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_9_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_9_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'SpokenEnglish', 50, '5', 'November', 'spoken_pdf/Class_10_Day_5.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'SpokenEnglish', 60, '6', 'November', 'spoken_pdf/Class_10_Day_6.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 7: చర్యలను చూసి చెప్పడం: I am clapping / I am eating', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Nursery_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Nursery', 'Spoken English', 'Day 8: రేపు చేయబోయే పని: Tomorrow we will be playing', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Nursery_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 7: చిన్న action sentences: I am reading / He is playing', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/LKG_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('LKG', 'Spoken English', 'Day 8: Tomorrow at a time: I will be playing / I will be singing', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/LKG_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 7: I am / He is / They are + action word', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/UKG_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('UKG', 'Spoken English', 'Day 8: Future action in progress: I will be ...ing', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/UKG_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 7: What are you doing? – I am ...ing', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_1_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 1', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_1_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 7: ఇప్పుడు జరుగుతున్న పనులు: positive, negative, short questions', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_2_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 2', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_2_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 7: Present Continuous: now actions, negatives and questions', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_3_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 3', 'Spoken English', 'Day 8: Future Continuous: a future action in progress at a stated time', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_3_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 7: Classroom actions happening now: describing what classmates are doing', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_4_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 4', 'Spoken English', 'Day 8: Tomorrow at a clock time: saying what we will be doing', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_4_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 7: Class task in progress: describing work and asking follow-up questions', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_5_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 5', 'Spoken English', 'Day 8: Tomorrow’s programme: describing activities at a planned time', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_5_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 7: Present Continuous: sentence pattern, subject agreement and Simple Present contrast', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_6_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 6', 'Spoken English', 'Day 8: Future Continuous: affirmative, negative, questions and contrast with will + V1', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_6_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 7: Group project updates: ongoing actions and progress questions', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_7_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 7', 'Spoken English', 'Day 8: Team schedule: future activities happening at the same time', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_7_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 7: Science observation: describing an experiment in progress', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_8_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 8', 'Spoken English', 'Day 8: Laboratory and event timetable: future actions in progress', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_8_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 7: Present Continuous: current activity, temporary situations and common verb choices', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_9_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 9', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_9_Day_8.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 7: Progress updates: current work, temporary situations and precise questions', 'SpokenEnglish', 70, '7', 'November', 'spoken_pdf/Class_10_Day_7.pdf');
  INSERT INTO app.syllabus_lessons (class, subject, name, item_type, sort_order, lesson_no, target_month, drive_link)
  VALUES ('Class 10', 'Spoken English', 'Day 8: Future project schedule: overlapping activities and polite enquiries', 'SpokenEnglish', 80, '8', 'November', 'spoken_pdf/Class_10_Day_8.pdf');

  -- Checklist Tasks
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 1, 'SPOKEN::Nursery::1::CHK::1', 'Explained the Greetings: Hello, Good morning, Bye-bye topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 2, 'SPOKEN::Nursery::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 3, 'SPOKEN::Nursery::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 1: Greetings: Hello, Good morning, Bye-bye', 'Daily Checklist', 4, 'SPOKEN::Nursery::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 1, 'SPOKEN::Nursery::2::CHK::1', 'Explained the Classroom objects: book, bag, pen, chair topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 2, 'SPOKEN::Nursery::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 3, 'SPOKEN::Nursery::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 2: Classroom objects: book, bag, pen, chair', 'Daily Checklist', 4, 'SPOKEN::Nursery::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 1, 'SPOKEN::LKG::1::CHK::1', 'Explained the Greetings and my name topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 2, 'SPOKEN::LKG::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 3, 'SPOKEN::LKG::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 1: Greetings and my name', 'Daily Checklist', 4, 'SPOKEN::LKG::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 1, 'SPOKEN::LKG::2::CHK::1', 'Explained the Classroom objects: This is a… topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 2, 'SPOKEN::LKG::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 3, 'SPOKEN::LKG::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 2: Classroom objects: This is a…', 'Daily Checklist', 4, 'SPOKEN::LKG::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::UKG::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::UKG::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::UKG::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::UKG::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 1, 'SPOKEN::UKG::2::CHK::1', 'Explained the Classroom objects and What is this? topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 2, 'SPOKEN::UKG::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 3, 'SPOKEN::UKG::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 2: Classroom objects and What is this?', 'Daily Checklist', 4, 'SPOKEN::UKG::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 1::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 1::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 1::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 1::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 1, 'SPOKEN::Class 1::2::CHK::1', 'Explained the Classroom objects: This is a… / It is a… topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 2, 'SPOKEN::Class 1::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 3, 'SPOKEN::Class 1::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 4, 'SPOKEN::Class 1::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 2::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 2::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 2::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 2::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 1, 'SPOKEN::Class 2::2::CHK::1', 'Explained the Classroom objects: This is a… / It is a… topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 2, 'SPOKEN::Class 2::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 3, 'SPOKEN::Class 2::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 2: Classroom objects: This is a… / It is a…', 'Daily Checklist', 4, 'SPOKEN::Class 2::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 3::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 3::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 3::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 3::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 3::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 3::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 3::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 3::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 4::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 4::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 4::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 4::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 4::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 4::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 4::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 4::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 5::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 5::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 5::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 5::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 5::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 5::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 5::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 5::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 6::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 6::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 6::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 6::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 6::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 6::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 6::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 6::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 7::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 7::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 7::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 7::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 7::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 7::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 7::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 7::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 8::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 8::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 8::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 8::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 8::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 8::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 8::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 8::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 9::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 9::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 9::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 9::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 9::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 9::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 9::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 9::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 1, 'SPOKEN::Class 10::1::CHK::1', 'Explained the Greetings and self-introduction topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 2, 'SPOKEN::Class 10::1::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 3, 'SPOKEN::Class 10::1::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 1: Greetings and self-introduction', 'Daily Checklist', 4, 'SPOKEN::Class 10::1::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 1, 'SPOKEN::Class 10::2::CHK::1', 'Explained the Introducing a classmate and describing classroom objects topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 2, 'SPOKEN::Class 10::2::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 3, 'SPOKEN::Class 10::2::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 2: Introducing a classmate and describing classroom objects', 'Daily Checklist', 4, 'SPOKEN::Class 10::2::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం', 'Daily Checklist', 1, 'SPOKEN::Nursery::3::CHK::1', 'Explained the ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం', 'Daily Checklist', 2, 'SPOKEN::Nursery::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం', 'Daily Checklist', 3, 'SPOKEN::Nursery::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 3: ప్రశ్న విని వస్తువు లేదా వ్యక్తిని చూపించడం', 'Daily Checklist', 4, 'SPOKEN::Nursery::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 4: చర్యలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 1, 'SPOKEN::Nursery::4::CHK::1', 'Explained the చర్యలు: Clap, Jump, Sit, Stand topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 4: చర్యలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 2, 'SPOKEN::Nursery::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 4: చర్యలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 3, 'SPOKEN::Nursery::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 4: చర్యలు: Clap, Jump, Sit, Stand', 'Daily Checklist', 4, 'SPOKEN::Nursery::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 1, 'SPOKEN::LKG::3::CHK::1', 'Explained the What is this? Who is this? Where is it? topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 2, 'SPOKEN::LKG::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 3, 'SPOKEN::LKG::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 3: What is this? Who is this? Where is it?', 'Daily Checklist', 4, 'SPOKEN::LKG::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 1, 'SPOKEN::LKG::4::CHK::1', 'Explained the I can…: Action sentences topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 2, 'SPOKEN::LKG::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 3, 'SPOKEN::LKG::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 4: I can…: Action sentences', 'Daily Checklist', 4, 'SPOKEN::LKG::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 1, 'SPOKEN::UKG::3::CHK::1', 'Explained the What, Who and Where questions topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 2, 'SPOKEN::UKG::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 3, 'SPOKEN::UKG::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 3: What, Who and Where questions', 'Daily Checklist', 4, 'SPOKEN::UKG::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయగలను?', 'Daily Checklist', 1, 'SPOKEN::UKG::4::CHK::1', 'Explained the I can / I cannot: ఏమి చేయగలను? topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయగలను?', 'Daily Checklist', 2, 'SPOKEN::UKG::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయగలను?', 'Daily Checklist', 3, 'SPOKEN::UKG::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 4: I can / I cannot: ఏమి చేయగలను?', 'Daily Checklist', 4, 'SPOKEN::UKG::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 1, 'SPOKEN::Class 1::3::CHK::1', 'Explained the Question words: What, Who, Where topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 2, 'SPOKEN::Class 1::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 3, 'SPOKEN::Class 1::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 4, 'SPOKEN::Class 1::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 1, 'SPOKEN::Class 1::4::CHK::1', 'Explained the Can / cannot: ability and simple requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 2, 'SPOKEN::Class 1::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 3, 'SPOKEN::Class 1::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 4, 'SPOKEN::Class 1::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 1, 'SPOKEN::Class 2::3::CHK::1', 'Explained the Question words: What, Who, Where topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 2, 'SPOKEN::Class 2::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 3, 'SPOKEN::Class 2::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 3: Question words: What, Who, Where', 'Daily Checklist', 4, 'SPOKEN::Class 2::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 1, 'SPOKEN::Class 2::4::CHK::1', 'Explained the Can / cannot: ability and simple requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 2, 'SPOKEN::Class 2::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 3, 'SPOKEN::Class 2::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 4: Can / cannot: ability and simple requests', 'Daily Checklist', 4, 'SPOKEN::Class 2::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 3::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 3::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 3::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 3::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 3::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 3::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 3::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 3::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 4::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 4::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 4::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 4::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 4::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 4::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 4::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 4::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 1, 'SPOKEN::Class 5::3::CHK::1', 'Explained the Question words: What, Who, Where, When topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 2, 'SPOKEN::Class 5::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 3, 'SPOKEN::Class 5::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 3: Question words: What, Who, Where, When', 'Daily Checklist', 4, 'SPOKEN::Class 5::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 1, 'SPOKEN::Class 5::4::CHK::1', 'Explained the Can / cannot: abilities, permission and help topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 2, 'SPOKEN::Class 5::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 3, 'SPOKEN::Class 5::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 4: Can / cannot: abilities, permission and help', 'Daily Checklist', 4, 'SPOKEN::Class 5::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 6::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 6::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 6::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 6::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 6::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 6::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 6::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 6::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 7::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 7::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 7::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 7::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 7::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 7::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 7::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 7::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 1, 'SPOKEN::Class 8::3::CHK::1', 'Explained the Question words and correct question order topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 2, 'SPOKEN::Class 8::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 3, 'SPOKEN::Class 8::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 3: Question words and correct question order', 'Daily Checklist', 4, 'SPOKEN::Class 8::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 1, 'SPOKEN::Class 8::4::CHK::1', 'Explained the Can / cannot: ability, permission and requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 2, 'SPOKEN::Class 8::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 3, 'SPOKEN::Class 8::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 4: Can / cannot: ability, permission and requests', 'Daily Checklist', 4, 'SPOKEN::Class 8::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 1, 'SPOKEN::Class 9::3::CHK::1', 'Explained the Question words for a short interview topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 2, 'SPOKEN::Class 9::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 3, 'SPOKEN::Class 9::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 4, 'SPOKEN::Class 9::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 1, 'SPOKEN::Class 9::4::CHK::1', 'Explained the Can: ability, permission and polite requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 2, 'SPOKEN::Class 9::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 3, 'SPOKEN::Class 9::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 4, 'SPOKEN::Class 9::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 1, 'SPOKEN::Class 10::3::CHK::1', 'Explained the Question words for a short interview topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 2, 'SPOKEN::Class 10::3::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 3, 'SPOKEN::Class 10::3::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 3: Question words for a short interview', 'Daily Checklist', 4, 'SPOKEN::Class 10::3::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 1, 'SPOKEN::Class 10::4::CHK::1', 'Explained the Can: ability, permission and polite requests topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 2, 'SPOKEN::Class 10::4::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 3, 'SPOKEN::Class 10::4::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 4: Can: ability, permission and polite requests', 'Daily Checklist', 4, 'SPOKEN::Class 10::4::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 1, 'SPOKEN::Nursery::5::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 2, 'SPOKEN::Nursery::5::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: Eat, Drink, Play, Sleep', 'Daily Checklist', 3, 'SPOKEN::Nursery::5::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 6: రేపు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 1, 'SPOKEN::Nursery::6::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 6: రేపు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 2, 'SPOKEN::Nursery::6::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 6: రేపు చేసే పనులు: Today / Tomorrow', 'Daily Checklist', 3, 'SPOKEN::Nursery::6::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 1, 'SPOKEN::LKG::5::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 2, 'SPOKEN::LKG::5::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 3, 'SPOKEN::LKG::5::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 1, 'SPOKEN::LKG::6::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 2, 'SPOKEN::LKG::6::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 3, 'SPOKEN::LKG::6::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 1, 'SPOKEN::UKG::5::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 2, 'SPOKEN::UKG::5::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 5: రోజూ చేసే పనులు: I eat, I play, I sleep', 'Daily Checklist', 3, 'SPOKEN::UKG::5::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 1, 'SPOKEN::UKG::6::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 2, 'SPOKEN::UKG::6::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 6: Tomorrow: I will play / I will sing', 'Daily Checklist', 3, 'SPOKEN::UKG::6::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 1, 'SPOKEN::Class 1::5::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 2, 'SPOKEN::Class 1::5::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 3, 'SPOKEN::Class 1::5::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 1, 'SPOKEN::Class 1::6::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 2, 'SPOKEN::Class 1::6::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 3, 'SPOKEN::Class 1::6::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 1, 'SPOKEN::Class 2::5::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 2, 'SPOKEN::Class 2::5::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 5: రోజువారీ అలవాట్లు: Do you…? / Yes, I do.', 'Daily Checklist', 3, 'SPOKEN::Class 2::5::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 1, 'SPOKEN::Class 2::6::CHK::1', 'నేను ముందురోజు వీడియో చూసి, వాక్యాలను practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 2, 'SPOKEN::Class 2::6::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం ఇచ్చాను; notebook రాయించడానికే సమయం ఖర్చు చేయలేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 6: Future plans: I will… / Will you…?', 'Daily Checklist', 3, 'SPOKEN::Class 2::6::CHK::3', 'ఎవరికి ఇంకా సహాయం అవసరమో గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 1, 'SPOKEN::Class 3::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 2, 'SPOKEN::Class 3::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 3, 'SPOKEN::Class 3::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 4, 'SPOKEN::Class 3::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 3::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 3::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 3::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 3::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 1, 'SPOKEN::Class 4::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 2, 'SPOKEN::Class 4::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 3, 'SPOKEN::Class 4::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 4, 'SPOKEN::Class 4::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 4::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 4::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 4::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 4::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 1, 'SPOKEN::Class 5::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 2, 'SPOKEN::Class 5::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 3, 'SPOKEN::Class 5::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 5: Do / Does: రోజువారీ అలవాట్లగురించి ప్రశ్నలు', 'Daily Checklist', 4, 'SPOKEN::Class 5::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 1, 'SPOKEN::Class 5::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 2, 'SPOKEN::Class 5::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 3, 'SPOKEN::Class 5::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 6: Future plans: will, won''t and questions', 'Daily Checklist', 4, 'SPOKEN::Class 5::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 6::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 6::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 6::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 6::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 6::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 6::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 6::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 6::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 7::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 7::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 7::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 7::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 7::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 7::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 7::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 7::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 8::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 8::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 8::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 8::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 8::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 8::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 8::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 8::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 9::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 9::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 9::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 9::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 9::6::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 9::6::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 9::6::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 9::6::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 1, 'SPOKEN::Class 10::5::CHK::1', 'నేను ముందురోజు assigned video చూసి, ముఖ్యమైన వాక్యాలను 5 సార్లు practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 2, 'SPOKEN::Class 10::5::CHK::2', 'నేను నేర్చుకున్న patternను నా మాటల్లో అర్థం చేసుకుని పిల్లలకు సరళంగా వివరించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 3, 'SPOKEN::Class 10::5::CHK::3', 'ప్రతి విద్యార్థికి ప్రశ్న అడగడానికి, సమాధానం చెప్పడానికి మరియు జంటలుగా practice చేయడానికి అవకాశం', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 5: Do / Does: habits, questions and negative sentences', 'Daily Checklist', 4, 'SPOKEN::Class 10::5::CHK::4', 'తప్పు వాక్యాలను సరిగా model చేసి, సహాయం అవసరమైనవారిని గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 1, 'SPOKEN::Class 10::6::CHK::1', 'Explained the Will / Shall: future actions, offers and suggestions topic with target sentence models.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 2, 'SPOKEN::Class 10::6::CHK::2', 'Practised target sentences and pronunciations with all students.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 3, 'SPOKEN::Class 10::6::CHK::3', 'Conducted pair/group speaking activities and encouraged student participation.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 6: Will / Shall: future actions, offers and suggestions', 'Daily Checklist', 4, 'SPOKEN::Class 10::6::CHK::4', 'Identified and gently corrected common pronunciation and grammar errors.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 7: చర్యలను చూసి చెప్పడం: I am clapping / I am eating', 'Daily Checklist', 1, 'SPOKEN::Nursery::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 7: చర్యలను చూసి చెప్పడం: I am clapping / I am eating', 'Daily Checklist', 2, 'SPOKEN::Nursery::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 7: చర్యలను చూసి చెప్పడం: I am clapping / I am eating', 'Daily Checklist', 3, 'SPOKEN::Nursery::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 8: రేపు చేయబోయే పని: Tomorrow we will be playing', 'Daily Checklist', 1, 'SPOKEN::Nursery::8::CHK::1', 'Teacher model మాత్రమే; పిల్లలకు పూర్తిgrammar అవసరం లేదు.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 8: రేపు చేయబోయే పని: Tomorrow we will be playing', 'Daily Checklist', 2, 'SPOKEN::Nursery::8::CHK::2', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 8: రేపు చేయబోయే పని: Tomorrow we will be playing', 'Daily Checklist', 3, 'SPOKEN::Nursery::8::CHK::3', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Nursery', 'Spoken English', 'Day 8: రేపు చేయబోయే పని: Tomorrow we will be playing', 'Daily Checklist', 4, 'SPOKEN::Nursery::8::CHK::4', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 7: చిన్న action sentences: I am reading / He is playing', 'Daily Checklist', 1, 'SPOKEN::LKG::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 7: చిన్న action sentences: I am reading / He is playing', 'Daily Checklist', 2, 'SPOKEN::LKG::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 7: చిన్న action sentences: I am reading / He is playing', 'Daily Checklist', 3, 'SPOKEN::LKG::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 8: Tomorrow at a time: I will be playing / I will be singing', 'Daily Checklist', 1, 'SPOKEN::LKG::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 8: Tomorrow at a time: I will be playing / I will be singing', 'Daily Checklist', 2, 'SPOKEN::LKG::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('LKG', 'Spoken English', 'Day 8: Tomorrow at a time: I will be playing / I will be singing', 'Daily Checklist', 3, 'SPOKEN::LKG::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 7: I am / He is / They are + action word', 'Daily Checklist', 1, 'SPOKEN::UKG::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 7: I am / He is / They are + action word', 'Daily Checklist', 2, 'SPOKEN::UKG::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 7: I am / He is / They are + action word', 'Daily Checklist', 3, 'SPOKEN::UKG::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 8: Future action in progress: I will be ...ing', 'Daily Checklist', 1, 'SPOKEN::UKG::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 8: Future action in progress: I will be ...ing', 'Daily Checklist', 2, 'SPOKEN::UKG::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('UKG', 'Spoken English', 'Day 8: Future action in progress: I will be ...ing', 'Daily Checklist', 3, 'SPOKEN::UKG::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 7: What are you doing? – I am ...ing', 'Daily Checklist', 1, 'SPOKEN::Class 1::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 7: What are you doing? – I am ...ing', 'Daily Checklist', 2, 'SPOKEN::Class 1::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 7: What are you doing? – I am ...ing', 'Daily Checklist', 3, 'SPOKEN::Class 1::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 1, 'SPOKEN::Class 1::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 2, 'SPOKEN::Class 1::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 1', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 3, 'SPOKEN::Class 1::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 7: ఇప్పుడు జరుగుతున్న పనులు: positive, negative, short questions', 'Daily Checklist', 1, 'SPOKEN::Class 2::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 7: ఇప్పుడు జరుగుతున్న పనులు: positive, negative, short questions', 'Daily Checklist', 2, 'SPOKEN::Class 2::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 7: ఇప్పుడు జరుగుతున్న పనులు: positive, negative, short questions', 'Daily Checklist', 3, 'SPOKEN::Class 2::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 1, 'SPOKEN::Class 2::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 2, 'SPOKEN::Class 2::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 2', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 3, 'SPOKEN::Class 2::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 7: Present Continuous: now actions, negatives and questions', 'Daily Checklist', 1, 'SPOKEN::Class 3::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 7: Present Continuous: now actions, negatives and questions', 'Daily Checklist', 2, 'SPOKEN::Class 3::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 7: Present Continuous: now actions, negatives and questions', 'Daily Checklist', 3, 'SPOKEN::Class 3::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 8: Future Continuous: a future action in progress at a stated time', 'Daily Checklist', 1, 'SPOKEN::Class 3::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 8: Future Continuous: a future action in progress at a stated time', 'Daily Checklist', 2, 'SPOKEN::Class 3::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 3', 'Spoken English', 'Day 8: Future Continuous: a future action in progress at a stated time', 'Daily Checklist', 3, 'SPOKEN::Class 3::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 7: Classroom actions happening now: describing what classmates are doing', 'Daily Checklist', 1, 'SPOKEN::Class 4::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 7: Classroom actions happening now: describing what classmates are doing', 'Daily Checklist', 2, 'SPOKEN::Class 4::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 7: Classroom actions happening now: describing what classmates are doing', 'Daily Checklist', 3, 'SPOKEN::Class 4::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 8: Tomorrow at a clock time: saying what we will be doing', 'Daily Checklist', 1, 'SPOKEN::Class 4::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 8: Tomorrow at a clock time: saying what we will be doing', 'Daily Checklist', 2, 'SPOKEN::Class 4::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 4', 'Spoken English', 'Day 8: Tomorrow at a clock time: saying what we will be doing', 'Daily Checklist', 3, 'SPOKEN::Class 4::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 7: Class task in progress: describing work and asking follow-up questions', 'Daily Checklist', 1, 'SPOKEN::Class 5::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 7: Class task in progress: describing work and asking follow-up questions', 'Daily Checklist', 2, 'SPOKEN::Class 5::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 7: Class task in progress: describing work and asking follow-up questions', 'Daily Checklist', 3, 'SPOKEN::Class 5::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 8: Tomorrow’s programme: describing activities at a planned time', 'Daily Checklist', 1, 'SPOKEN::Class 5::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 8: Tomorrow’s programme: describing activities at a planned time', 'Daily Checklist', 2, 'SPOKEN::Class 5::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 5', 'Spoken English', 'Day 8: Tomorrow’s programme: describing activities at a planned time', 'Daily Checklist', 3, 'SPOKEN::Class 5::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 7: Present Continuous: sentence pattern, subject agreement and Simple Present contrast', 'Daily Checklist', 1, 'SPOKEN::Class 6::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 7: Present Continuous: sentence pattern, subject agreement and Simple Present contrast', 'Daily Checklist', 2, 'SPOKEN::Class 6::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 7: Present Continuous: sentence pattern, subject agreement and Simple Present contrast', 'Daily Checklist', 3, 'SPOKEN::Class 6::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 8: Future Continuous: affirmative, negative, questions and contrast with will + V1', 'Daily Checklist', 1, 'SPOKEN::Class 6::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 8: Future Continuous: affirmative, negative, questions and contrast with will + V1', 'Daily Checklist', 2, 'SPOKEN::Class 6::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 6', 'Spoken English', 'Day 8: Future Continuous: affirmative, negative, questions and contrast with will + V1', 'Daily Checklist', 3, 'SPOKEN::Class 6::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 7: Group project updates: ongoing actions and progress questions', 'Daily Checklist', 1, 'SPOKEN::Class 7::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 7: Group project updates: ongoing actions and progress questions', 'Daily Checklist', 2, 'SPOKEN::Class 7::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 7: Group project updates: ongoing actions and progress questions', 'Daily Checklist', 3, 'SPOKEN::Class 7::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 8: Team schedule: future activities happening at the same time', 'Daily Checklist', 1, 'SPOKEN::Class 7::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 8: Team schedule: future activities happening at the same time', 'Daily Checklist', 2, 'SPOKEN::Class 7::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 7', 'Spoken English', 'Day 8: Team schedule: future activities happening at the same time', 'Daily Checklist', 3, 'SPOKEN::Class 7::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 7: Science observation: describing an experiment in progress', 'Daily Checklist', 1, 'SPOKEN::Class 8::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 7: Science observation: describing an experiment in progress', 'Daily Checklist', 2, 'SPOKEN::Class 8::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 7: Science observation: describing an experiment in progress', 'Daily Checklist', 3, 'SPOKEN::Class 8::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 8: Laboratory and event timetable: future actions in progress', 'Daily Checklist', 1, 'SPOKEN::Class 8::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 8: Laboratory and event timetable: future actions in progress', 'Daily Checklist', 2, 'SPOKEN::Class 8::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 8', 'Spoken English', 'Day 8: Laboratory and event timetable: future actions in progress', 'Daily Checklist', 3, 'SPOKEN::Class 8::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 7: Present Continuous: current activity, temporary situations and common verb choices', 'Daily Checklist', 1, 'SPOKEN::Class 9::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 7: Present Continuous: current activity, temporary situations and common verb choices', 'Daily Checklist', 2, 'SPOKEN::Class 9::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 7: Present Continuous: current activity, temporary situations and common verb choices', 'Daily Checklist', 3, 'SPOKEN::Class 9::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 1, 'SPOKEN::Class 9::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 2, 'SPOKEN::Class 9::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 9', 'Spoken English', 'Day 8: Future Progressive: ongoing action at a future time, questions and polite enquiries', 'Daily Checklist', 3, 'SPOKEN::Class 9::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 7: Progress updates: current work, temporary situations and precise questions', 'Daily Checklist', 1, 'SPOKEN::Class 10::7::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 7: Progress updates: current work, temporary situations and precise questions', 'Daily Checklist', 2, 'SPOKEN::Class 10::7::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 7: Progress updates: current work, temporary situations and precise questions', 'Daily Checklist', 3, 'SPOKEN::Class 10::7::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 8: Future project schedule: overlapping activities and polite enquiries', 'Daily Checklist', 1, 'SPOKEN::Class 10::8::CHK::1', 'నేను ముందురోజు వీడియో చూసి, topic అర్థం చేసుకుని, examples practice చేశాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 8: Future project schedule: overlapping activities and polite enquiries', 'Daily Checklist', 2, 'SPOKEN::Class 10::8::CHK::2', 'పిల్లలకు మాట్లాడే అవకాశం, pair practice సమయం ఇచ్చాను.', false);
  INSERT INTO app.syllabus_session_tasks (class, subject, lesson_name, session_name, task_num, task_key, content, checked)
  VALUES ('Class 10', 'Spoken English', 'Day 8: Future project schedule: overlapping activities and polite enquiries', 'Daily Checklist', 3, 'SPOKEN::Class 10::8::CHK::3', 'సహాయం అవసరమైన విద్యార్థులను గుర్తించాను.', false);

END $$;
