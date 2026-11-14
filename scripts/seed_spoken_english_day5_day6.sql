-- =========================================================================

-- SPOKEN ENGLISH LESSONS & CHECKLIST SEED SCRIPT (DAY 5 & DAY 6)

-- =========================================================================


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