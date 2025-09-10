# 2FA Setup Guide - Complete Documentation

## Overview
Each user gets their own unique Google Authenticator secret for enhanced security. The system now handles all edge cases and provides recovery options.

## Features Implemented

### 1. ✅ Unique 2FA Secrets per User
- Each user gets a unique TOTP secret generated during signup
- Secrets are stored encrypted in Supabase database
- Admin user has a fixed secret for convenience

### 2. ✅ Complete Setup Flow with Instructions
New users now see:
- Explanation of what 2FA is and why it's important
- Step-by-step instructions with app download links
- Warning to save backup codes
- Clear visual QR code
- Manual entry key for backup

### 3. ✅ Recovery Mechanism
**Route: `/recover-2fa`**
- For users who missed initial setup
- For users setting up new devices
- Requires email + password verification
- Shows their existing QR code

### 4. ✅ Better Session Handling
- Fixed session data persistence during redirects
- Added explicit session saves before redirects
- Added console logging for debugging

### 5. ✅ Setup Tracking (Database)
- Added `totp_setup_completed` field (run SQL script)
- Tracks if user has verified their 2FA
- Prevents users from getting stuck

## User Flows

### New User Registration
1. User visits `/signup`
2. Fills registration form
3. Redirected to `/setup-user-2fa` with instructions
4. Sees QR code and detailed setup guide
5. Scans with Google Authenticator
6. Enters 6-digit code to verify
7. Setup marked as complete
8. Redirected to login

### Existing User Who Missed Setup
1. User tries to login
2. Gets stuck at 2FA screen
3. Clicks "Haven't set up Google Authenticator yet?"
4. Goes to `/recover-2fa`
5. Enters email + password
6. Sees their QR code
7. Completes setup
8. Can now login normally

### Normal Login Flow
1. User enters email/password at `/login`
2. Redirected to `/2fa`
3. Enters 6-digit code from app
4. Access granted to dashboard

## Important SQL to Run in Supabase

```sql
-- Add tracking field (if not already added)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS totp_setup_completed BOOLEAN DEFAULT false;

-- Mark existing users as setup complete
UPDATE users 
SET totp_setup_completed = true 
WHERE totp_secret IS NOT NULL;
```

## Testing Instructions

### Test New User Flow:
1. Go to `http://localhost:3000/signup`
2. Create account with test email
3. You should see 2FA setup page with instructions
4. Use Google Authenticator to scan QR
5. Enter code and complete setup
6. Try logging in with new credentials

### Test Recovery Flow:
1. Go to `http://localhost:3000/recover-2fa`
2. Enter email and password of existing user
3. You should see their QR code
4. Scan and set up authenticator
5. Can now login with 2FA

## Troubleshooting

### User Can't See QR Code After Signup
- Check browser console for session errors
- Ensure cookies are enabled
- Try using incognito mode

### QR Code Not Working
- Ensure phone time is synced
- Try manual entry with the secret key
- Check that secret was saved to database

### Recovery Not Working
- Verify user exists in database
- Check password is correct
- Ensure session is working

## Security Notes

1. **Each user has unique secret** - No sharing of 2FA codes
2. **Secrets are generated server-side** - Using cryptographically secure random
3. **Recovery requires password** - Can't bypass authentication
4. **Session-based flow** - Temporary data cleared after setup
5. **HTTPS required in production** - Protects credentials in transit

## Links for Users

- **Login**: `/login`
- **Sign Up**: `/signup`  
- **Recover 2FA**: `/recover-2fa`
- **Admin QR Code**: `/setup-2fa` (for admin user only)

## Next Steps for Production

1. Run the SQL script to add `totp_setup_completed` field
2. Deploy updated code to server
3. Test with real users
4. Consider adding email notifications for 2FA changes
5. Add rate limiting to prevent brute force attacks