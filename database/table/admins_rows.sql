-- Safe admin seed for Supabase
-- Copy and paste directly into Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- IMPORTANT: Replace the placeholder values below with real data before running in production.

INSERT INTO "public"."admins" (
  "id",
  "auth_user_id",
  "admin_code",
  "first_name",
  "middle_name",
  "last_name",
  "email",
  "gender",
  "contact_number",
  "address",
  "admin_level",
  "is_active"
)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'admin@ctu.edu' LIMIT 1),
  'ADM-XXXXXX',
  'Admin',
  'Placeholder',
  'User',
  'admin@ctu.edu',
  'Prefer not to say',
  '00000000000',
  'Address placeholder',
  'super',
  true
)
ON CONFLICT ("email") DO UPDATE SET
  "admin_level" = EXCLUDED."admin_level",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();
