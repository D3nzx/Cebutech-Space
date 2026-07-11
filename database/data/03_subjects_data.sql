-- ============================================
-- SUBJECTS DATA
-- Comprehensive subject data for all programs
-- ============================================

INSERT INTO public.subjects (subject_name, subject_code, description, credits, display_order)
VALUES
  -- ========== GENERAL EDUCATION (Common to All Programs) ==========
  ('English Composition', 'GE101', 'Writing skills and academic writing', 3, 1),
  ('Science, Technology, and Society', 'GE102', 'Interplay of science, technology, and socio-cultural change', 3, 2),
  ('The Contemporary World', 'GE103', 'Globalization issues and their impact on society', 3, 3),
  ('Readings in Philippine History', 'GE104', 'Major events and civic lessons from Philippine nationhood', 3, 4),
  ('Physical Education and Wellness', 'GE105', 'Fitness principles and lifelong physical activity', 2, 5),
  
  -- ========== BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY ==========
  -- 1st Year
  ('Programming Fundamentals', 'IT101', 'Fundamentals of programming concepts and logic', 3, 10),
  ('Introduction to Computer Systems', 'IT102', 'Computer hardware and architecture basics', 3, 11),
  ('Discrete Mathematics', 'IT103', 'Mathematical foundations for computer science', 3, 12),
  
  -- 2nd Year
  ('Data Structures and Algorithms', 'IT201', 'Study of data structures and algorithmic design', 3, 13),
  ('Database Management Systems', 'IT202', 'Design and management of relational databases', 3, 14),
  ('Object-Oriented Programming', 'IT203', 'OOP concepts and design patterns', 3, 15),
  
  -- 3rd Year
  ('Web Development', 'IT301', 'Frontend and backend web development technologies', 3, 16),
  ('Software Engineering', 'IT302', 'Software development methodologies and lifecycle', 3, 17),
  ('Computer Networks', 'IT303', 'Networking concepts, protocols, and architecture', 3, 18),
  
  -- 4th Year
  ('Mobile Application Development', 'IT401', 'Development of iOS and Android applications', 3, 19),
  ('Cloud Computing', 'IT402', 'Cloud platforms and distributed systems', 3, 20),
  ('Cybersecurity', 'IT403', 'Information security and protection mechanisms', 3, 21),
  ('IT Project Management', 'IT404', 'Managing IT projects and teams', 3, 22),
  
  -- ========== BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION - FINANCIAL MANAGEMENT ==========
  -- 1st Year
  ('Business Fundamentals', 'BUS101', 'Introduction to business concepts and principles', 3, 30),
  ('Accounting Principles', 'BUS102', 'Introduction to financial accounting', 3, 31),
  ('Microeconomics', 'BUS103', 'Individual consumer and firm behavior', 3, 32),
  
  -- 2nd Year
  ('Managerial Accounting', 'BUS201', 'Accounting for management decision-making', 3, 33),
  ('Corporate Finance', 'BUS202', 'Financial management and capital budgeting', 3, 34),
  ('Business Law', 'BUS203', 'Legal aspects of business operations', 3, 35),
  
  -- 3rd Year
  ('Financial Analysis and Valuation', 'BUS301', 'Analysis of financial statements and company valuation', 3, 36),
  ('Investment Management', 'BUS302', 'Portfolio construction and investment strategies', 3, 37),
  ('Banking and Financial Institutions', 'BUS303', 'Financial system and banking operations', 3, 38),
  
  -- 4th Year
  ('Risk Management', 'BUS401', 'Enterprise risk assessment and mitigation', 3, 39),
  ('Taxation', 'BUS402', 'Tax laws and financial planning', 3, 40),
  ('Auditing', 'BUS403', 'Audit procedures and compliance', 3, 41),
  ('Financial Planning', 'BUS404', 'Comprehensive financial planning strategies', 3, 42),
  
  -- ========== BACHELOR OF SCIENCE IN HOSPITALITY MANAGEMENT ==========
  -- 1st Year
  ('Hospitality Industry Overview', 'HM101', 'History and scope of hospitality industry', 3, 50),
  ('Hotel Operations Management', 'HM102', 'Principles of hotel and lodging management', 3, 51),
  ('Food and Beverage Fundamentals', 'HM103', 'Basics of F&B service and operations', 3, 52),
  
  -- 2nd Year
  ('Rooms Division Management', 'HM201', 'Front office, housekeeping, and property systems', 3, 53),
  ('Food and Beverage Management', 'HM202', 'Menu planning, costing, and service management', 3, 54),
  ('Hospitality Marketing', 'HM203', 'Marketing strategies for hospitality businesses', 3, 55),
  
  -- 3rd Year
  ('Event Management', 'HM301', 'Planning and execution of hospitality events', 3, 56),
  ('Culinary Entrepreneurship', 'HM302', 'Concept development for food service ventures', 3, 57),
  ('Customer Service Excellence', 'HM303', 'Guest relations and service quality management', 3, 58),
  
  -- 4th Year
  ('Tourism Management', 'HM401', 'Tourism industry, markets, and destination management', 3, 59),
  ('Hospitality Law and Ethics', 'HM402', 'Legal and ethical issues in hospitality', 3, 60),
  ('Hospitality Industry Practicum', 'HM403', 'Supervised hotel or resort operations immersion', 6, 61),
  
  -- ========== BACHELOR OF ELEMENTARY EDUCATION ==========
  -- 1st Year
  ('Child Development and Learning', 'BEED101', 'Growth, development, and learning theories', 3, 70),
  ('Educational Psychology', 'BEED102', 'Psychological principles in teaching and learning', 3, 71),
  ('Foundations of Education', 'BEED103', 'Philosophy and history of education', 3, 72),
  
  -- 2nd Year
  ('Teaching Literacy in Primary Grades', 'BEED201', 'Early literacy development and instruction', 3, 73),
  ('Mathematics Education in Primary Grades', 'BEED202', 'Conceptual math teaching for elementary', 3, 74),
  ('Science Education', 'BEED203', 'Science teaching methods and curriculum', 3, 75),
  
  -- 3rd Year
  ('Social Studies Education', 'BEED301', 'Social studies content and pedagogy', 3, 76),
  ('Arts and Music Education', 'BEED302', 'Visual arts and music instruction methods', 3, 77),
  ('Inclusive Education', 'BEED303', 'Teaching learners with special needs', 3, 78),
  
  -- 4th Year
  ('Curriculum and Instruction', 'BEED401', 'Curriculum development and instructional design', 3, 79),
  ('Assessment and Evaluation', 'BEED402', 'Student assessment and program evaluation', 3, 80),
  ('Practicum and Field Study', 'BEED403', 'Guided school observations and teaching practice', 6, 81),
  
  -- ========== BACHELOR OF SECONDARY EDUCATION - ENGLISH ==========
  -- 1st Year
  ('English Composition and Rhetoric', 'ENG101', 'Writing, argumentation, and rhetoric', 3, 90),
  ('British Literature I', 'ENG102', 'Medieval to 18th century British literature', 3, 91),
  ('American Literature I', 'ENG103', 'Colonial to 19th century American literature', 3, 92),
  
  -- 2nd Year
  ('Grammar and Linguistics', 'ENG201', 'English grammar, syntax, and linguistic analysis', 3, 93),
  ('British Literature II', 'ENG202', '19th to 21st century British literature', 3, 94),
  ('American Literature II', 'ENG203', '20th to 21st century American literature', 3, 95),
  
  -- 3rd Year
  ('Drama and Theatre', 'ENG301', 'Dramatic literature and theatrical arts', 3, 96),
  ('Literature Analysis and Criticism', 'ENG302', 'Literary criticism and analytical methods', 3, 97),
  ('Communication Skills', 'ENG303', 'Public speaking and oral communication', 3, 98),
  
  -- 4th Year
  ('English Teaching Methods', 'ENG401', 'Pedagogy and instructional strategies for English', 3, 99),
  ('Critical Reading and Interpretation', 'ENG402', 'Advanced literary analysis and interpretation', 3, 100),
  ('English Practicum and Field Study', 'ENG403', 'Guided teaching practice and observation', 6, 101),
  
  -- ========== BACHELOR OF SECONDARY EDUCATION - FILIPINO ==========
  -- 1st Year
  ('Wikang Filipino I', 'FIL101', 'Filipino language fundamentals and communication', 3, 110),
  ('Philippine Literature I', 'FIL102', 'Pre-colonial and colonial Filipino literature', 3, 111),
  ('Linguistics', 'FIL103', 'Language structure and analysis', 3, 112),
  
  -- 2nd Year
  ('Wikang Filipino II', 'FIL201', 'Advanced Filipino language and composition', 3, 113),
  ('Philippine Literature II', 'FIL202', 'Modern and contemporary Filipino literature', 3, 114),
  ('Filipino Language and Grammar', 'FIL203', 'Detailed study of Filipino grammatical structures', 3, 115),
  
  -- 3rd Year
  ('Oral Communication in Filipino', 'FIL301', 'Speaking and listening skills in Filipino', 3, 116),
  ('Filipino Cultural Studies', 'FIL302', 'Filipino culture, traditions, and values', 3, 117),
  ('Reading and Comprehension', 'FIL303', 'Advanced reading and text analysis in Filipino', 3, 118),
  
  -- 4th Year
  ('Filipino Teaching Methods', 'FIL401', 'Pedagogy and instructional strategies for Filipino', 3, 119),
  ('Pilipinong Multimedia at Panitikan', 'FIL402', 'Digital media and contemporary literature in Filipino', 3, 120),
  ('Filipino Practicum and Field Study', 'FIL403', 'Guided teaching practice in Filipino', 6, 121),
  
  -- ========== BACHELOR OF SECONDARY EDUCATION - MATHEMATICS ==========
  -- 1st Year
  ('Algebra and Trigonometry', 'MATH101', 'Algebraic operations and trigonometric functions', 3, 130),
  ('Pre-Calculus', 'MATH102', 'Functions, sequences, and analytic geometry', 3, 131),
  ('Geometry', 'MATH103', 'Euclidean geometry and spatial reasoning', 3, 132),
  
  -- 2nd Year
  ('Calculus I', 'MATH201', 'Differential calculus and applications', 4, 133),
  ('Calculus II', 'MATH202', 'Integral calculus and series', 4, 134),
  ('Linear Algebra', 'MATH203', 'Matrices, determinants, and linear systems', 3, 135),
  
  -- 3rd Year
  ('Number Theory', 'MATH301', 'Properties of integers and number systems', 3, 136),
  ('Probability and Statistics', 'MATH302', 'Probability theory and statistical analysis', 3, 137),
  ('Discrete Mathematics', 'MATH303', 'Logic, sets, graphs, and combinatorics', 3, 138),
  
  -- 4th Year
  ('Mathematics Teaching Methods', 'MATH401', 'Pedagogy and instructional strategies for mathematics', 3, 139),
  ('Problem Solving and Reasoning', 'MATH402', 'Mathematical problem-solving techniques', 3, 140),
  ('Mathematics Practicum and Field Study', 'MATH403', 'Guided teaching practice in mathematics', 6, 141),
  
  -- ========== BACHELOR OF ARTS IN POLITICAL SCIENCE ==========
  -- 1st Year
  ('Political Science Introduction', 'POLS101', 'Foundations of political science discipline', 3, 150),
  ('Philippine Government and Constitution', 'POLS102', 'Structure and functions of Philippine government', 3, 151),
  ('Political Theory and Philosophy', 'POLS103', 'Classical and modern political theories', 3, 152),
  
  -- 2nd Year
  ('Comparative Government Systems', 'POLS201', 'Comparative study of political systems', 3, 153),
  ('Public Administration', 'POLS202', 'Organization and management of public sector', 3, 154),
  ('International Relations', 'POLS203', 'International politics and state relations', 3, 155),
  
  -- 3rd Year
  ('Political Economy', 'POLS301', 'Intersection of politics and economics', 3, 156),
  ('Constitutional Law', 'POLS302', 'Constitutional principles and judicial review', 3, 157),
  ('Public Policy Analysis', 'POLS303', 'Policy formation and implementation', 3, 158),
  
  -- 4th Year
  ('Diplomacy and International Negotiations', 'POLS401', 'Foreign policy and diplomatic practice', 3, 159),
  ('Political Behavior and Society', 'POLS402', 'Electoral behavior and political participation', 3, 160),
  ('Political Science Thesis or Internship', 'POLS403', 'Capstone research or internship experience', 6, 161)
ON CONFLICT DO NOTHING;
