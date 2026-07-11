-- ============================================
-- COLLEGES DATA
-- Real data from the system
-- ============================================

INSERT INTO public.colleges (college_name, college_code, description, display_order)
VALUES
  ('College of Education, Arts, and Sciences', 'CEAS001', 'Focuses on education, humanities, social sciences, and arts programs', 1),
  ('College of Technology, Management, and Entrepreneurship', 'CTME001', 'Specializes in technology, business management, hospitality, and entrepreneurship programs', 2)
ON CONFLICT (college_name) DO NOTHING;
