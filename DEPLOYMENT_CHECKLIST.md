# ✅ Deployment Checklist

Follow this checklist step by step to deploy your project.

---

## 📋 Pre-Deployment Checklist

- [x] Git repository initialized
- [x] Initial commit created
- [x] .gitignore configured (protects .env.local)
- [x] .env.example created for reference
- [x] README.md created
- [x] vercel.json configured
- [ ] GitHub account created
- [ ] Vercel account created

---

## 🐙 GitHub Setup Checklist

### Step 1: Create GitHub Repository
- [ ] Go to [github.com](https://github.com) and sign in
- [ ] Click the "+" icon → "New repository"
- [ ] Set repository name: `cebutech-space` (or your choice)
- [ ] Set description: "Faculty Scheduling System for Cebu Technological University"
- [ ] Choose visibility: Public or Private
- [ ] **DO NOT** check "Add README", "Add .gitignore", or "Choose a license"
- [ ] Click "Create repository"
- [ ] **Copy the repository URL** (it will look like: `https://github.com/YOUR_USERNAME/cebutech-space.git`)

### Step 2: Connect and Push to GitHub
Open your terminal in this project folder and run:

```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/cebutech-space.git

# Push your code to GitHub
git push -u origin main
```

### Step 3: Verify Upload
- [ ] Refresh your GitHub repository page in the browser
- [ ] Verify all files are visible (except .env.local)
- [ ] Check that README.md displays on the repository homepage

---

## 🚀 Vercel Deployment Checklist

### Step 1: Create Vercel Account
- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "Sign Up"
- [ ] **Recommended**: Sign up using your GitHub account
- [ ] Complete the registration

### Step 2: Import Project
- [ ] Click "Add New..." → "Project"
- [ ] Select "Import Git Repository"
- [ ] Find "cebutech-space" from the list
- [ ] Click "Import"

### Step 3: Configure Build Settings
Verify these settings (should be auto-detected):
- [ ] Framework Preset: **Vite**
- [ ] Build Command: **`npm run build`**
- [ ] Output Directory: **`dist`**
- [ ] Install Command: **`npm install`**

### Step 4: Add Environment Variables
⚠️ **CRITICAL STEP** - Your app won't work without this!

Add these environment variables:

**Variable 1:**
- Name: `VITE_SUPABASE_URL`
- Value: Copy from your `.env.local` file

**Variable 2:**
- Name: `VITE_SUPABASE_ANON_KEY`
- Value: Copy from your `.env.local` file

**Important:**
- [ ] Apply to: Production ✅
- [ ] Apply to: Preview ✅
- [ ] Apply to: Development ✅

### Step 5: Deploy
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete (1-3 minutes)
- [ ] Deployment successful ✅

### Step 6: Test Deployment
- [ ] Click "Visit" or open the deployment URL
- [ ] Test the homepage loads
- [ ] Test navigation between pages
- [ ] Test login functionality
- [ ] Test database connections
- [ ] Verify images and assets load correctly

---

## 🔧 Post-Deployment Setup

### Configure Supabase for Production
- [ ] Open [Supabase Dashboard](https://app.supabase.com)
- [ ] Select your project
- [ ] Go to Authentication → URL Configuration
- [ ] Under "Redirect URLs", click "Add URL"
- [ ] Add: `https://your-project-name.vercel.app/**`
- [ ] Replace `your-project-name` with your actual Vercel domain
- [ ] Click "Save"

### Get Your Production URLs
After deployment, you'll have:

**Production URL:**
- Format: `https://your-project-name.vercel.app`
- [ ] Save this URL: _______________________________

**Vercel Dashboard:**
- [ ] Bookmark for easy access: _______________________________

**GitHub Repository:**
- [ ] Bookmark: _______________________________

---

## 📝 Post-Deployment Tasks

### Document Your URLs
Create a file to save important URLs:
- [ ] Production URL: _______________________________
- [ ] GitHub Repo: _______________________________
- [ ] Vercel Dashboard: _______________________________
- [ ] Supabase Dashboard: _______________________________

### Share with Team
- [ ] Send production URL to team members
- [ ] Share GitHub repository access (if needed)
- [ ] Document login credentials for different user types

### Set Up Monitoring
- [ ] Check Vercel Analytics (if needed)
- [ ] Set up error monitoring (optional)
- [ ] Configure deployment notifications (optional)

---

## 🔄 Future Deployments

Every time you want to deploy changes:

```bash
# 1. Make your changes to the code

# 2. Test locally
npm run dev

# 3. Commit and push to GitHub
git add .
git commit -m "Description of your changes"
git push

# 4. Vercel automatically deploys! 🎉
```

---

## 🐛 Troubleshooting

### If Deployment Fails
- [ ] Check Vercel build logs for errors
- [ ] Verify environment variables are set
- [ ] Ensure package.json has all dependencies
- [ ] Try deploying again

### If Site Loads But Doesn't Work
- [ ] Verify Supabase environment variables in Vercel
- [ ] Check browser console for errors (F12)
- [ ] Verify Supabase redirect URLs include Vercel domain
- [ ] Check Supabase project is not paused

### If Authentication Doesn't Work
- [ ] Add Vercel URL to Supabase redirect URLs
- [ ] Check environment variables are correct
- [ ] Verify Supabase project is active
- [ ] Test with browser in incognito mode

---

## ✅ Completion

Once everything is checked off:

🎉 **Congratulations!** Your CebuTech Space project is now live!

**Final Steps:**
- [ ] Test all major features on production
- [ ] Document any issues found
- [ ] Create a backup of your .env.local file (store securely)
- [ ] Share success with your team!

---

## 📞 Need Help?

If you encounter issues:

1. **Check the logs:**
   - Vercel: Project → Deployments → Click deployment → View logs
   - Browser: F12 → Console tab

2. **Common solutions:**
   - Redeploy: Vercel Dashboard → Deployments → ⋮ → Redeploy
   - Clear cache: Vercel Dashboard → Settings → General → Clear build cache
   - Rebuild: `git commit --allow-empty -m "Trigger rebuild" && git push`

3. **Resources:**
   - [Vercel Documentation](https://vercel.com/docs)
   - [Supabase Documentation](https://supabase.com/docs)
   - [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
