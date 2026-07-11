-- ============================================
-- COURSES DATA
-- Real data from the system
-- ============================================

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Secondary Education - English', 'CRS1ENG', 'Specialized English pedagogy for junior and senior high school.', 1
FROM public.colleges c WHERE c.college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Secondary Education - Mathematics', 'CRS2MAT', 'Advanced mathematics instruction strategies for future educators.', 2
FROM public.colleges c WHERE c.college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Secondary Education - Filipino', 'CRS3FIL', 'Language and literature teaching methods for Filipino educators.', 3
FROM public.colleges c WHERE c.college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Elementary Education', 'CRS7A8B', 'Teaching strategies for elementary level.', 4
FROM public.colleges c WHERE c.college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Arts in Political Science', 'CRS5POL', 'Government systems, policy analysis, and public administration training.', 5
FROM public.colleges c WHERE c.college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Science in Hospitality Management', 'CRS9S0T', 'Hotel, tourism, and food-service management.', 1
FROM public.colleges c WHERE c.college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Science in Business Administration - Financial Management', 'CRS4FIN', 'Corporate finance, investment, and financial planning concentration.', 2
FROM public.colleges c WHERE c.college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT c.id, 'Bachelor of Science in Information Technology', 'CRS5E6F', 'Focuses on IT infrastructure, networking, and systems.', 3
FROM public.colleges c WHERE c.college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;
