# 🚀 Quick Command Reference

Use these commands when working with your project.

## GitHub Commands

### First Time Setup (Run these once)
```bash
# Add GitHub as remote repository
git remote add origin https://github.com/YOUR_USERNAME/cebutech-space.git

# Push your code to GitHub for the first time
git push -u origin main
```

### Daily Workflow (Use these regularly)
```bash
# Check what files have changed
git status

# Add all changed files
git add .

# Commit your changes
git commit -m "Describe what you changed"

# Push to GitHub
git push

# Pull latest changes from GitHub
git pull
```

### Common Git Commands
```bash
# See commit history
git log

# Create a new branch
git checkout -b feature-name

# Switch to a branch
git checkout branch-name

# See all branches
git branch

# Undo last commit (but keep changes)
git reset --soft HEAD~1

# Discard all local changes
git reset --hard HEAD
```

## Project Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Vercel Commands (Optional - CLI)

### Install Vercel CLI
```bash
npm install -g vercel
```

### Vercel Workflow
```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

## Environment Setup

### Copy environment file
```bash
# Copy the example file
copy .env.example .env.local
```

Then edit `.env.local` with your actual Supabase credentials.

## Troubleshooting Commands

### Clear node_modules and reinstall
```bash
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Clear Vite cache
```bash
rmdir /s /q node_modules/.vite
npm run dev
```

### Check Node and npm versions
```bash
node --version
npm --version
```

## Tips

1. **Before starting work**: `git pull` to get latest changes
2. **After making changes**: `git add .` → `git commit -m "message"` → `git push`
3. **Commit often**: Make small, frequent commits with clear messages
4. **Use descriptive messages**: Examples:
   - ✅ "fix: Fix login button not working"
   - ✅ "feat: Add faculty schedule view"
   - ✅ "docs: Update README with installation steps"
   - ❌ "updates"
   - ❌ "fix stuff"

## Commit Message Prefixes

Use these prefixes for better organization:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Example:**
```bash
git commit -m "feat: Add export to Excel functionality for schedules"
```
