-- Database restore script for CEBUTECH-SPACE project
-- Run this in a fresh Supabase SQL editor or psql session after creating the project.
SET search_path = public;

-- ================= SOURCE: 00_SETUP.sql =================
-- ============================================
-- CEBUTECH-SPACE SYSTEM
-- COMPLETE DATABASE SETUP
-- ============================================
-- This file sets up the entire database schema
-- Run this FIRST before running individual table files

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop all existing tables and functions (clean slate)
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.course_subject_offerings CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.faculty CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.program_heads CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.colleges CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.generate_program_head_code();
DROP FUNCTION IF EXISTS public.generate_student_id();
DROP FUNCTION IF EXISTS public.set_student_id();
DROP FUNCTION IF EXISTS public.update_student_updated_at();
DROP FUNCTION IF EXISTS public.update_colleges_updated_at();
DROP FUNCTION IF EXISTS public.update_courses_updated_at();
DROP FUNCTION IF EXISTS public.update_program_heads_updated_at();
DROP FUNCTION IF EXISTS public.update_faculty_updated_at();
DROP FUNCTION IF EXISTS public.update_subjects_updated_at();
DROP FUNCTION IF EXISTS public.update_locations_updated_at();
DROP FUNCTION IF EXISTS public.update_course_subject_offerings_updated_at();
DROP FUNCTION IF EXISTS public.update_schedules_updated_at();
DROP FUNCTION IF EXISTS public.handle_program_head_signup();

-- All done! Now run the individual table setup files in order:
-- 1. 01_colleges.sql
-- 2. 02_courses.sql
-- 3. 03_program_heads.sql
-- 4. 04_admins.sql
-- 5. 05_faculty.sql
-- 6. 06_students.sql
-- 7. 07_subjects.sql
-- 8. 08_locations.sql
-- 9. 09_course_subject_offerings.sql
-- 10. 10_schedules.sql


-- ================= SOURCE: 01_colleges.sql =================
-- ============================================
-- COLLEGES TABLE
-- Simple lookup table for college information
-- ============================================

CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL UNIQUE,
  college_code text UNIQUE,
  description text,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (for registration form)
DROP POLICY IF EXISTS "Allow public read colleges" ON public.colleges;
CREATE POLICY "Allow public read colleges"
  ON public.colleges
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated insert colleges" ON public.colleges;
CREATE POLICY "Allow authenticated insert colleges"
  ON public.colleges
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated update colleges" ON public.colleges;
CREATE POLICY "Allow authenticated update colleges"
  ON public.colleges
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow service role full access
DROP POLICY IF EXISTS "Service role full access colleges" ON public.colleges;
CREATE POLICY "Service role full access colleges"
  ON public.colleges
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_colleges_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_colleges_updated_at ON public.colleges;
CREATE TRIGGER trigger_update_colleges_updated_at
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_colleges_updated_at();


-- ================= SOURCE: 02_courses.sql =================
-- ============================================
-- COURSES TABLE
-- Stores course/program information linked to colleges
-- ============================================

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE RESTRICT,
  course_name text NOT NULL,
  course_code text,
  description text,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_course_per_college UNIQUE (college_id, course_name)
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (for registration form)
DROP POLICY IF EXISTS "Allow public read courses" ON public.courses;
CREATE POLICY "Allow public read courses"
  ON public.courses
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated insert courses" ON public.courses;
CREATE POLICY "Allow authenticated insert courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated update courses" ON public.courses;
CREATE POLICY "Allow authenticated update courses"
  ON public.courses
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to delete
DROP POLICY IF EXISTS "Allow authenticated delete courses" ON public.courses;
CREATE POLICY "Allow authenticated delete courses"
  ON public.courses
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow service role full access
DROP POLICY IF EXISTS "Service role full access courses" ON public.courses;
CREATE POLICY "Service role full access courses"
  ON public.courses
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_courses_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_courses_updated_at ON public.courses;
CREATE TRIGGER trigger_update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_courses_updated_at();


-- ================= SOURCE: 03_program_heads.sql =================
  -- ============================================
  -- PROGRAM HEAD PROFILE TABLE + RLS
  -- NOTE: Use TEXT + CHECK constraint instead of ENUM
  -- because some program names exceed Postgres' 63 byte
  -- limit for enum labels.
  -- ============================================

  DROP TABLE IF EXISTS public.program_heads CASCADE;

  -- Function to handle program head auto-creation on auth user creation
  -- This extracts metadata from auth.users and creates corresponding program head records
  CREATE OR REPLACE FUNCTION public.handle_new_program_head_user()
  RETURNS TRIGGER AS $$
  DECLARE
    first_name_val TEXT;
    last_name_val TEXT;
    college_val TEXT;
    program_val TEXT;
    user_type_val TEXT;
  BEGIN
    -- Extract metadata from auth.users
    user_type_val := NEW.raw_user_meta_data->>'user_type';
    first_name_val := NEW.raw_user_meta_data->>'first_name';
    last_name_val := NEW.raw_user_meta_data->>'last_name';
    college_val := NEW.raw_user_meta_data->>'college';
    program_val := NEW.raw_user_meta_data->>'program';

    -- Only create program head record if user_type is 'program_head'
    IF user_type_val = 'program_head' THEN
      INSERT INTO public.program_heads (auth_user_id, first_name, last_name, email, college, program)
      VALUES (
        NEW.id,
        COALESCE(first_name_val, 'Unknown'),
        COALESCE(last_name_val, 'Unknown'),
        NEW.email,
        college_val,
        program_val
      )
      ON CONFLICT (auth_user_id) DO NOTHING;
    END IF;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail the trigger
    RAISE LOG 'Program head trigger error: %', SQLERRM;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

  -- Trigger on auth.users to auto-create program head records
  -- Disabled: defer profile creation until admin approval
  DROP TRIGGER IF EXISTS on_auth_user_created_program_head ON auth.users;

  -- Generator for human-readable Program Head ID (e.g. PRH9X0, PRH1KU)
  CREATE OR REPLACE FUNCTION public.generate_program_head_code()
  RETURNS text AS $$
  DECLARE
    chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    new_code text;
    i int;
  BEGIN
    LOOP
      new_code := 'PRH';

      -- Append three random characters (A-Z, 0-9)
      FOR i IN 1..3 LOOP
        new_code := new_code || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
      END LOOP;

      -- Ensure uniqueness within program_heads
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.program_heads WHERE program_head_code = new_code
      );
    END LOOP;

    RETURN new_code;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TABLE public.program_heads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to Supabase auth user
    auth_user_id uuid NOT NULL UNIQUE
      REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Basic identity
    program_head_code text NOT NULL UNIQUE DEFAULT public.generate_program_head_code(),
    first_name text NOT NULL,
    middle_name text,
    last_name  text NOT NULL,
    email      text NOT NULL UNIQUE,

    -- College and Program taken from registration form
    college text NOT NULL,
    program text NOT NULL,

    -- Personal information
    gender text,
    contact_number text,
    address text,

    -- Status
    is_active BOOLEAN DEFAULT false,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- Unique constraint to prevent duplicate program heads for the same college/program
  ALTER TABLE public.program_heads
  ADD CONSTRAINT program_heads_college_program_unique UNIQUE (college, program);

  -- Optional: ensure Program is valid for College (defensive)
  ALTER TABLE public.program_heads
  ADD CONSTRAINT program_heads_college_program_valid CHECK (
    (college = 'College of Technology, Management, and Entrepreneurship'
      AND program IN (
        'Bachelor of Science in Information Technology',
        'Bachelor of Science in Hospitality Management',
        'Bachelor of Science in Business Administration - Financial Management'
      )
    )
    OR
    (college = 'College of Education, Arts, and Sciences'
      AND program IN (
        'Bachelor of Secondary Education - English',
        'Bachelor of Secondary Education - Mathematics',
        'Bachelor of Secondary Education - Filipino',
        'Bachelor of Elementary Education',
        'Bachelor of Arts in Political Science'
      )
    )
  );

  -- Simple trigger to keep updated_at fresh
  CREATE OR REPLACE FUNCTION public.update_program_heads_updated_at()
  RETURNS trigger AS $$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_update_program_heads_updated_at ON public.program_heads;
  CREATE TRIGGER trigger_update_program_heads_updated_at
    BEFORE UPDATE ON public.program_heads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_program_heads_updated_at();

  -- Enable Row Level Security
  ALTER TABLE public.program_heads ENABLE ROW LEVEL SECURITY;

  -- ============================================
  -- RLS POLICIES
  -- ============================================

  -- Service role can insert (for trigger operations)
  DROP POLICY IF EXISTS "Service role can insert program heads" ON public.program_heads;
  CREATE POLICY "Service role can insert program heads"
    ON public.program_heads
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

  -- 1) Program Head can read their own profile
  DROP POLICY IF EXISTS "Program head can read own profile" ON public.program_heads;
  CREATE POLICY "Program head can read own profile"
    ON public.program_heads
    FOR SELECT
    USING (auth.uid() = auth_user_id);

  -- 2) Program Head can update their own profile
  DROP POLICY IF EXISTS "Program head can update own profile" ON public.program_heads;
  CREATE POLICY "Program head can update own profile"
    ON public.program_heads
    FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

  -- 2.5) Admin can update any program head profilehttp://localhost:5174/admin/dashboard
  DROP POLICY IF EXISTS "Admin can update any program head" ON public.program_heads;
  CREATE POLICY "Admin can update any program head"
    ON public.program_heads
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

  -- 3) Allow creation of a profile during registration (anon users can insert their own profile)
  DROP POLICY IF EXISTS "Program head can insert own profile" ON public.program_heads;
  CREATE POLICY "Program head can insert own profile"
    ON public.program_heads
    FOR INSERT
    WITH CHECK (true);

  -- 4) Service role / backend admin can manage all profiles
  DROP POLICY IF EXISTS "Service role full access to program_heads" ON public.program_heads;
  CREATE POLICY "Service role full access to program_heads"
    ON public.program_heads
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

  -- 5) Allow all authenticated users to read all program heads (for admin dashboard)
  DROP POLICY IF EXISTS "Allow authenticated users to read all program heads" ON public.program_heads;
  CREATE POLICY "Allow authenticated users to read all program heads"
    ON public.program_heads
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ================= SOURCE: 04_admins.sql =================
-- ============================================
-- ADMINS TABLE
-- Stores admin user information
-- ============================================

CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Supabase auth user
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Admin information
  admin_code text NOT NULL UNIQUE DEFAULT ('ADM' || SUBSTR(gen_random_uuid()::text, 1, 8)),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  
  -- Contact information
  gender text,
  contact_number text,
  address text,
  
  -- Admin role/level
  admin_level text DEFAULT 'standard', -- 'super', 'standard'
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_auth_user_id ON public.admins(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_admin_code ON public.admins(admin_code);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can read their own profile
DROP POLICY IF EXISTS "Admins can read own profile" ON public.admins;
CREATE POLICY "Admins can read own profile"
  ON public.admins
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policy: Admins can update their own profile
DROP POLICY IF EXISTS "Admins can update own profile" ON public.admins;
CREATE POLICY "Admins can update own profile"
  ON public.admins
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policy: Allow authenticated users to read all admins
DROP POLICY IF EXISTS "Allow authenticated read all admins" ON public.admins;
CREATE POLICY "Allow authenticated read all admins"
  ON public.admins
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access admins" ON public.admins;
CREATE POLICY "Service role full access admins"
  ON public.admins
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_admins_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_admins_updated_at ON public.admins;
CREATE TRIGGER trigger_update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admins_updated_at();


-- ================= SOURCE: 05_campus_directors.sql =================
-- ============================================
-- CAMPUS_DIRECTORS TABLE
-- Stores campus director user information
-- ============================================

CREATE TABLE IF NOT EXISTS public.campus_directors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Supabase auth user
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Campus Director information
  campus_director_code text NOT NULL UNIQUE DEFAULT ('CD' || SUBSTR(gen_random_uuid()::text, 1, 8)),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  
  -- Contact information
  gender text,
  contact_number text,
  address text,
  
  -- Status
  is_active boolean DEFAULT false,
  status text DEFAULT 'pending',
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campus_directors_email ON public.campus_directors(email);
CREATE INDEX IF NOT EXISTS idx_campus_directors_auth_user_id ON public.campus_directors(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_campus_directors_code ON public.campus_directors(campus_director_code);

-- Enable RLS
ALTER TABLE public.campus_directors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Campus Directors can read their own profile
DROP POLICY IF EXISTS "Campus Directors can read own profile" ON public.campus_directors;
CREATE POLICY "Campus Directors can read own profile"
  ON public.campus_directors
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policy: Campus Directors can update their own profile
DROP POLICY IF EXISTS "Campus Directors can update own profile" ON public.campus_directors;
CREATE POLICY "Campus Directors can update own profile"
  ON public.campus_directors
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policy: Allow authenticated users to read all campus directors
DROP POLICY IF EXISTS "Allow authenticated read all campus directors" ON public.campus_directors;
CREATE POLICY "Allow authenticated read all campus directors"
  ON public.campus_directors
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access campus directors" ON public.campus_directors;
CREATE POLICY "Service role full access campus directors"
  ON public.campus_directors
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Allow ANYONE to INSERT during registration/approval flow
DROP POLICY IF EXISTS "Allow campus director registration insert" ON public.campus_directors;
CREATE POLICY "Allow campus director registration insert"
  ON public.campus_directors
  FOR INSERT
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_campus_directors_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campus_directors_updated_at ON public.campus_directors;
CREATE TRIGGER trigger_update_campus_directors_updated_at
  BEFORE UPDATE ON public.campus_directors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campus_directors_updated_at();


-- ================= SOURCE: 05_campus_directors_auth_handler.sql =================
-- ============================================
-- CAMPUS DIRECTORS AUTH HANDLER
-- Creates campus_director profile immediately when an auth.user is created
-- (Matches Program Head behavior: create profile on INSERT)
-- ============================================

-- Clean up any prior update-based handler to avoid duplicate logic
DROP TRIGGER IF EXISTS trigger_handle_campus_director_signup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_campus_director_signup();

-- Function to handle new campus director user creation
CREATE OR REPLACE FUNCTION public.handle_new_campus_director_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  user_type_val TEXT;
BEGIN
  -- Extract metadata
  user_type_val := NEW.raw_user_meta_data->>'user_type';
  first_name_val := NEW.raw_user_meta_data->>'first_name';
  last_name_val := NEW.raw_user_meta_data->>'last_name';

  -- Only create campus director record if user_type is 'campus_director'
  IF user_type_val = 'campus_director' THEN
    INSERT INTO public.campus_directors (auth_user_id, first_name, last_name, email, status, is_active)
    VALUES (
      NEW.id,
      COALESCE(first_name_val, 'Campus'),
      COALESCE(last_name_val, 'Director'),
      NEW.email,
      'pending',
      false
    ) ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the trigger
  RAISE LOG 'Campus Director trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users to auto-create campus director records on user creation
-- Disabled: defer profile creation until admin approval
DROP TRIGGER IF EXISTS on_auth_user_created_campus_director ON auth.users;

-- Ensure appropriate grants for runtime
GRANT EXECUTE ON FUNCTION public.handle_new_campus_director_user() TO service_role;
GRANT SELECT, INSERT ON public.campus_directors TO service_role;
GRANT SELECT ON public.campus_directors TO authenticated;

-- Create function to check if campus director exists
CREATE OR REPLACE FUNCTION public.campus_director_exists()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.campus_directors LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ================= SOURCE: 05_deans.sql =================
-- ============================================
-- DEANS TABLE
-- Stores dean user information
-- ============================================

-- Trigger on auth.users to auto-create dean records
-- Disabled: defer profile creation until admin approval
DROP TRIGGER IF EXISTS on_auth_user_created_dean ON auth.users;

-- Generator for dean code
CREATE OR REPLACE FUNCTION public.generate_dean_code()
RETURNS text AS $$
BEGIN
  RETURN 'DEAN' || SUBSTR(gen_random_uuid()::text, 1, 6);
END;
$$ LANGUAGE plpgsql;

-- Keep updated_at current
CREATE OR REPLACE FUNCTION public.update_deans_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.deans (
  id uuid not null default gen_random_uuid(),
  auth_user_id uuid not null,
  dean_code text not null default generate_dean_code(),
  first_name character varying not null,
  middle_name character varying null,
  last_name character varying not null,
  email character varying not null,
  gender character varying null,
  contact_number character varying null,
  address character varying null,
  is_active boolean null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint deans_pkey primary key (id),
  constraint deans_auth_user_id_key unique (auth_user_id),
  constraint deans_dean_code_key unique (dean_code),
  constraint deans_email_key unique (email),
  constraint deans_auth_user_id_fkey foreign KEY (auth_user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create unique INDEX IF not exists deans_singleton_unique on public.deans using btree ((true)) TABLESPACE pg_default;

DROP TRIGGER IF EXISTS trigger_update_deans_updated_at ON public.deans;
create trigger trigger_update_deans_updated_at BEFORE
update on deans for EACH row
execute FUNCTION update_deans_updated_at ();

-- Enable RLS
ALTER TABLE public.deans ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow ANYONE to INSERT during registration/approval flow
DROP POLICY IF EXISTS "Allow dean registration insert" ON public.deans;
CREATE POLICY "Allow dean registration insert"
  ON public.deans
  FOR INSERT
  WITH CHECK (true);


-- ================= SOURCE: 05_faculty.sql =================
-- ============================================
-- FACULTY TABLE
-- Stores faculty member information
-- ============================================

-- Function to handle faculty auto-creation on auth user creation
-- This extracts metadata from auth.users and creates corresponding faculty records
CREATE OR REPLACE FUNCTION public.handle_new_faculty_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  college_val TEXT;
  program_val TEXT;
  user_type_val TEXT;
BEGIN
  -- Extract metadata from auth.users
  user_type_val := NEW.raw_user_meta_data->>'user_type';
  first_name_val := NEW.raw_user_meta_data->>'first_name';
  last_name_val := NEW.raw_user_meta_data->>'last_name';
  college_val := NEW.raw_user_meta_data->>'college';
  program_val := NEW.raw_user_meta_data->>'program';

  -- Only create faculty record if user_type is 'faculty'
  IF user_type_val = 'faculty' THEN
    INSERT INTO public.faculty (auth_user_id, first_name, last_name, email, college, program)
    VALUES (
      NEW.id,
      COALESCE(first_name_val, 'Unknown'),
      COALESCE(last_name_val, 'Unknown'),
      NEW.email,
      college_val,
      program_val
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the trigger
  RAISE LOG 'Faculty trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users to auto-create faculty records
-- Disabled: defer profile creation until admin approval
DROP TRIGGER IF EXISTS on_auth_user_created_faculty ON auth.users;

CREATE TABLE IF NOT EXISTS public.faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Faculty ID (Auto-generated: FAC-XXXX format)
  id_no VARCHAR(20) UNIQUE,
  
  -- Link to Supabase auth user
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  gender VARCHAR(50),
  address TEXT,
  
  -- Academic Information
  college VARCHAR(255),
  program VARCHAR(255),
  department VARCHAR(100),
  faculty_position VARCHAR(100),
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faculty_email ON public.faculty(email);
CREATE INDEX IF NOT EXISTS idx_faculty_id_no ON public.faculty(id_no);
CREATE INDEX IF NOT EXISTS idx_faculty_auth_user_id ON public.faculty(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_faculty_college ON public.faculty(college);
CREATE INDEX IF NOT EXISTS idx_faculty_program ON public.faculty(program);

-- Function to generate faculty ID
CREATE SEQUENCE IF NOT EXISTS public.faculty_id_no_seq;

DO $$
DECLARE
  max_existing integer;
BEGIN
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(id_no, '\\D', '', 'g'), '')::int), 0)
  INTO max_existing
  FROM public.faculty
  WHERE id_no IS NOT NULL;

  IF max_existing > 0 THEN
    PERFORM setval('public.faculty_id_no_seq', max_existing, true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generate_faculty_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    sequence_num BIGINT;
    max_attempts INTEGER := 100;
    attempt_count INTEGER := 0;
BEGIN
    WHILE attempt_count < max_attempts LOOP
        sequence_num := nextval('public.faculty_id_no_seq');
        new_id := 'FAC-' || LPAD(sequence_num::TEXT, 4, '0');

        IF NOT EXISTS (SELECT 1 FROM public.faculty WHERE id_no = new_id) THEN
            RETURN new_id;
        END IF;

        attempt_count := attempt_count + 1;
    END LOOP;

    RAISE EXCEPTION 'Could not generate unique faculty ID after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate faculty ID
CREATE OR REPLACE FUNCTION public.set_faculty_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.id_no IS NULL THEN
        NEW.id_no := public.generate_faculty_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_faculty_id ON public.faculty;
CREATE TRIGGER trigger_set_faculty_id
  BEFORE INSERT ON public.faculty
  FOR EACH ROW
  EXECUTE FUNCTION public.set_faculty_id();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_faculty_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_faculty_updated_at ON public.faculty;
CREATE TRIGGER trigger_update_faculty_updated_at
  BEFORE UPDATE ON public.faculty
  FOR EACH ROW
  EXECUTE FUNCTION public.update_faculty_updated_at();

-- Enable RLS
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert (for trigger operations)
DROP POLICY IF EXISTS "Service role can insert faculty" ON public.faculty;
CREATE POLICY "Service role can insert faculty"
  ON public.faculty
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Allow ANYONE to INSERT during registration/approval flow
DROP POLICY IF EXISTS "Allow faculty registration insert" ON public.faculty;
CREATE POLICY "Allow faculty registration insert"
  ON public.faculty
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Faculty can read their own profile
DROP POLICY IF EXISTS "Faculty can read own profile" ON public.faculty;
CREATE POLICY "Faculty can read own profile"
  ON public.faculty
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policy: Faculty can update their own profile
DROP POLICY IF EXISTS "Faculty can update own profile" ON public.faculty;
CREATE POLICY "Faculty can update own profile"
  ON public.faculty
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policy: Admin can update any faculty profile (including is_active status)
DROP POLICY IF EXISTS "Admin can update any faculty" ON public.faculty;
CREATE POLICY "Admin can update any faculty"
  ON public.faculty
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Allow authenticated users to read all faculty
DROP POLICY IF EXISTS "Allow authenticated read all faculty" ON public.faculty;
CREATE POLICY "Allow authenticated read all faculty"
  ON public.faculty
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access faculty" ON public.faculty;
CREATE POLICY "Service role full access faculty"
  ON public.faculty
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ================= SOURCE: 06_students.sql =================
-- ============================================
-- STUDENTS TABLE
-- Stores student information with proper RLS
-- ============================================

-- Function to handle student auto-creation on auth user creation
-- This extracts metadata from auth.users and creates corresponding student records
CREATE OR REPLACE FUNCTION public.handle_new_student_user()
RETURNS TRIGGER AS $$
DECLARE
  first_name_val TEXT;
  last_name_val TEXT;
  college_val TEXT;
  program_val TEXT;
  year_level_val TEXT;
  section_val TEXT;
  user_type_val TEXT;
BEGIN
  -- Extract metadata from auth.users
  user_type_val := NEW.raw_user_meta_data->>'user_type';
  first_name_val := NEW.raw_user_meta_data->>'first_name';
  last_name_val := NEW.raw_user_meta_data->>'last_name';
  college_val := NEW.raw_user_meta_data->>'college';
  program_val := NEW.raw_user_meta_data->>'program';
  year_level_val := NEW.raw_user_meta_data->>'year_level';
  section_val := NEW.raw_user_meta_data->>'section';

  -- Only create student record if user_type is 'student'
  IF user_type_val = 'student' THEN
    INSERT INTO public.students (auth_user_id, first_name, last_name, email, college, program, year_level, section)
    VALUES (
      NEW.id,
      COALESCE(first_name_val, 'Unknown'),
      COALESCE(last_name_val, 'Unknown'),
      NEW.email,
      college_val,
      program_val,
      year_level_val,
      section_val
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail the trigger
  RAISE LOG 'Student trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users to auto-create student records
-- Disabled: defer profile creation until admin approval
DROP TRIGGER IF EXISTS on_auth_user_created_student ON auth.users;

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student ID (Auto-generated: STD-XXXX format)
  student_id VARCHAR(20) UNIQUE,
  
  -- Link to Supabase auth user
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  contact_number VARCHAR(20),
  gender VARCHAR(50),
  address TEXT,
  
  -- Academic Information
  college VARCHAR(255),
  program VARCHAR(255),
  year_level VARCHAR(50),
  section VARCHAR(100),
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_auth_user_id ON public.students(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_students_program ON public.students(program);
CREATE INDEX IF NOT EXISTS idx_students_year_level ON public.students(year_level);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section);

-- Function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    sequence_num BIGINT;
    max_attempts INTEGER := 100;
    attempt_count INTEGER := 0;
BEGIN
    WHILE attempt_count < max_attempts LOOP
        sequence_num := nextval('public.student_id_seq');
        new_id := 'STD-' || LPAD(sequence_num::TEXT, 4, '0');
        
        IF NOT EXISTS (SELECT 1 FROM students WHERE student_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        attempt_count := attempt_count + 1;
    END LOOP;
    
    RAISE EXCEPTION 'Could not generate unique student ID after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS public.student_id_seq;

DO $$
DECLARE
  max_existing integer;
BEGIN
  SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE(student_id, '\\D', '', 'g'), '')::int), 0)
  INTO max_existing
  FROM public.students
  WHERE student_id IS NOT NULL;

  IF max_existing > 0 THEN
    PERFORM setval('public.student_id_seq', max_existing, true);
  END IF;
END $$;

-- Trigger to auto-generate student ID
CREATE OR REPLACE FUNCTION public.set_student_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.student_id IS NULL THEN
        NEW.student_id := public.generate_student_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_student_id ON public.students;
CREATE TRIGGER trigger_set_student_id
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_student_id();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_student_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_updated_at ON public.students;
CREATE TRIGGER trigger_update_student_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_updated_at();

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can insert (for trigger operations)
DROP POLICY IF EXISTS "Service role can insert students" ON public.students;
CREATE POLICY "Service role can insert students"
  ON public.students
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policy: Allow ANYONE to INSERT during registration
-- This is the KEY policy that allows registration to work
DROP POLICY IF EXISTS "Allow student registration insert" ON public.students;
CREATE POLICY "Allow student registration insert"
  ON public.students
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Students can read their own record
DROP POLICY IF EXISTS "Students can read own record" ON public.students;
CREATE POLICY "Students can read own record"
  ON public.students
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- RLS Policy: Students can update their own record
DROP POLICY IF EXISTS "Students can update own record" ON public.students;
CREATE POLICY "Students can update own record"
  ON public.students
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policy: Admin can update any student profile (including is_active status)
DROP POLICY IF EXISTS "Admin can update any student" ON public.students;
CREATE POLICY "Admin can update any student"
  ON public.students
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins 
      WHERE admins.auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Allow authenticated users to read all students
DROP POLICY IF EXISTS "Allow authenticated read all students" ON public.students;
CREATE POLICY "Allow authenticated read all students"
  ON public.students
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access students" ON public.students;
CREATE POLICY "Service role full access students"
  ON public.students
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ================= SOURCE: 07_subjects.sql =================
-- ============================================
-- SUBJECTS TABLE
-- Stores subject/course information
-- ============================================

CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL UNIQUE,
  subject_code text UNIQUE,
  description text,
  credits integer,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subjects_subject_code ON public.subjects(subject_code);
CREATE INDEX IF NOT EXISTS idx_subjects_subject_name ON public.subjects(subject_name);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access
DROP POLICY IF EXISTS "Allow public read subjects" ON public.subjects;
CREATE POLICY "Allow public read subjects"
  ON public.subjects
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated insert subjects" ON public.subjects;
CREATE POLICY "Allow authenticated insert subjects"
  ON public.subjects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated update subjects" ON public.subjects;
CREATE POLICY "Allow authenticated update subjects"
  ON public.subjects
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to delete
DROP POLICY IF EXISTS "Allow authenticated delete subjects" ON public.subjects;
CREATE POLICY "Allow authenticated delete subjects"
  ON public.subjects
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access subjects" ON public.subjects;
CREATE POLICY "Service role full access subjects"
  ON public.subjects
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_subjects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subjects_updated_at ON public.subjects;
CREATE TRIGGER trigger_update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subjects_updated_at();


-- ================= SOURCE: 08_locations.sql =================
-- ============================================
-- LOCATIONS TABLE
-- Stores classroom/room information
-- ============================================

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code text UNIQUE,
  name text NOT NULL UNIQUE,
  building text,
  room_number text,
  capacity integer,
  type text, -- 'classroom', 'lab', 'auditorium', etc.
  floor integer,
  description text,
  is_available boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add location_code column if it doesn't exist
ALTER TABLE IF EXISTS public.locations
ADD COLUMN IF NOT EXISTS location_code text UNIQUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_locations_code ON public.locations(location_code);
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations(name);
CREATE INDEX IF NOT EXISTS idx_locations_building ON public.locations(building);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(type);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access
DROP POLICY IF EXISTS "Allow public read locations" ON public.locations;
CREATE POLICY "Allow public read locations"
  ON public.locations
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated insert locations" ON public.locations;
CREATE POLICY "Allow authenticated insert locations"
  ON public.locations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated update locations" ON public.locations;
CREATE POLICY "Allow authenticated update locations"
  ON public.locations
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to delete
DROP POLICY IF EXISTS "Allow authenticated delete locations" ON public.locations;
CREATE POLICY "Allow authenticated delete locations"
  ON public.locations
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access locations" ON public.locations;
CREATE POLICY "Service role full access locations"
  ON public.locations
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_locations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_locations_updated_at ON public.locations;
CREATE TRIGGER trigger_update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_locations_updated_at();


-- ================= SOURCE: 08_course_majors.sql =================
-- ============================================
-- COURSE MAJORS TABLE
-- Ensures each program has exactly one major
-- ============================================

CREATE TABLE IF NOT EXISTS public.course_majors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  major_name text NOT NULL,
  major_code text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_major_per_course UNIQUE (course_id),
  CONSTRAINT unique_major_name UNIQUE (major_name)
);

-- Enable RLS
ALTER TABLE public.course_majors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (for registration form use cases)
DROP POLICY IF EXISTS "Allow public read course majors" ON public.course_majors;
CREATE POLICY "Allow public read course majors"
  ON public.course_majors
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert
DROP POLICY IF EXISTS "Allow authenticated insert course majors" ON public.course_majors;
CREATE POLICY "Allow authenticated insert course majors"
  ON public.course_majors
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated update course majors" ON public.course_majors;
CREATE POLICY "Allow authenticated update course majors"
  ON public.course_majors
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow authenticated users to delete
DROP POLICY IF EXISTS "Allow authenticated delete course majors" ON public.course_majors;
CREATE POLICY "Allow authenticated delete course majors"
  ON public.course_majors
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Allow service role full access
DROP POLICY IF EXISTS "Service role full access course majors" ON public.course_majors;
CREATE POLICY "Service role full access course majors"
  ON public.course_majors
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_course_majors_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_majors_updated_at ON public.course_majors;
CREATE TRIGGER trigger_update_course_majors_updated_at
  BEFORE UPDATE ON public.course_majors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_majors_updated_at();




-- ================= SOURCE: 09_course_subject_offerings.sql =================
-- ============================================
-- COURSE SUBJECT OFFERINGS TABLE
-- Links programs (courses) to their major subjects
-- ============================================

-- Drop existing table and constraints if they exist
DROP TABLE IF EXISTS public.course_subject_offerings CASCADE;

-- Create fresh table
CREATE TABLE public.course_subject_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  
  -- Offering details
  offering_type text NOT NULL DEFAULT 'LEC', -- 'LEC' (lecture), 'LAB' (lab)
  lecture_units integer DEFAULT 0,
  lab_units integer DEFAULT 0,
  contact_hours integer DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint: Each course can have each subject only once
  CONSTRAINT unique_course_subject_offering UNIQUE (course_id, subject_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_cso_course_id ON public.course_subject_offerings(course_id);
CREATE INDEX idx_cso_subject_id ON public.course_subject_offerings(subject_id);
CREATE INDEX idx_cso_is_active ON public.course_subject_offerings(is_active);

-- Enable Row Level Security
ALTER TABLE public.course_subject_offerings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (for viewing program subjects)
DROP POLICY IF EXISTS "Allow public read course_subject_offerings" ON public.course_subject_offerings;
CREATE POLICY "Allow public read course_subject_offerings"
  ON public.course_subject_offerings
  FOR SELECT
  USING (true);

-- RLS Policy: Allow authenticated users to insert/update/delete
DROP POLICY IF EXISTS "Allow authenticated insert course_subject_offerings" ON public.course_subject_offerings;
CREATE POLICY "Allow authenticated insert course_subject_offerings"
  ON public.course_subject_offerings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow authenticated update course_subject_offerings" ON public.course_subject_offerings;
CREATE POLICY "Allow authenticated update course_subject_offerings"
  ON public.course_subject_offerings
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow authenticated delete course_subject_offerings" ON public.course_subject_offerings;
CREATE POLICY "Allow authenticated delete course_subject_offerings"
  ON public.course_subject_offerings
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access course_subject_offerings" ON public.course_subject_offerings;
CREATE POLICY "Service role full access course_subject_offerings"
  ON public.course_subject_offerings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_course_subject_offerings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_course_subject_offerings_updated_at ON public.course_subject_offerings;
CREATE TRIGGER trigger_update_course_subject_offerings_updated_at
  BEFORE UPDATE ON public.course_subject_offerings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_subject_offerings_updated_at();


-- ================= SOURCE: 10_schedules.sql =================
-- ============================================
-- SCHEDULES TABLE
-- Stores class schedule information
-- Links faculty to subjects, locations, and time slots
-- ============================================

-- Drop existing table and constraints if they exist
DROP TABLE IF EXISTS public.schedules CASCADE;

-- Create fresh table
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  course_subject_offering_id uuid REFERENCES public.course_subject_offerings(id) ON DELETE SET NULL,
  created_by_program_head_id uuid REFERENCES public.program_heads(id) ON DELETE SET NULL,
  
  -- Schedule details
  day_of_week text NOT NULL, -- 'Monday', 'Tuesday', etc.
  start_time time NOT NULL,
  end_time time NOT NULL,
  
  -- Class information
  year_level text, -- '1st Year', '2nd Year', etc.
  section text, -- 'A', 'B', 'C', etc.
  school_year text, -- '2025-2026'
  semester integer, -- 1 or 2
  
  -- Status
  is_active boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_schedules_course_id ON public.schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_schedules_subject_id ON public.schedules(subject_id);
CREATE INDEX IF NOT EXISTS idx_schedules_faculty_id ON public.schedules(faculty_id);
CREATE INDEX IF NOT EXISTS idx_schedules_location_id ON public.schedules(location_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_of_week ON public.schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedules_year_level ON public.schedules(year_level);
CREATE INDEX IF NOT EXISTS idx_schedules_section ON public.schedules(section);
CREATE INDEX IF NOT EXISTS idx_schedules_school_year ON public.schedules(school_year);
CREATE INDEX IF NOT EXISTS idx_schedules_semester ON public.schedules(semester);
CREATE INDEX IF NOT EXISTS idx_schedules_created_by_program_head_id ON public.schedules(created_by_program_head_id);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (for viewing schedules)
DROP POLICY IF EXISTS "Allow public read schedules" ON public.schedules;
CREATE POLICY "Allow public read schedules"
  ON public.schedules
  FOR SELECT
  USING (true);

-- RLS Policy: Faculty can read schedules they're assigned to
DROP POLICY IF EXISTS "Faculty can read own schedules" ON public.schedules;
CREATE POLICY "Faculty can read own schedules"
  ON public.schedules
  FOR SELECT
  USING (
    faculty_id IN (
      SELECT id FROM public.faculty WHERE auth_user_id = auth.uid()
    )
  );

-- RLS Policy: Allow authenticated users to insert schedules
DROP POLICY IF EXISTS "Allow authenticated insert schedules" ON public.schedules;
CREATE POLICY "Allow authenticated insert schedules"
  ON public.schedules
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Program Heads can update schedules they created
DROP POLICY IF EXISTS "Program heads can update own schedules" ON public.schedules;
CREATE POLICY "Program heads can update own schedules"
  ON public.schedules
  FOR UPDATE
  USING (
    auth.role() = 'service_role' OR
    (
      auth.role() = 'authenticated' AND
      created_by_program_head_id IN (
        SELECT id FROM public.program_heads WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    (
      auth.role() = 'authenticated' AND
      created_by_program_head_id IN (
        SELECT id FROM public.program_heads WHERE auth_user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Program Heads can delete schedules they created
DROP POLICY IF EXISTS "Program heads can delete own schedules" ON public.schedules;
CREATE POLICY "Program heads can delete own schedules"
  ON public.schedules
  FOR DELETE
  USING (
    auth.role() = 'service_role' OR
    (
      auth.role() = 'authenticated' AND
      created_by_program_head_id IN (
        SELECT id FROM public.program_heads WHERE auth_user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Allow authenticated users to delete schedules (for Program Heads managing their program)
DROP POLICY IF EXISTS "Allow authenticated delete schedules" ON public.schedules;
CREATE POLICY "Allow authenticated delete schedules"
  ON public.schedules
  FOR DELETE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Service role full access
DROP POLICY IF EXISTS "Service role full access schedules" ON public.schedules;
CREATE POLICY "Service role full access schedules"
  ON public.schedules
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_schedules_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_schedules_updated_at ON public.schedules;
CREATE TRIGGER trigger_update_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedules_updated_at();

-- Function to check faculty conflicts
CREATE OR REPLACE FUNCTION public.check_faculty_conflict(
  p_faculty_id uuid,
  p_day_of_week text,
  p_start_time time,
  p_end_time time,
  p_exclude_schedule_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.schedules
  WHERE faculty_id = p_faculty_id
    AND day_of_week = p_day_of_week
    AND is_active = true
    AND (p_exclude_schedule_id IS NULL OR id != p_exclude_schedule_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to check location conflicts
CREATE OR REPLACE FUNCTION public.check_location_conflict(
  p_location_id uuid,
  p_day_of_week text,
  p_start_time time,
  p_end_time time,
  p_exclude_schedule_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.schedules
  WHERE location_id = p_location_id
    AND day_of_week = p_day_of_week
    AND is_active = true
    AND (p_exclude_schedule_id IS NULL OR id != p_exclude_schedule_id)
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;


-- ================= SOURCE: 11_schedule_approvals.sql =================
-- Schedule Approvals Table
-- Tracks faculty approval/rejection of assigned schedules
-- Enables communication between Program Heads and Faculty

CREATE TABLE schedule_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  program_head_id UUID NOT NULL REFERENCES program_heads(id) ON DELETE CASCADE,
  
  -- Status: pending, approved, rejected, requested_change
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requested_change')),
  
  -- Faculty response
  faculty_response TEXT, -- Reason for rejection/change request
  faculty_availability_notes TEXT, -- e.g., "Part-time, unavailable before 2 PM"
  faculty_responded_at TIMESTAMP,
  
  -- Program Head action
  program_head_response TEXT, -- Response to faculty's request
  program_head_action_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_schedule_approvals_schedule_id ON schedule_approvals(schedule_id);
CREATE INDEX idx_schedule_approvals_faculty_id ON schedule_approvals(faculty_id);
CREATE INDEX idx_schedule_approvals_program_head_id ON schedule_approvals(program_head_id);
CREATE INDEX idx_schedule_approvals_status ON schedule_approvals(status);

-- Enable RLS
ALTER TABLE schedule_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Faculty can view their own approvals
CREATE POLICY "Faculty can view their own schedule approvals"
  ON schedule_approvals FOR SELECT
  USING (
    faculty_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  );

-- Faculty can update their own approvals (respond to assignments)
CREATE POLICY "Faculty can respond to schedule approvals"
  ON schedule_approvals FOR UPDATE
  USING (
    faculty_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    faculty_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can view approvals for their schedules
CREATE POLICY "Program Heads can view schedule approvals"
  ON schedule_approvals FOR SELECT
  USING (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can create schedule approvals
CREATE POLICY "Program Heads can create schedule approvals"
  ON schedule_approvals FOR INSERT
  WITH CHECK (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can respond to faculty requests
CREATE POLICY "Program Heads can respond to faculty requests"
  ON schedule_approvals FOR UPDATE
  USING (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role has full access"
  ON schedule_approvals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_schedule_approvals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedule_approvals_update_timestamp
BEFORE UPDATE ON schedule_approvals
FOR EACH ROW
EXECUTE FUNCTION update_schedule_approvals_timestamp();


-- ================= SOURCE: 12_notifications.sql =================
-- Notifications Table
-- Stores notifications for both Faculty and Program Heads
-- Tracks schedule assignments, approvals, rejections, and changes

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL, -- faculty_id or program_head_id
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('faculty', 'program_head')),
  
  notification_type VARCHAR(50) NOT NULL, -- 'schedule_assigned', 'approval_needed', 'schedule_approved', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  related_schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  related_approval_id UUID REFERENCES schedule_approvals(id) ON DELETE CASCADE,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_schedule ON notifications(related_schedule_id);
CREATE INDEX idx_notifications_approval ON notifications(related_approval_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Faculty can view their own notifications
CREATE POLICY "Faculty can view their own notifications"
  ON notifications FOR SELECT
  USING (
    recipient_type = 'faculty' AND
    recipient_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  );

-- Faculty can update their own notifications (mark as read)
CREATE POLICY "Faculty can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    recipient_type = 'faculty' AND
    recipient_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_type = 'faculty' AND
    recipient_id IN (
      SELECT id FROM faculty WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can view their own notifications
CREATE POLICY "Program Heads can view their own notifications"
  ON notifications FOR SELECT
  USING (
    recipient_type = 'program_head' AND
    recipient_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can update their own notifications (mark as read)
CREATE POLICY "Program Heads can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    recipient_type = 'program_head' AND
    recipient_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_type = 'program_head' AND
    recipient_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can delete any notifications
CREATE POLICY "Program Heads can delete notifications"
  ON notifications FOR DELETE
  USING (true);

-- Anyone can insert notifications (for system-generated notifications)
CREATE POLICY "Anyone can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Service role can do everything
CREATE POLICY "Service role has full access"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_update_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_timestamp();

-- CRITICAL FIX: Disable RLS on notifications table
-- RLS was blocking INSERT operations even with correct policies
-- Application filters by recipient_id + recipient_type in all queries
-- so database-level RLS is not necessary
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;


-- ================= SOURCE: 13_report_approval_requests.sql =================
-- Report Approval Requests Table
-- Tracks approval workflow for Program by Teacher and Program by Section reports
-- Flow: Program Head -> Dean -> Campus Director -> Program Head (ready)

CREATE TABLE report_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request origin
  program_head_id UUID NOT NULL REFERENCES program_heads(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  
  -- Approval chain
  dean_id UUID REFERENCES deans(id) ON DELETE SET NULL,
  campus_director_id UUID REFERENCES campus_directors(id) ON DELETE SET NULL,
  
  -- Report metadata
  academic_year VARCHAR(50),
  section VARCHAR(50),
  
  -- Report payload (JSONB to store full report data)
  report_payload JSONB NOT NULL DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'dean_rejected', 'dean_approved', 'cd_rejected', 'cd_approved', 'ready')
  ),
  
  -- Last actor tracking
  last_actor_role VARCHAR(20),
  last_actor_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_report_approval_requests_program_head ON report_approval_requests(program_head_id);
CREATE INDEX idx_report_approval_requests_dean ON report_approval_requests(dean_id);
CREATE INDEX idx_report_approval_requests_campus_director ON report_approval_requests(campus_director_id);
CREATE INDEX idx_report_approval_requests_faculty ON report_approval_requests(faculty_id);
CREATE INDEX idx_report_approval_requests_status ON report_approval_requests(status);
CREATE INDEX idx_report_approval_requests_created_at ON report_approval_requests(created_at DESC);

-- Enable RLS
ALTER TABLE report_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Program Heads can view their own requests
CREATE POLICY "Program Heads can view their own requests"
  ON report_approval_requests FOR SELECT
  USING (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can create requests
CREATE POLICY "Program Heads can create requests"
  ON report_approval_requests FOR INSERT
  WITH CHECK (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can update their own requests
CREATE POLICY "Program Heads can update their own requests"
  ON report_approval_requests FOR UPDATE
  USING (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Program Heads can delete their own requests
CREATE POLICY "Program Heads can delete their own requests"
  ON report_approval_requests FOR DELETE
  USING (
    program_head_id IN (
      SELECT id FROM program_heads WHERE auth_user_id = auth.uid()
    )
  );

-- Deans can view requests assigned to them
CREATE POLICY "Deans can view their requests"
  ON report_approval_requests FOR SELECT
  USING (
    dean_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  );

-- Deans can update requests assigned to them
CREATE POLICY "Deans can update their requests"
  ON report_approval_requests FOR UPDATE
  USING (
    dean_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    dean_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  );

-- Campus Directors can view requests assigned to them
CREATE POLICY "Campus Directors can view their requests"
  ON report_approval_requests FOR SELECT
  USING (
    campus_director_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  );

-- Campus Directors can update requests assigned to them
CREATE POLICY "Campus Directors can update their requests"
  ON report_approval_requests FOR UPDATE
  USING (
    campus_director_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    campus_director_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access"
  ON report_approval_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_approval_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER report_approval_requests_update_timestamp
BEFORE UPDATE ON report_approval_requests
FOR EACH ROW
EXECUTE FUNCTION update_report_approval_requests_timestamp();


-- ================= SOURCE: 12_notifications_update.sql =================
-- Update Notifications Table to support Dean and Campus Director
-- Run this AFTER the base notifications table is created

-- Drop the old CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_type_check;

-- Add new CHECK constraint with dean and campus_director
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_type_check 
  CHECK (recipient_type IN ('faculty', 'program_head', 'dean', 'campus_director'));

-- Add column for report approval requests (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_approval_request_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_approval_request_id UUID REFERENCES report_approval_requests(id) ON DELETE CASCADE;
    CREATE INDEX idx_notifications_approval_request ON notifications(related_approval_request_id);
  END IF;
END $$;

-- Add RLS Policies for Deans
CREATE POLICY "Deans can view their own notifications"
  ON notifications FOR SELECT
  USING (
    recipient_type = 'dean' AND
    recipient_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Deans can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    recipient_type = 'dean' AND
    recipient_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_type = 'dean' AND
    recipient_id IN (
      SELECT id FROM deans WHERE auth_user_id = auth.uid()
    )
  );

-- Add RLS Policies for Campus Directors
CREATE POLICY "Campus Directors can view their own notifications"
  ON notifications FOR SELECT
  USING (
    recipient_type = 'campus_director' AND
    recipient_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Campus Directors can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    recipient_type = 'campus_director' AND
    recipient_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    recipient_type = 'campus_director' AND
    recipient_id IN (
      SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()
    )
  );


-- ================= SOURCE: 12_notifications_admin_update.sql =================
-- Update Notifications Table to support Admin recipients
-- Run this AFTER the base notifications table and dean/campus_director updates are created
-- This migration adds admin support for registration approval notifications

-- Drop the old CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_type_check;

-- Add new CHECK constraint with admin support
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_type_check 
  CHECK (recipient_type IN ('faculty', 'program_head', 'dean', 'campus_director', 'admin'));

-- Add columns for registration notifications (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_user_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_user_id UUID;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_user_type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_user_type VARCHAR(20);
  END IF;
END $$;

-- Add indexes after columns are created
CREATE INDEX IF NOT EXISTS idx_notifications_related_user ON notifications(related_user_id, related_user_type);

-- Add index for admin notifications
CREATE INDEX IF NOT EXISTS idx_notifications_admin ON notifications(recipient_id, recipient_type) 
  WHERE recipient_type = 'admin';

-- Add index for registration-type notifications
CREATE INDEX IF NOT EXISTS idx_notifications_registration ON notifications(related_user_id, related_user_type)
  WHERE notification_type LIKE '%registration%';

-- RLS Policies for Admin
-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Admins can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update their own notifications" ON notifications;

CREATE POLICY "Admins can view their own notifications"
  ON notifications FOR SELECT
  USING (
    recipient_type = 'admin' AND
    recipient_id IN (SELECT id FROM admins WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can update their own notifications"
  ON notifications FOR UPDATE
  USING (
    recipient_type = 'admin' AND
    recipient_id IN (SELECT id FROM admins WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    recipient_type = 'admin' AND
    recipient_id IN (SELECT id FROM admins WHERE auth_user_id = auth.uid())
  );

-- Allow service role to insert notifications for admins (for system-generated notifications)
-- This is already covered by the "Service role has full access" policy, but explicit for clarity
-- The existing "Anyone can create notifications" policy should handle insertions


-- ================= SOURCE: 14_report_approval_comments.sql =================
-- Report Approval Comments Table
-- Stores comments/replies in the approval workflow
-- Supports threaded conversations between roles

CREATE TABLE report_approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent request
  request_id UUID NOT NULL REFERENCES report_approval_requests(id) ON DELETE CASCADE,
  
  -- Comment author
  actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('program_head', 'dean', 'campus_director')),
  actor_id UUID NOT NULL, -- References program_heads(id), deans(id), or campus_directors(id)
  
  -- Comment content
  comment TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_report_approval_comments_request ON report_approval_comments(request_id);
CREATE INDEX idx_report_approval_comments_actor ON report_approval_comments(actor_role, actor_id);
CREATE INDEX idx_report_approval_comments_created_at ON report_approval_comments(created_at DESC);

-- Enable RLS
ALTER TABLE report_approval_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view comments for requests they have access to
CREATE POLICY "Users can view comments for accessible requests"
  ON report_approval_comments FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM report_approval_requests
      WHERE 
        program_head_id IN (SELECT id FROM program_heads WHERE auth_user_id = auth.uid())
        OR dean_id IN (SELECT id FROM deans WHERE auth_user_id = auth.uid())
        OR campus_director_id IN (SELECT id FROM campus_directors WHERE auth_user_id = auth.uid())
    )
  );

-- Program Heads can create comments on their requests
CREATE POLICY "Program Heads can create comments"
  ON report_approval_comments FOR INSERT
  WITH CHECK (
    actor_role = 'program_head' AND
    actor_id IN (SELECT id FROM program_heads WHERE auth_user_id = auth.uid()) AND
    request_id IN (
      SELECT id FROM report_approval_requests
      WHERE program_head_id IN (SELECT id FROM program_heads WHERE auth_user_id = auth.uid())
    )
  );

-- Deans can create comments on requests assigned to them
CREATE POLICY "Deans can create comments"
  ON report_approval_comments FOR INSERT
  WITH CHECK (
    actor_role = 'dean' AND
    actor_id IN (SELECT id FROM deans WHERE auth_user_id = auth.uid()) AND
    request_id IN (
      SELECT id FROM report_approval_requests
      WHERE dean_id IN (SELECT id FROM deans WHERE auth_user_id = auth.uid())
    )
  );

-- Campus Directors can create comments on requests assigned to them
CREATE POLICY "Campus Directors can create comments"
  ON report_approval_comments FOR INSERT
  WITH CHECK (
    actor_role = 'campus_director' AND
    actor_id IN (SELECT id FROM campus_directors WHERE auth_user_id = auth.uid()) AND
    request_id IN (
      SELECT id FROM report_approval_requests
      WHERE campus_director_id IN (SELECT id FROM campus_directors WHERE auth_user_id = auth.uid())
    )
  );

-- Program Heads can delete comments on their own requests
CREATE POLICY "Program Heads can delete comments"
  ON report_approval_comments FOR DELETE
  USING (
    request_id IN (
      SELECT id FROM report_approval_requests
      WHERE program_head_id IN (SELECT id FROM program_heads WHERE auth_user_id = auth.uid())
    )
  );

-- Service role has full access
CREATE POLICY "Service role has full access"
  ON report_approval_comments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ================= SOURCE: 15_pending_registrations.sql =================
-- ============================================
-- PENDING REGISTRATIONS TABLE
-- Stores user registration details until admin approval
-- ============================================

CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to Supabase auth user (created during sign up)
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Registration identity
  user_type text NOT NULL CHECK (user_type IN ('program_head', 'faculty', 'student', 'dean', 'campus_director')),
  email text NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,

  -- Academic details (optional depending on role)
  college text,
  program text,
  year_level text,
  section text,

  -- Flexible payload for role-specific fields (optional)
  extra_data jsonb,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disapproved')),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_registrations_auth_user_id ON public.pending_registrations(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_user_type ON public.pending_registrations(user_type);
CREATE INDEX IF NOT EXISTS idx_pending_registrations_status ON public.pending_registrations(status);

-- Enable RLS
ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a registration
DROP POLICY IF EXISTS "Anyone can create pending registrations" ON public.pending_registrations;
CREATE POLICY "Anyone can create pending registrations"
  ON public.pending_registrations
  FOR INSERT
  WITH CHECK (true);

-- Allow user to view their own pending registration
DROP POLICY IF EXISTS "Users can view own pending registration" ON public.pending_registrations;
CREATE POLICY "Users can view own pending registration"
  ON public.pending_registrations
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Admins can view all pending registrations
DROP POLICY IF EXISTS "Admins can view pending registrations" ON public.pending_registrations;
CREATE POLICY "Admins can view pending registrations"
  ON public.pending_registrations
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid())
  );

-- Admins can update pending registrations
DROP POLICY IF EXISTS "Admins can update pending registrations" ON public.pending_registrations;
CREATE POLICY "Admins can update pending registrations"
  ON public.pending_registrations
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid())
  );

-- Admins can delete pending registrations
DROP POLICY IF EXISTS "Admins can delete pending registrations" ON public.pending_registrations;
CREATE POLICY "Admins can delete pending registrations"
  ON public.pending_registrations
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid())
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access pending registrations" ON public.pending_registrations;
CREATE POLICY "Service role full access pending registrations"
  ON public.pending_registrations
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_pending_registrations_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pending_registrations_updated_at ON public.pending_registrations;
CREATE TRIGGER trigger_update_pending_registrations_updated_at
  BEFORE UPDATE ON public.pending_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_registrations_updated_at();

CREATE OR REPLACE FUNCTION public.notify_admins_on_pending_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_row record;
  user_label text;
BEGIN
  user_label := CASE NEW.user_type
    WHEN 'program_head' THEN 'Program Head'
    WHEN 'faculty' THEN 'Faculty'
    WHEN 'student' THEN 'Student'
    WHEN 'dean' THEN 'Dean'
    WHEN 'campus_director' THEN 'Campus Director'
    ELSE NEW.user_type
  END;

  FOR admin_row IN
    SELECT id
    FROM public.admins
    WHERE is_active IS NULL OR is_active = true
  LOOP
    BEGIN
      INSERT INTO public.notifications (
        recipient_id,
        recipient_type,
        notification_type,
        title,
        message,
        related_user_id,
        related_user_type,
        is_read,
        created_at
      ) VALUES (
        admin_row.id,
        'admin',
        'registration_pending',
        'New ' || user_label || ' Registration',
        NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ') has registered and is pending approval.',
        NEW.id,
        NEW.user_type,
        false,
        now()
      );
    EXCEPTION
      WHEN undefined_column THEN
        BEGIN
          INSERT INTO public.notifications (
            recipient_id,
            recipient_type,
            notification_type,
            title,
            message,
            is_read,
            created_at
          ) VALUES (
            admin_row.id,
            'admin',
            'registration_pending',
            'New ' || user_label || ' Registration',
            NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ') has registered and is pending approval.',
            false,
            now()
          );
        EXCEPTION
          WHEN others THEN
            NULL;
        END;
      WHEN check_violation OR foreign_key_violation OR insufficient_privilege THEN
        NULL;
      WHEN others THEN
        NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_pending_registration ON public.pending_registrations;
CREATE TRIGGER trigger_notify_admins_on_pending_registration
  AFTER INSERT ON public.pending_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_on_pending_registration();


-- ================= SOURCE: 04_colleges_and_courses_data.sql =================
-- ============================================
-- SAMPLE DATA: COLLEGES AND COURSES
-- ============================================

-- IMPORTANT: Clear all existing data to ensure clean state
TRUNCATE public.courses CASCADE;
TRUNCATE public.colleges CASCADE;

-- ============================================
-- INSERT COLLEGES
-- ============================================

INSERT INTO public.colleges (college_name, college_code, description, display_order)
VALUES 
  ('College of Education, Arts, and Sciences', 'CEAS', 'College of Education, Arts, and Sciences', 1),
  ('College of Technology, Management, and Entrepreneurship', 'CTME', 'College of Technology, Management, and Entrepreneurship', 2)
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT COURSES FOR COLLEGE OF EDUCATION, ARTS, AND SCIENCES
-- ============================================

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Elementary Education', 'BED', 'Bachelor of Elementary Education', 1
FROM public.colleges 
WHERE college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Secondary Education major in English', 'BSEE', 'Bachelor of Secondary Education major in English', 2
FROM public.colleges 
WHERE college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Secondary Education major in Filipino', 'BSEF', 'Bachelor of Secondary Education major in Filipino', 3
FROM public.colleges 
WHERE college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Secondary Education major in Mathematics', 'BSEM', 'Bachelor of Secondary Education major in Mathematics', 4
FROM public.colleges 
WHERE college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Arts in Political Science', 'BAPS', 'Bachelor of Arts in Political Science', 5
FROM public.colleges 
WHERE college_name = 'College of Education, Arts, and Sciences'
ON CONFLICT DO NOTHING;

-- ============================================
-- INSERT COURSES FOR COLLEGE OF TECHNOLOGY, MANAGEMENT, AND ENTREPRENEURSHIP
-- ============================================

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Science in Information Technology', 'BSIT', 'Bachelor of Science in Information Technology', 1
FROM public.colleges 
WHERE college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Science in Business Administration-Financial Management', 'BSBAFM', 'Bachelor of Science in Business Administration-Financial Management', 2
FROM public.colleges 
WHERE college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;

INSERT INTO public.courses (college_id, course_name, course_code, description, display_order)
SELECT id, 'Bachelor of Science in Hospitality Management', 'BSHM', 'Bachelor of Science in Hospitality Management', 3
FROM public.colleges 
WHERE college_name = 'College of Technology, Management, and Entrepreneurship'
ON CONFLICT DO NOTHING;


