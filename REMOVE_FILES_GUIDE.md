# 🗑️ How to Remove Files from Git (Keep Locally)

## The Problem

You have files tracked by Git that you want to remove from your repository, but you want to keep them on your local computer.

Common scenarios:
- Accidentally committed `.env` files with secrets
- Committed large `node_modules` folder
- Added build files (`dist/`) that should be ignored
- Files with problematic names (too long, special characters)

---

## The Solution

Use `git rm --cached` command.

### Key Flags:
- `--cached` = Remove from Git only, keep local file
- `-r` = Recursive (needed for folders)

---

## Step-by-Step Guide

### **Step 1: Remove Files from Git Tracking**

#### Remove a Single File:
```bash
git rm --cached filename.ext
```

**Example:**
```bash
git rm --cached .env.local
```

#### Remove a Folder:
```bash
git rm --cached -r folder-name/
```

**Example:**
```bash
git rm --cached -r node_modules/
git rm --cached -r dist/
```

#### Remove Multiple Files (Pattern):
```bash
git rm --cached "*.log"
git rm --cached "*.env"
```

---

### **Step 2: Add to .gitignore (Important!)**

After removing, add the files to `.gitignore` to prevent re-adding them:

```bash
# Open .gitignore and add:
node_modules/
dist/
*.log
.env.local
```

---

### **Step 3: Commit the Changes**

```bash
git commit -m "Remove files from Git tracking"
```

---

### **Step 4: Push to GitHub**

```bash
git push
```

---

## Real Examples

### Example 1: Remove .env.local (If Accidentally Committed)

```bash
# 1. Remove from Git
git rm --cached .env.local

# 2. Make sure it's in .gitignore
echo .env.local >> .gitignore

# 3. Commit
git commit -m "Remove .env.local from tracking"

# 4. Push
git push
```

---

### Example 2: Remove node_modules Folder

```bash
# 1. Remove from Git
git rm --cached -r node_modules/

# 2. Make sure it's in .gitignore
echo node_modules/ >> .gitignore

# 3. Commit
git commit -m "Remove node_modules from tracking"

# 4. Push
git push
```

---

### Example 3: Remove Problematic Image Files

For your case with long filename images:

```bash
# 1. Remove all problematic images at once
git rm --cached "src/assets/images/c__Users_Denziel_*"

# 2. Already in .gitignore (we added this)

# 3. Commit
git commit -m "Remove temp image files from tracking"

# 4. Push
git push
```

---

### Example 4: Remove Build Files (dist folder)

```bash
# 1. Remove dist folder from Git
git rm --cached -r dist/

# 2. Add to .gitignore
echo dist/ >> .gitignore

# 3. Commit
git commit -m "Remove build files from tracking"

# 4. Push
git push
```

---

## ⚠️ Important Warnings

### DON'T Remove --cached Flag!

❌ **WRONG** (This deletes the local file too!):
```bash
git rm filename.ext    # Deletes local file!
```

✅ **CORRECT** (Keeps local file):
```bash
git rm --cached filename.ext    # Only removes from Git
```

---

### Files Will Remain in History

Important: Removing files from Git only removes them from the current state forward. They still exist in Git history.

**If you committed secrets (passwords, API keys):**
1. Change the secrets immediately (new passwords, regenerate keys)
2. Remove from Git using above method
3. For sensitive data, consider using `git filter-branch` or BFG Repo-Cleaner to remove from history

---

## Verification

### Check What's Tracked by Git:
```bash
git ls-files
```

### Check Status After Removal:
```bash
git status
```

You should see:
```
deleted:    filename.ext
```

### Verify Local File Still Exists:
```bash
# On Windows:
dir filename.ext

# Or just check in File Explorer
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Remove single file | `git rm --cached file.txt` |
| Remove folder | `git rm --cached -r folder/` |
| Remove by pattern | `git rm --cached "*.log"` |
| Check tracked files | `git ls-files` |
| Verify removal | `git status` |

---

## Common Scenarios for CebuTech Space Project

### Remove Temporary Cache Files:
```bash
git rm --cached -r node_modules/.cache/
git commit -m "Remove cache files"
git push
```

### Remove Build Artifacts:
```bash
git rm --cached -r dist/
git rm --cached build.log
git commit -m "Remove build artifacts"
git push
```

### Remove Editor Config (if personal):
```bash
git rm --cached -r .vscode/
git commit -m "Remove personal editor config"
git push
```

---

## Troubleshooting

### "Did not match any files"
- The file might not be tracked by Git
- Check with: `git ls-files | grep filename`
- Verify file path is correct

### "Unable to create file ... Filename too long"
- This happens on Windows with long paths
- Solution: Use wildcard patterns:
  ```bash
  git rm --cached "src/assets/images/c__Users_*"
  ```

### File Reappears After Commit
- Make sure the file is in `.gitignore`
- Check: `git check-ignore filename`
- If not ignored, add it to `.gitignore`

---

## After Removal Checklist

- [ ] File removed from Git tracking
- [ ] Local file still exists
- [ ] File added to `.gitignore`
- [ ] Changes committed
- [ ] Changes pushed to GitHub
- [ ] Verified on GitHub that file is gone

---

## Need to Remove from History Too?

If you need to completely remove files from Git history (for sensitive data):

**Using BFG Repo-Cleaner (Recommended):**
```bash
# Download BFG: https://rtyley.github.io/bfg-repo-cleaner/

# Remove file from entire history
java -jar bfg.jar --delete-files filename.ext

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ careful!)
git push --force
```

**Note:** Only use `--force` push if you understand the implications!

---

## Summary

**Remember:** `--cached` is your friend!

- ✅ `git rm --cached` = Remove from Git, keep locally
- ❌ `git rm` = Delete from everywhere

Always follow up with:
1. Add to `.gitignore`
2. Commit the changes
3. Push to remote

That's it! Your files are now removed from Git but safe on your computer.
