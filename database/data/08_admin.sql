-- ============================================
-- ADD NEW ADMIN ACCOUNT: DEV-7
-- Email: dev-team@ctu.edu
-- Password: dev-team123
-- Admin Code: ADM-DEV7
-- ============================================

-- Step 1: Create the auth user in Supabase auth.users table
-- NOTE: This must be done via Supabase Admin API or Dashboard
-- Go to Supabase Dashboard → Authentication → Users → Add User
-- Email: dev-team@ctu.edu
-- Password: dev-team123
-- Then copy the user ID (UUID) and use it in Step 2 below

-- Step 2: After creating the auth user, insert the admin record
-- Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID from Step 1
INSERT INTO public.admins (
  auth_user_id,
  admin_code,
  first_name,
  last_name,
  email,
  admin_level,
  is_active
) VALUES (
  '0c792d05-1d99-4161-b500-0a29e1384519',  -- Replace with actual auth user UUID
  'ADM-DEV7',
  'DEV',
  'Z',
  'denzielcapangpangan@gmail.com',
  'super',
  true
);

-- Verify the admin was created
SELECT id, admin_code, first_name, last_name, email, admin_level, is_active, created_at
FROM public.admins
WHERE email = 'denzielcapangpangan@gmail.com';
