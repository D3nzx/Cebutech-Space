const fs = require('fs');
const path = require('path');
const base = path.join('database', 'FINAL SCHEMA', 'TABLE');
const order = [
  '00_SETUP.sql',
  '01_colleges.sql',
  '02_courses.sql',
  '03_program_heads.sql',
  '04_admins.sql',
  '05_campus_directors.sql',
  '05_campus_directors_auth_handler.sql',
  '05_deans.sql',
  '05_faculty.sql',
  '06_students.sql',
  '07_subjects.sql',
  '08_locations.sql',
  '08_course_majors.sql',
  '09_course_subject_offerings.sql',
  '10_schedules.sql',
  '11_schedule_approvals.sql',
  '12_notifications.sql',
  '12_notifications_update.sql',
  '12_notifications_admin_update.sql',
  '13_report_approval_requests.sql',
  '14_report_approval_comments.sql',
  '15_pending_registrations.sql',
  '04_colleges_and_courses_data.sql'
];
const out = path.join('database', 'FINAL SCHEMA', 'restore_database.sql');
let outText = '-- Database restore script for CEBUTECH-SPACE project\n';
outText += '-- Run this in a fresh Supabase SQL editor or psql session after creating the project.\n';
outText += 'SET search_path = public;\n\n';
order.forEach((fn) => {
  const p = path.join(base, fn);
  outText += `-- ================= SOURCE: ${fn} =================\n`;
  outText += fs.readFileSync(p, 'utf8');
  outText += '\n\n';
});
fs.writeFileSync(out, outText, 'utf8');
console.log('Created', out);
