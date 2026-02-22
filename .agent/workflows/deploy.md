---
description: How to update your hosted QuizStorm application on Vercel and Supabase
---

# Deployment & Update Workflow

Follow these steps to "implement" the latest changes (Avatars + Branding) on your live Vercel site.

## 1. Update the Database (Supabase)
The new Avatar feature requires a new column in your database. 
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** in the left sidebar.
3. Click **New Query** and paste the following:

```sql
-- Add avatar_url column to players table
ALTER TABLE public.players 
ADD COLUMN avatar_url TEXT;

-- Verify profiles has it (usually already exists for hosts)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name='profiles' AND column_name='avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
```
4. Click **Run**.

## 2. Push Changes to GitHub
Since your project is already hosted on Vercel, it is likely connected to a GitHub repository.
1. Open your terminal in the project root.
2. Run the following commands:

```bash
git add .
git commit -m "Update: Added Avatar System and QuizStorm Branding"
git push origin main
```

## 3. Verify Vercel Deployment
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your project.
3. You should see a "Ready" deployment for the latest commit. 
4. Open the link and check that the browser tab now says **QuizStorm** and the new logo is visible!

## 4. Test the Live App
- Go to the **Dashboard > Settings** on your live site and pick an avatar.
- Start a quiz and join as a guest from another tab to verify the avatar appears in the lobby.
