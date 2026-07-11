# 🚀 GitHub & Vercel Deployment Guide

This guide will walk you through deploying your CebuTech Space project to GitHub and Vercel.

---

## Part 1: Push to GitHub

### Step 1: Create a GitHub Account (if you don't have one)
1. Go to [github.com](https://github.com)
2. Click "Sign up"
3. Follow the registration process

### Step 2: Create a New Repository on GitHub
1. Log in to GitHub
2. Click the "+" icon in the top-right corner
3. Select "New repository"
4. Fill in the details:
   - **Repository name**: `cebutech-space` (or any name you prefer)
   - **Description**: "Faculty Scheduling System for Cebu Technological University"
   - **Visibility**: Choose "Public" or "Private"
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### Step 3: Connect Your Local Repository to GitHub
After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/cebutech-space.git

# Push your code to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 4: Verify the Upload
1. Refresh your GitHub repository page
2. You should see all your files uploaded

---

## Part 2: Deploy to Vercel

### Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. **Recommended**: Sign up with your GitHub account for easier integration
4. Follow the registration process

### Step 2: Import Your Project
1. After logging in, click "Add New..." → "Project"
2. You'll see your GitHub repositories listed
3. Find "cebutech-space" and click "Import"

### Step 3: Configure Project Settings
Vercel will automatically detect that it's a Vite project. Configure these settings:

**Build & Development Settings:**
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (should be auto-detected)
- **Output Directory**: `dist` (should be auto-detected)
- **Install Command**: `npm install` (should be auto-detected)

### Step 4: Add Environment Variables
⚠️ **IMPORTANT**: You must add your Supabase credentials as environment variables.

1. In the Vercel project settings, scroll down to "Environment Variables"
2. Add these variables:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

**Where to find these values:**
- Open your `.env.local` file locally
- Copy the values (DO NOT commit this file to GitHub!)
- Paste them into Vercel

3. Make sure to add them for all environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

### Step 5: Deploy!
1. Click "Deploy"
2. Vercel will:
   - Install dependencies
   - Build your project
   - Deploy it to a production URL
3. Wait 1-3 minutes for the deployment to complete

### Step 6: Access Your Deployed Site
1. Once deployment is complete, you'll see a success screen
2. Your site will be available at: `https://your-project-name.vercel.app`
3. Click "Visit" to open your deployed application

---

## 🔄 Automatic Deployments

Good news! Now every time you push changes to GitHub, Vercel will automatically:
1. Detect the changes
2. Build your project
3. Deploy the new version

**To deploy updates:**
```bash
# Make your changes, then:
git add .
git commit -m "Your commit message"
git push
```

That's it! Vercel will handle the rest.

---

## 🔧 Additional Configuration

### Custom Domain (Optional)
1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain and follow the DNS configuration instructions

### Vercel CLI (Optional)
For advanced users, you can deploy directly from your terminal:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

---

## ⚠️ Important Notes

### Security
- ✅ Never commit `.env.local` to GitHub (it's already in `.gitignore`)
- ✅ Always use environment variables in Vercel for sensitive data
- ✅ Your Supabase keys are public "anon" keys, but still keep them in environment variables

### Supabase Configuration
After deployment, you may need to:
1. Add your Vercel domain to Supabase's allowed redirect URLs
2. Go to Supabase Dashboard → Authentication → URL Configuration
3. Add: `https://your-project-name.vercel.app/**`

### Testing
1. Test your production site thoroughly after deployment
2. Check that:
   - Authentication works
   - Database connections work
   - All routes are accessible
   - Images and assets load correctly

---

## 🐛 Troubleshooting

### Build Failed
- Check Vercel's build logs for specific errors
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### Database Connection Issues
- Verify Supabase environment variables in Vercel
- Check Supabase URL is correct (should end with `.supabase.co`)
- Ensure Supabase project is not paused

### 404 Errors on Page Refresh
- This is handled by `vercel.json` in your project
- If issues persist, verify the `vercel.json` configuration

### Authentication Not Working
- Add Vercel URL to Supabase allowed redirect URLs
- Check that environment variables are set for production

---

## 📚 Helpful Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Guides](https://guides.github.com/)

---

## 🎉 Congratulations!

You've successfully deployed your CebuTech Space project! Your application is now live and accessible to anyone with the URL.

**Next Steps:**
1. Share the URL with your team
2. Set up continuous integration/deployment workflows
3. Monitor your application's performance
4. Consider setting up a custom domain
