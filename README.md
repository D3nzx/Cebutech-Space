# 🎓 CebuTech Space - Faculty Scheduling System

A comprehensive scheduling system for Cebu Technological University, built with React and Supabase.

## 📋 Features

- **Multi-role System**: Administrator, Campus Director, Dean, Program Head, Faculty, and Student portals
- **Schedule Management**: Create and manage class schedules with conflict detection
- **Report Generation**: Generate and approve scheduling reports
- **Notifications**: Real-time notifications for schedule changes and approvals
- **Location Management**: Manage rooms and locations for classes
- **Faculty Management**: Track faculty qualifications and assignments

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Calendar**: FullCalendar
- **Routing**: React Router v6

## 📦 Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd CEBUTECH-SPACE
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local`
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

## 📁 Project Structure

```
CEBUTECH-SPACE/
├── src/
│   ├── api/              # API service files
│   ├── components/       # React components
│   │   ├── Administrator/
│   │   ├── CampusDirector/
│   │   ├── Dean/
│   │   ├── Faculty/
│   │   ├── ProgramHead/
│   │   └── Student/
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   └── styles/          # CSS files
├── database/            # SQL scripts and data
│   ├── data/           # Initial data SQL files
│   └── table/          # Database schema
└── public/             # Static assets
```

## 🔐 User Roles

1. **Administrator** - System-wide management
2. **Campus Director** - Campus-level oversight
3. **Dean** - College-level management
4. **Program Head** - Course and schedule management
5. **Faculty** - View and manage personal schedules
6. **Student** - View course schedules

## 🗄️ Database Setup

Database scripts are available in the `database/` folder:
- Table schema: `database/table/restore_database.sql`
- Initial data: `database/data/*.sql`

## 📝 License

This project is part of Cebu Technological University's academic system.

## 👥 Contributors

Developed for Cebu Technological University
