# Vercel Deployment Guide

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/isaackumi/emmanual-assembly-cop)

## Manual Deployment

1. **Connect to Vercel**

   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account
   - Click "New Project"
   - Import the repository: `isaackumi/emmanual-assembly-cop`

2. **Environment Variables**
   Add these environment variables in Vercel dashboard:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. **Build Settings**

   - Framework Preset: `Next.js`
   - Build Command: `bun run build`
   - Output Directory: `.next`
   - Install Command: `bun install`

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy your app
   - Your app will be available at `https://your-app.vercel.app`

## Post-Deployment Setup

1. **Database Setup**

   - Run the SQL migrations in your Supabase dashboard
   - Start with `001_initial_schema.sql`, then `002_rls_policies.sql`, etc.

2. **Admin User**

   - Use the seed scripts to create an admin user
   - Or manually create a user with role `admin` in Supabase

3. **Test the Application**
   - Visit your deployed URL
   - Test login with admin credentials
   - Verify all features are working

## Environment Variables Reference

| Variable                        | Description               | Required |
| ------------------------------- | ------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key    | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key | Yes      |

## Troubleshooting

### Build Fails

- Ensure all environment variables are set
- Check that the repository is public or you have proper access
- Verify the build command is correct

### Runtime Errors

- Check Supabase connection
- Verify RLS policies are set up correctly
- Check browser console for errors

### Database Issues

- Ensure migrations are run in correct order
- Check Supabase logs for any errors
- Verify user permissions

## Support

For issues with deployment, check:

1. Vercel build logs
2. Supabase dashboard logs
3. Browser console errors
4. This repository's issues section
