# Deployment Guide - Emmanuel Assembly ChMS

This guide provides step-by-step instructions for deploying the Church Management System to production.

## 📋 Prerequisites

- Supabase account and project
- Vercel account
- GitHub repository
- Domain name (optional)
- SMS provider credentials (Twilio or Africa's Talking)

## 🗄️ Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Choose a region close to your users
4. Note down your project URL and API keys

### 1.2 Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push

# Verify tables were created
supabase db diff
```

### 1.3 Set Up Storage Buckets

```sql
-- Create exports bucket for generated files
INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', true);

-- Create profiles bucket for member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profiles', 'profiles', true);
```

### 1.4 Configure RLS for Storage

```sql
-- Allow authenticated users to upload profile photos
CREATE POLICY "Users can upload profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);

-- Allow users to view their own profile photos
CREATE POLICY "Users can view profile photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profiles' AND
  auth.role() = 'authenticated'
);
```

## 🚀 Step 2: Deploy Edge Functions

### 2.1 Deploy All Functions

```bash
# Deploy keep-alive function
supabase functions deploy keep-alive

# Deploy SMS dispatcher
supabase functions deploy sms-dispatcher

# Deploy scheduled exports
supabase functions deploy scheduled-exports
```

### 2.2 Set Function Environment Variables

In your Supabase dashboard, go to Edge Functions and set:

```env
# For all functions
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# For SMS dispatcher
SMS_PROVIDER=twilio  # or 'africas_talking' or 'mock'
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_from_number

# For keep-alive
ENVIRONMENT=production
```

### 2.3 Set Up Cron Jobs

In Supabase dashboard, go to Database > Cron and create:

```sql
-- Keep-alive function every 5 minutes
SELECT cron.schedule('keep-alive', '*/5 * * * *', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/keep-alive'', headers:=''{"Content-Type": "application/json"}''::jsonb) as request_id;');

-- Scheduled exports every hour
SELECT cron.schedule('scheduled-exports', '0 * * * *', 'SELECT net.http_post(url:=''https://your-project.supabase.co/functions/v1/scheduled-exports'', headers:=''{"Content-Type": "application/json"}''::jsonb) as request_id;');
```

## 🌐 Step 3: Vercel Deployment

### 3.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Choose Next.js framework
4. Set build command: `bun build` (or `npm run build`)

### 3.2 Environment Variables

Set these in Vercel dashboard:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SMS (optional for frontend)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_from_number
```

### 3.3 Domain Configuration (Optional)

1. Go to Vercel project settings
2. Add your custom domain
3. Update DNS records as instructed
4. Enable HTTPS (automatic)

## 📱 Step 4: PWA Configuration

### 4.1 Generate Icons

Create app icons and place in `/public`:

```bash
# Required sizes
icon-192x192.png
icon-512x512.png

# Optional screenshots
screenshot-mobile.png (390x844)
screenshot-desktop.png (1280x720)
```

### 4.2 Verify PWA Setup

1. Deploy to Vercel
2. Visit your site in Chrome
3. Look for "Install" prompt
4. Test offline functionality

## 🔐 Step 5: Security Configuration

### 5.1 Supabase Auth Settings

In Supabase dashboard > Authentication > Settings:

```env
# Site URL
Site URL: https://your-domain.vercel.app

# Redirect URLs
Additional Redirect URLs:
- https://your-domain.vercel.app/auth/callback
- http://localhost:3000/auth/callback (for development)

# Phone Auth
Enable phone confirmations: true
```

### 5.2 CORS Configuration

Update Supabase settings:

```env
# Allowed origins
https://your-domain.vercel.app
http://localhost:3000
```

### 5.3 API Security

```sql
-- Ensure RLS is enabled on all tables
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)

-- Verify policies are working
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

## 👥 Step 6: Initial Data Setup

### 6.1 Create Admin User

```sql
-- Create first admin user
INSERT INTO app_users (
  full_name,
  phone,
  email,
  role,
  membership_id,
  join_year
) VALUES (
  'System Administrator',
  '+233241234567',
  'admin@emmanuelassembly.org',
  'admin',
  'EA-0001-2024',
  2024
);

-- Create corresponding member record
INSERT INTO members (
  user_id,
  status
) VALUES (
  (SELECT id FROM app_users WHERE membership_id = 'EA-0001-2024'),
  'active'
);
```

### 6.2 Seed Sample Data (Optional)

```bash
# Run seed script
bun run seed
```

## 📊 Step 7: Monitoring Setup

### 7.1 Health Monitoring

1. Set up Uptime Robot or similar
2. Monitor your Vercel deployment URL
3. Monitor Supabase project health
4. Set up alerts for downtime

### 7.2 Error Tracking

Consider adding:

- Sentry for error tracking
- LogRocket for session replay
- Google Analytics for usage stats

### 7.3 Performance Monitoring

- Vercel Analytics (built-in)
- Supabase dashboard metrics
- Core Web Vitals monitoring

## 🔧 Step 8: Post-Deployment

### 8.1 Test Core Functionality

1. **Authentication**

   - Phone OTP login
   - Membership ID login
   - Role-based access

2. **Attendance**

   - QR code scanning
   - Kiosk mode
   - Offline sync

3. **Member Management**

   - Profile creation
   - Family management
   - Bulk import

4. **PWA Features**
   - Offline functionality
   - Install prompts
   - Background sync

### 8.2 User Training

Create documentation for:

- Admin panel usage
- Member onboarding
- Troubleshooting guide
- Best practices

### 8.3 Backup Strategy

1. **Database Backups**

   - Enable automatic backups in Supabase
   - Set retention policy (30 days recommended)
   - Test restore procedures

2. **Code Backups**
   - GitHub repository (already handled)
   - Regular exports of configuration

## 🚨 Troubleshooting

### Common Issues

#### Authentication Problems

```bash
# Check Supabase Auth settings
# Verify phone number format
# Check SMS provider configuration
```

#### Database Connection Issues

```bash
# Verify environment variables
# Check RLS policies
# Test with service role key
```

#### PWA Not Working

```bash
# Check manifest.json
# Verify service worker registration
# Test HTTPS requirement
```

#### Edge Functions Failing

```bash
# Check function logs in Supabase
# Verify environment variables
# Test function endpoints manually
```

### Debug Commands

```bash
# Check Supabase connection
supabase status

# View function logs
supabase functions logs keep-alive
supabase functions logs sms-dispatcher

# Test database connection
supabase db ping
```

## 📞 Support

### Getting Help

1. **Documentation**: Check README.md and this guide
2. **Issues**: Create GitHub issues for bugs
3. **Community**: Join Supabase and Vercel communities
4. **Professional**: Contact development team

### Maintenance Schedule

- **Weekly**: Check system health and logs
- **Monthly**: Review user feedback and performance
- **Quarterly**: Update dependencies and security patches
- **Annually**: Review architecture and scaling needs

---

**🎉 Congratulations! Your Church Management System is now live!**

Remember to:

- Monitor system health regularly
- Keep backups up to date
- Train users on new features
- Gather feedback for improvements
