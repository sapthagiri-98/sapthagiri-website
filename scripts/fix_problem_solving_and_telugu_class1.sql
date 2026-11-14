-- ==============================================================================
-- 1. Fix Problem Solving / PS Subject Name Mismatch
-- ==============================================================================
-- The timetable assigns teacher Anusha with subject = 'Problem Solving'.
-- In syllabus_lessons, lessons were recorded under subject = 'PS'.
-- This updates all tables to consistently use 'Problem Solving'.

UPDATE app.syllabus_lessons
SET subject = 'Problem Solving'
WHERE subject IN ('PS', 'Problem Solving (PS)');

UPDATE app.syllabus_lesson_progress
SET subject = 'Problem Solving'
WHERE subject IN ('PS', 'Problem Solving (PS)');

UPDATE app.syllabus_session_tasks
SET subject = 'Problem Solving'
WHERE subject IN ('PS', 'Problem Solving (PS)');

-- ==============================================================================
-- 2. Seed Class 1 Telugu Lessons (Telangana SCERT - జాబిల్లి 1)
-- ==============================================================================
-- Class 1 had 0 Telugu lessons recorded in syllabus_lessons (while Classes 2-10
-- have 15-25 lessons each). This inserts the 15 standard Telugu reader units.

INSERT INTO app.syllabus_lessons (class, subject, strand_subject, lesson_no, name, target_month, sort_order, item_type)
VALUES
  ('1', 'Telugu', '', '1',  'బడికి పోదాం (గేయం)', 'June', 10, 'Manual'),
  ('1', 'Telugu', '', '2',  'తకధిమితోం (గేయం)', 'July', 20, 'Manual'),
  ('1', 'Telugu', '', '3',  'ఆట (గేయం)', 'July', 30, 'Manual'),
  ('1', 'Telugu', '', '4',  'ఉంగరం (గేయం)', 'August', 40, 'Manual'),
  ('1', 'Telugu', '', '5',  'ఊయల (గేయం)', 'August', 50, 'Manual'),
  ('1', 'Telugu', '', '6',  'ఇల్లు - ఈగ (గేయం)', 'September', 60, 'Manual'),
  ('1', 'Telugu', '', '7',  'ఎలుక - ఏనుగు (గేయం)', 'September', 70, 'Manual'),
  ('1', 'Telugu', '', '8',  'ఒంటె - ఓడ (గేయం)', 'October', 80, 'Manual'),
  ('1', 'Telugu', '', '9',  'కలం - గంప (గేయం)', 'November', 90, 'Manual'),
  ('1', 'Telugu', '', '10', 'చందమామ - జడ (గేయం)', 'November', 100, 'Manual'),
  ('1', 'Telugu', '', '11', 'టపాకాయ - డబ్బా (గేయం)', 'December', 110, 'Manual'),
  ('1', 'Telugu', '', '12', 'తబల - దండ (గేయం)', 'January', 120, 'Manual'),
  ('1', 'Telugu', '', '13', 'పలక - బంతి (గేయం)', 'January', 130, 'Manual'),
  ('1', 'Telugu', '', '14', 'మంచం - రథం (గేయం)', 'February', 140, 'Manual'),
  ('1', 'Telugu', '', '15', 'వల - హంస (గేయం)', 'March', 150, 'Manual')
ON CONFLICT DO NOTHING;

-- Verify the update
SELECT class, subject, lesson_no, name, target_month 
FROM app.syllabus_lessons 
WHERE class = '1' AND subject IN ('Problem Solving', 'Telugu')
ORDER BY subject, sort_order;
