-- ============================================
-- LOCATIONS DATA
-- Sample data for classrooms and facilities
-- ============================================

INSERT INTO public.locations (name, building, room_number, capacity, type, floor, description)
VALUES
  -- Building A - Classrooms
  ('Room A101', 'Building A', '101', 40, 'classroom', 1, 'Standard classroom with projector'),
  ('Room A102', 'Building A', '102', 40, 'classroom', 1, 'Standard classroom with projector'),
  ('Room A103', 'Building A', '103', 35, 'classroom', 1, 'Smaller classroom'),
  ('Room A201', 'Building A', '201', 50, 'classroom', 2, 'Large classroom with smart board'),
  ('Room A202', 'Building A', '202', 40, 'classroom', 2, 'Standard classroom'),
  ('Room A301', 'Building A', '301', 45, 'classroom', 3, 'Classroom with audio system'),
  
  -- Building B - Computer Labs
  ('Lab B101', 'Building B', '101', 30, 'lab', 1, 'Computer lab with 30 workstations'),
  ('Lab B102', 'Building B', '102', 25, 'lab', 1, 'Smaller computer lab'),
  ('Lab B201', 'Building B', '201', 35, 'lab', 2, 'Advanced computer lab'),
  
  -- Building C - Science Labs
  ('Lab C101', 'Building C', '101', 25, 'lab', 1, 'Chemistry lab'),
  ('Lab C102', 'Building C', '102', 25, 'lab', 1, 'Biology lab'),
  ('Lab C201', 'Building C', '201', 20, 'lab', 2, 'Physics lab'),
  
  -- Building D - Auditoriums
  ('Auditorium D1', 'Building D', '1', 200, 'auditorium', 1, 'Main auditorium with stage'),
  ('Auditorium D2', 'Building D', '2', 150, 'auditorium', 1, 'Secondary auditorium'),
  
  -- Building E - Nursing & Health
  ('Nursing Lab E101', 'Building E', '101', 30, 'lab', 1, 'Nursing skills lab'),
  ('Nursing Lab E102', 'Building E', '102', 25, 'lab', 1, 'Clinical simulation lab'),
  ('Room E201', 'Building E', '201', 40, 'classroom', 2, 'Classroom for health sciences'),
  
  -- Building F - Engineering
  ('Lab F101', 'Building F', '101', 35, 'lab', 1, 'Engineering workshop'),
  ('Lab F102', 'Building F', '102', 30, 'lab', 1, 'CAD lab'),
  ('Room F201', 'Building F', '201', 45, 'classroom', 2, 'Engineering classroom'),
  
  -- Building G - Library & Study Areas
  ('Study Room G101', 'Building G', '101', 20, 'classroom', 1, 'Group study room'),
  ('Study Room G102', 'Building G', '102', 15, 'classroom', 1, 'Small study room'),
  ('Seminar Room G201', 'Building G', '201', 50, 'classroom', 2, 'Seminar and discussion room')
ON CONFLICT (name) DO NOTHING;
