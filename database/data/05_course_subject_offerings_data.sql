-- ============================================
-- COURSE SUBJECT OFFERINGS DATA
-- Real data aligned with actual colleges and courses
-- ============================================

WITH offering_rows(course_name, subject_code, offering_type, lecture_units, lab_units, contact_hours) AS (
    VALUES
        -- ========== GENERAL EDUCATION - REQUIRED FOR ALL PROGRAMS ==========
        ('Bachelor of Secondary Education - English', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Secondary Education - Mathematics', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Secondary Education - Filipino', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Elementary Education', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Science in Hospitality Management', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Science in Business Administration - Financial Management', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Science in Information Technology', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'GE105', 'LEC', 2, 0, 2),

        ('Bachelor of Arts in Political Science', 'GE101', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'GE102', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'GE103', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'GE104', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'GE105', 'LEC', 2, 0, 2),

        -- ========== MAJOR SUBJECTS BY PROGRAM ==========
        -- Bachelor of Secondary Education - English
        ('Bachelor of Secondary Education - English', 'ENG101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG201', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG202', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG203', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG301', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG302', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG303', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG401', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG402', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - English', 'ENG403', 'LEC', 6, 0, 9),

        -- Bachelor of Secondary Education - Mathematics
        ('Bachelor of Secondary Education - Mathematics', 'MATH101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH201', 'LEC', 4, 0, 4),
        ('Bachelor of Secondary Education - Mathematics', 'MATH202', 'LEC', 4, 0, 4),
        ('Bachelor of Secondary Education - Mathematics', 'MATH203', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH301', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH302', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH303', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH401', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH402', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Mathematics', 'MATH403', 'LEC', 6, 0, 9),

        -- Bachelor of Secondary Education - Filipino
        ('Bachelor of Secondary Education - Filipino', 'FIL101', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL102', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL103', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL201', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL202', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL203', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL301', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL302', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL303', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL401', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL402', 'LEC', 3, 0, 3),
        ('Bachelor of Secondary Education - Filipino', 'FIL403', 'LEC', 6, 0, 9),

        -- Bachelor of Elementary Education
        ('Bachelor of Elementary Education', 'BEED101', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED102', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED103', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED201', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED202', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED203', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED301', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED302', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED303', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED401', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED402', 'LEC', 3, 0, 3),
        ('Bachelor of Elementary Education', 'BEED403', 'LEC', 6, 0, 9),

        -- Bachelor of Science in Hospitality Management
        ('Bachelor of Science in Hospitality Management', 'HM101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM201', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM202', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM203', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM301', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM302', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM303', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM401', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM402', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Hospitality Management', 'HM403', 'LEC', 6, 0, 9),

        -- Bachelor of Science in Business Administration - Financial Management
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS201', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS202', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS203', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS301', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS302', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS303', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS401', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS402', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS403', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Business Administration - Financial Management', 'BUS404', 'LEC', 3, 0, 3),

        -- Bachelor of Science in Information Technology
        ('Bachelor of Science in Information Technology', 'IT101', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT102', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT103', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT201', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT202', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT203', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT301', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT302', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT303', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT401', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT402', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT403', 'LEC', 3, 0, 3),
        ('Bachelor of Science in Information Technology', 'IT404', 'LEC', 3, 0, 3),

        -- Bachelor of Arts in Political Science
        ('Bachelor of Arts in Political Science', 'POLS101', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS102', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS103', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS201', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS202', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS203', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS301', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS302', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS303', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS401', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS402', 'LEC', 3, 0, 3),
        ('Bachelor of Arts in Political Science', 'POLS403', 'LEC', 6, 0, 9)
)

INSERT INTO public.course_subject_offerings (course_id, subject_id, offering_type, lecture_units, lab_units, contact_hours)
SELECT c.id, s.id, o.offering_type, o.lecture_units, o.lab_units, o.contact_hours
FROM offering_rows o
JOIN public.courses c ON c.course_name = o.course_name
JOIN public.subjects s ON s.subject_code = o.subject_code
ON CONFLICT DO NOTHING;

 UPDATE public.course_subject_offerings
 SET contact_hours = COALESCE(lecture_units, 0) * 1 + COALESCE(lab_units, 0) * 3
 WHERE contact_hours IS DISTINCT FROM (COALESCE(lecture_units, 0) * 1 + COALESCE(lab_units, 0) * 3);

