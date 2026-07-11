-- ============================================
-- COURSE MAJORS DATA
-- One major subject per program
-- ============================================

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Information Technology', 'MAJ-IT', 'Primary specialization for the BSIT program.'
FROM public.courses c
WHERE c.course_code = 'CRS5E6F'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Financial Management', 'MAJ-FIN', 'Major for BSBA Financial Management.'
FROM public.courses c
WHERE c.course_code = 'CRS4FIN'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Hospitality Management', 'MAJ-HM', 'Major for Hospitality Management.'
FROM public.courses c
WHERE c.course_code = 'CRS9S0T'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Elementary Education', 'MAJ-BEED', 'Major for Elementary Education program.'
FROM public.courses c
WHERE c.course_code = 'CRS7A8B'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'English', 'MAJ-ENG', 'Major for Secondary Education - English.'
FROM public.courses c
WHERE c.course_code = 'CRS1ENG'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Filipino', 'MAJ-FIL', 'Major for Secondary Education - Filipino.'
FROM public.courses c
WHERE c.course_code = 'CRS3FIL'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Mathematics', 'MAJ-MATH', 'Major for Secondary Education - Mathematics.'
FROM public.courses c
WHERE c.course_code = 'CRS2MAT'
ON CONFLICT (course_id) DO NOTHING;

INSERT INTO public.course_majors (course_id, major_name, major_code, description)
SELECT c.id, 'Political Science', 'MAJ-POLS', 'Major for BA Political Science.'
FROM public.courses c
WHERE c.course_code = 'CRS5POL'
ON CONFLICT (course_id) DO NOTHING;


