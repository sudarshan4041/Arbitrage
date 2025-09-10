# Supabase Setup Instructions

## Setting up Supabase for User Registration

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New project"
4. Choose your organization
5. Enter project details:
   - Project name: DipBot-Auth (or your preferred name)
   - Database password: Choose a strong password
   - Region: Select nearest to your location
6. Click "Create new project"

### 2. Get Your Project Credentials
After project creation:
1. Go to Settings → API
2. Copy these values:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Create the Users Table
1. Go to SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy and paste this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  totp_secret VARCHAR(100),
  newsletter_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create an index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" to execute the SQL

### 4. Update Your .env File
Update the `.env` file with your Supabase credentials:

```env
# Supabase configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

Replace:
- `your-project-id` with your actual project URL
- `your-anon-key-here` with your actual anon key

### 5. Test the Setup
1. Restart your server: `npm start` or `node server-2fa-fixed.js`
2. Visit `http://localhost:3000/signup`
3. Create a new account
4. You should be redirected to setup 2FA with Google Authenticator
5. After setting up 2FA, you can login with your email and password

## Features Implemented

### User Registration Flow
1. User fills signup form with:
   - First Name
   - Last Name
   - Email (used as username for login)
   - Password (minimum 8 characters)
   - Terms acceptance (required)
   - Newsletter opt-in (optional)

2. Upon successful registration:
   - Password is hashed using bcrypt
   - Unique TOTP secret is generated for the user
   - User data is saved to Supabase
   - User is redirected to 2FA setup page

3. 2FA Setup:
   - QR code is displayed for Google Authenticator
   - Manual entry key is provided as backup
   - User must verify with 6-digit code to complete setup

### Login Flow
1. User enters email (as username) and password
2. System checks:
   - Admin credentials (admin/admin) - uses fixed TOTP secret
   - Or database credentials - uses user-specific TOTP secret
3. After successful login, user enters 6-digit 2FA code
4. Access granted to dashboard

### Security Features
- Passwords are hashed with bcrypt (10 rounds)
- Each user has unique TOTP secret
- Session-based authentication
- HTTPS ready (when deployed)
- SQL injection prevention through parameterized queries

## Troubleshooting

### Common Issues

1. **"Invalid supabaseUrl" error**
   - Make sure SUPABASE_URL starts with `https://`
   - Verify the URL is correct in your .env file

2. **"Failed to create account" error**
   - Check if the users table was created successfully
   - Verify your Supabase anon key is correct
   - Check Supabase dashboard for any errors

3. **Cannot connect to Supabase**
   - Ensure your project is active (not paused)
   - Check your internet connection
   - Verify credentials are correct

## Next Steps

After setting up Supabase:
1. Test user registration flow
2. Test login with registered users
3. Deploy to production server
4. Update production .env with real credentials
5. Enable Row Level Security (RLS) in Supabase for production