-- ============================================
-- COURSE SUBJECT OFFERINGS - LAB OFFERINGS
-- Fixes constraint and adds LAB offerings for ALL programs
-- ============================================

-- Step 1: Drop the old constraint that only allows one offering per course/subject
ALTER TABLE public.course_subject_offerings 
  DROP CONSTRAINT IF EXISTS unique_course_subject_offering;

-- Step 2: Create new constraint that allows multiple offering types per course/subject
ALTER TABLE public.course_subject_offerings 
  ADD CONSTRAINT unique_course_subject_offering 
    UNIQUE (course_id, subject_id, offering_type);

-- ============================================
-- ADD LAB OFFERINGS FOR ALL PROGRAMS
-- ============================================

-- Bachelor of Secondary Education - English
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('ENG101', 'ENG102', 'ENG103', 'ENG201', 'ENG202', 'ENG203', 'ENG301', 'ENG302', 'ENG303', 'ENG401', 'ENG402', 'ENG403')
WHERE c.course_name = 'Bachelor of Secondary Education - English'
ON CONFLICT DO NOTHING;

-- Bachelor of Secondary Education - Mathematics
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('MATH101', 'MATH102', 'MATH103', 'MATH201', 'MATH202', 'MATH203', 'MATH301', 'MATH302', 'MATH303', 'MATH401', 'MATH402', 'MATH403')
WHERE c.course_name = 'Bachelor of Secondary Education - Mathematics'
ON CONFLICT DO NOTHING;

-- Bachelor of Secondary Education - Filipino
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('FIL101', 'FIL102', 'FIL103', 'FIL201', 'FIL202', 'FIL203', 'FIL301', 'FIL302', 'FIL303', 'FIL401', 'FIL402', 'FIL403')
WHERE c.course_name = 'Bachelor of Secondary Education - Filipino'
ON CONFLICT DO NOTHING;

-- Bachelor of Elementary Education
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('BEED101', 'BEED102', 'BEED103', 'BEED201', 'BEED202', 'BEED203', 'BEED301', 'BEED302', 'BEED303', 'BEED401', 'BEED402', 'BEED403')
WHERE c.course_name = 'Bachelor of Elementary Education'
ON CONFLICT DO NOTHING;

-- Bachelor of Arts in Political Science
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('POLS101', 'POLS102', 'POLS103', 'POLS201', 'POLS202', 'POLS203', 'POLS301', 'POLS302', 'POLS303', 'POLS401', 'POLS402', 'POLS403')
WHERE c.course_name = 'Bachelor of Arts in Political Science'
ON CONFLICT DO NOTHING;

-- Bachelor of Science in Hospitality Management
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('HM101', 'HM102', 'HM103', 'HM201', 'HM202', 'HM203', 'HM301', 'HM302', 'HM303', 'HM401', 'HM402', 'HM403')
WHERE c.course_name = 'Bachelor of Science in Hospitality Management'
ON CONFLICT DO NOTHING;

-- Bachelor of Science in Business Administration - Financial Management
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('BUS101', 'BUS102', 'BUS103', 'BUS201', 'BUS202', 'BUS203', 'BUS301', 'BUS302', 'BUS303', 'BUS401', 'BUS402', 'BUS403', 'BUS404')
WHERE c.course_name = 'Bachelor of Science in Business Administration - Financial Management'
ON CONFLICT DO NOTHING;

-- Bachelor of Science in Information Technology
INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, 'LAB', 0, 3, 3
FROM public.courses c
JOIN public.subjects s ON s.subject_code IN ('IT101', 'IT102', 'IT103', 'IT201', 'IT202', 'IT203', 'IT301', 'IT302', 'IT303', 'IT401', 'IT402', 'IT403', 'IT404')
WHERE c.course_name = 'Bachelor of Science in Information Technology'
ON CONFLICT DO NOTHING;

 UPDATE public.course_subject_offerings
 SET contact_hours = COALESCE(lecture_units, 0) * 1 + COALESCE(lab_units, 0) * 3
 WHERE contact_hours IS DISTINCT FROM (COALESCE(lecture_units, 0) * 1 + COALESCE(lab_units, 0) * 3);
