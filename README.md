# Emmanuel Assembly - Church Management System

A comprehensive Church Management System (ChMS) built for The Church of Pentecost — Emmanuel Assembly (Odorkor Area, Gbawe CP District).

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **PWA**: Offline-first with service worker and IndexedDB sync
- **SMS**: Provider abstraction (Twilio, Africa's Talking, etc.)
- **Hosting**: Vercel (Frontend) + Supabase (Backend)

## ✨ Features

### 🔐 Authentication & Authorization

- Phone OTP authentication
- Membership ID login support
- Role-based access control (Admin, Pastor, Elder, Finance Officer, Member, Visitor)
- Admin-only user creation (no open signups)

### 👥 Member Management

- Membership ID generation (EA-XXXXYYYY format)
- Profile completion tracking
- Family tree management
- Bulk CSV import/export
- Advanced search with full-text search

### 📊 Attendance System

- QR code scanner for quick check-ins
- Kiosk mode for manual check-ins
- Parent-linked child check-in
- Offline buffering with automatic sync
- Multiple service types support

### 💰 Financial Management

- Donations tracking
- Pledges management
- Expense tracking
- Financial reporting and exports

### 📱 PWA Capabilities

- Offline-first architecture
- Background sync
- Push notifications
- Installable app experience
- Mobile-optimized interface

### 📈 Reporting & Analytics

- Role-specific dashboards
- Export to CSV/XLSX/PDF
- Attendance analytics
- Financial reports
- Custom date ranges

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Bun (recommended) or npm
- Supabase account
- Vercel account (for deployment)

### 1. Clone and Install

```bash
git clone <repository-url>
cd cop-chMS
bun install
```

### 2. Environment Setup

Create `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMS Provider (choose one)
SMS_PROVIDER=mock # or 'twilio' or 'africas_talking'

# Twilio (if using)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_from_number

# Africa's Talking (if using)
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
```

### 3. Database Setup

1. Create a new Supabase project
2. Run the migration files:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your_project_ref

# Run migrations
supabase db push
```

### 4. Development

```bash
bun dev
```

Visit `http://localhost:3000`

### 5. Deploy Edge Functions

```bash
supabase functions deploy keep-alive
supabase functions deploy sms-dispatcher
supabase functions deploy scheduled-exports
```

## 📋 Database Schema

### Core Tables

- `app_users` - User accounts with roles and profile metadata
- `members` - Extended member profiles
- `dependants` - Family members and dependants
- `attendance` - Service attendance records
- `donations` - Financial donations
- `pledges` - Member pledges
- `expenses` - Church expenses
- `messages` - Internal messaging system
- `prayer_requests` - Prayer request management
- `equipment` - Church equipment tracking
- `audit_logs` - System audit trail

### Key Features

- **Row Level Security (RLS)** - Comprehensive security policies
- **Full-text search** - PostgreSQL tsvector with trigram fallback
- **Audit logging** - Automatic change tracking
- **Membership ID generation** - Automated EA-XXXXYYYY format

## 🔧 Configuration

### SMS Providers

#### Twilio

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=your_from_number
```

#### Africa's Talking

```env
SMS_PROVIDER=africas_talking
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_USERNAME=your_username
```

#### Mock (Development)

```env
SMS_PROVIDER=mock
```

### PWA Configuration

The app is configured as a PWA with:

- Service worker for offline functionality
- IndexedDB for local data storage
- Background sync for offline actions
- Install prompts for mobile devices

## 📱 Usage Guide

### For Administrators

1. **User Management**: Create user accounts via admin panel
2. **Bulk Import**: Upload CSV files to create multiple users
3. **Role Assignment**: Assign appropriate roles to users
4. **System Monitoring**: View audit logs and system health

### For Members

1. **Profile Setup**: Complete profile information for better tracking
2. **Family Management**: Add family members and dependants
3. **Attendance**: Check in via QR code or kiosk mode
4. **Donations**: View donation history and make pledges

### For Staff

1. **Attendance Tracking**: Monitor service attendance
2. **Member Support**: Assist with profile updates
3. **Reporting**: Generate attendance and financial reports
4. **Communication**: Send messages to members

## 🧪 Testing

### Run Tests

```bash
# Unit tests
bun test

# E2E tests
bun run test:e2e
```

### Test Coverage

- Membership ID generation and validation
- RLS policy enforcement
- Offline sync functionality
- Attendance workflow
- Authentication flows

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Supabase)

1. Deploy edge functions:

```bash
supabase functions deploy
```

2. Set up scheduled functions:

```bash
# Keep-alive function (every 5 minutes)
supabase functions deploy keep-alive

# SMS dispatcher
supabase functions deploy sms-dispatcher

# Scheduled exports
supabase functions deploy scheduled-exports
```

### Environment Variables

Set these in your deployment platform:

**Vercel:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Supabase Edge Functions:**

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMS_PROVIDER`
- `TWILIO_*` or `AFRICAS_TALKING_*`

## 📊 Monitoring

### Health Checks

- **Keep-alive function**: Runs every 5 minutes to prevent Supabase sleep
- **Heartbeat table**: Tracks system health and uptime
- **Audit logs**: Comprehensive activity logging

### Performance

- **Database indexing**: Optimized for common queries
- **Caching**: PWA caching for offline performance
- **Background sync**: Non-blocking offline operations

## 🔒 Security

### Authentication

- Phone OTP verification
- Membership ID validation
- Session management via Supabase Auth

### Authorization

- Role-based access control (RBAC)
- Row Level Security (RLS) policies
- API endpoint protection

### Data Protection

- Audit logging for all changes
- Encrypted data transmission
- Secure file storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software for The Church of Pentecost — Emmanuel Assembly.

## 🆘 Support

For technical support or questions:

- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Core authentication and user management
- ✅ Attendance tracking with QR codes
- ✅ PWA offline capabilities
- ✅ Basic reporting and exports

### Phase 2 (Planned)

- 📱 Mobile app (React Native)
- 🔔 Push notifications
- 📊 Advanced analytics dashboard
- 🤖 Automated reporting

### Phase 3 (Future)

- 🌐 Multi-church support
- 🔗 Third-party integrations
- 📈 Advanced analytics and ML
- 🎯 Member engagement tools

---

**Built with ❤️ for Emmanuel Assembly**
