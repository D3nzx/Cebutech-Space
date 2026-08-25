# 🎓 CebuTech Space - Faculty Scheduling System

A comprehensive multi-role scheduling system for Cebu Technological University, built with React and Supabase. It streamlines class scheduling, approvals, and reporting across the university's administrative hierarchy.

## 📋 Features

- **Multi-role System**: Administrator, Campus Director, Dean, Program Head, Faculty, and Student portals
- **Schedule Management**: Create and manage class schedules with conflict detection
- **Report Generation & Approvals**: Generate, submit, and approve scheduling reports across roles
- **Notifications**: Real-time notifications for schedule changes and approvals
- **Location Management**: Manage rooms and locations for classes
- **Faculty Management**: Track faculty qualifications, subject offerings, and assignments
- **Authentication**: Role-based auth for admins, faculty, and students via Supabase

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite 7
- **Styling**: Tailwind CSS 3, PostCSS, Autoprefixer
- **Backend / Database**: Supabase (PostgreSQL + Auth)
- **Calendar**: FullCalendar (core, daygrid, timegrid, interaction, react)
- **Routing**: React Router v7 (`react-router-dom`)
- **Icons**: Lucide React
- **Linting**: ESLint 9 (flat config) with React Hooks plugin

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd Cebutech-Space
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a `.env.local` file in the project root
   - Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

## 🏗️ Build

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

To lint the codebase:
```bash
npm run lint
```

## 📁 Project Structure

```
Cebutech-Space/
├── database/
│   └── table/                 # Database schema (restore_database.sql)
├── public/                    # Static assets
├── src/
│   ├── api/                   # API service files (auth, schedules, faculty, students, etc.)
│   ├── assets/                # Images and SVGs
│   ├── components/
│   │   ├── Administrator/     # Admin dashboard & modals
│   │   ├── Auth/              # Faculty/Student login & register forms
│   │   ├── CampusDirector/    # Campus Director dashboard
│   │   ├── Dean/               # Dean dashboard
│   │   ├── ErrorBoundary/     # App-wide error boundary
│   │   ├── Faculty/           # Faculty dashboard
│   │   ├── ProgramHead/       # Program Head dashboard & login
│   │   ├── ProtectedRoute/    # Route guards
│   │   ├── Shared/            # Shared report viewers/printouts
│   │   └── Student/           # Student dashboard
│   ├── hooks/                 # Custom React hooks (form/modal persistence)
│   ├── lib/                   # Supabase client, multi-session manager
│   ├── pages/                 # Route-level pages per role
│   ├── styles/                # Global, Tailwind, and index CSS
│   ├── App.jsx                # Root component with route definitions
│   └── main.jsx                # App entry point
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── eslint.config.cjs
└── vercel.json
```

## 🔐 User Roles

1. **Administrator** - System-wide management and oversight
2. **Campus Director** - Campus-level oversight and approvals
3. **Dean** - College-level management and scheduling reports
4. **Program Head** - Course and schedule management
5. **Faculty** - View and manage personal schedules and qualifications
6. **Student** - View course schedules

## 🗄️ Database Setup

Database schema is available in the `database/table/` folder:
- Table schema: `database/table/restore_database.sql`

## 📝 License

This project is part of Cebu Technological University's academic system.

## 👥 Contributors

Developed for Cebu Technological University
