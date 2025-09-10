const express = require('express');
const session = require('express-session');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();
const supabase = require('./lib/supabase');

const app = express();
app.set('trust proxy', true);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Fixed TOTP secret - this should be stored per user in production
const TOTP_SECRET = 'OQ7DUNSKLNWEULCGOZ3TK5RMJZYCYVKHMMTFQTTXFFPHO3Z6EUYQ';

// Middleware to check basic auth
const requireBasicAuth = (req, res, next) => {
    if (req.session.basicAuthPassed) {
        return next();
    }
    res.redirect('/login');
};

// Middleware to check full auth (basic + 2FA)
const requireFullAuth = (req, res, next) => {
    if (req.session.basicAuthPassed && req.session.twoFactorPassed) {
        return next();
    }
    if (!req.session.basicAuthPassed) {
        return res.redirect('/login');
    }
    res.redirect('/2fa');
};

// Routes
app.get('/', (req, res) => {
    if (req.session.basicAuthPassed && req.session.twoFactorPassed) {
        return res.redirect('/success');
    }
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.session.basicAuthPassed) {
        return res.redirect('/2fa');
    }
    res.render('login', { error: req.query.error, message: req.query.message });
});

// Signup routes
app.get('/signup', (req, res) => {
    if (req.session.basicAuthPassed && req.session.twoFactorPassed) {
        return res.redirect('/success');
    }
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword, agreeTerms, newsletter } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
        return res.render('signup', { error: 'All fields are required' });
    }
    
    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match' });
    }
    
    if (password.length < 8) {
        return res.render('signup', { error: 'Password must be at least 8 characters long' });
    }
    
    if (!agreeTerms) {
        return res.render('signup', { error: 'You must agree to the terms and conditions' });
    }
    
    try {
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existingUser) {
            return res.render('signup', { error: 'Email already registered' });
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Generate unique TOTP secret for this user
        const secret = speakeasy.generateSecret({
            name: `DipBot (${email})`,
            issuer: 'DipBot Auth'
        });
        
        // Insert new user
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                first_name: firstName,
                last_name: lastName,
                email: email,
                password_hash: passwordHash,
                totp_secret: secret.base32,
                newsletter_opt_in: newsletter === 'on'
            })
            .select()
            .single();
        
        if (insertError) {
            console.error('Supabase insert error:', insertError);
            return res.render('signup', { error: 'Failed to create account. Please try again.' });
        }
        
        // Store user info in session and redirect to 2FA setup
        req.session.tempUserId = newUser.id;
        req.session.tempUserEmail = newUser.email;
        req.session.tempTotpSecret = newUser.totp_secret;
        
        // Save session before redirect
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.render('signup', { error: 'Session error. Please try again.' });
            }
            console.log('New user created, redirecting to 2FA setup:', newUser.email);
            res.redirect('/setup-user-2fa');
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.render('signup', { error: 'An error occurred. Please try again.' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Check for admin credentials first
    if (username === 'admin' && password === 'admin') {
        req.session.basicAuthPassed = true;
        req.session.userEmail = 'admin@dipbot.com';
        req.session.userName = 'Admin';
        req.session.totpSecret = TOTP_SECRET;
        req.session.save((err) => {
            if (err) {
                return res.redirect('/login?error=Session error');
            }
            res.redirect('/2fa');
        });
        return;
    }
    
    // Check database for user (username is email)
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', username)
            .single();
        
        if (error || !user) {
            return res.redirect('/login?error=Invalid credentials');
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.redirect('/login?error=Invalid credentials');
        }
        
        // Store user info in session
        req.session.basicAuthPassed = true;
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = `${user.first_name} ${user.last_name}`;
        req.session.totpSecret = user.totp_secret;
        
        req.session.save((err) => {
            if (err) {
                return res.redirect('/login?error=Session error');
            }
            res.redirect('/2fa');
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=Invalid credentials');
    }
});

app.get('/2fa', requireBasicAuth, (req, res) => {
    if (req.session.twoFactorPassed) {
        return res.redirect('/success');
    }
    res.render('2fa', { error: req.query.error });
});

app.post('/2fa', requireBasicAuth, (req, res) => {
    const { token } = req.body;
    
    // Use user-specific secret or admin secret
    const userSecret = req.session.totpSecret || TOTP_SECRET;
    
    // Verify the 6-digit token
    const verified = speakeasy.totp.verify({
        secret: userSecret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps for clock skew
    });
    
    if (verified) {
        req.session.twoFactorPassed = true;
        req.session.save((err) => {
            if (err) {
                return res.redirect('/2fa?error=Session error');
            }
            res.redirect('/success');
        });
    } else {
        res.redirect('/2fa?error=Invalid authentication code');
    }
});

// Setup page for new users to configure 2FA
app.get('/setup-user-2fa', async (req, res) => {
    if (!req.session.tempUserId || !req.session.tempTotpSecret) {
        return res.redirect('/signup');
    }
    
    try {
        const otpauthUrl = speakeasy.otpauthURL({
            secret: req.session.tempTotpSecret,
            label: req.session.tempUserEmail,
            issuer: 'DipBot Auth',
            encoding: 'base32'
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        
        res.render('setup-user-2fa', { 
            qrCode: qrCodeUrl,
            secret: req.session.tempTotpSecret,
            email: req.session.tempUserEmail,
            message: 'Scan this QR code with Google Authenticator to complete your registration',
            error: false
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.status(500).send('Error generating QR code');
    }
});

// Verify 2FA setup for new users
app.post('/verify-user-2fa', async (req, res) => {
    const { token } = req.body;
    
    if (!req.session.tempUserId || !req.session.tempTotpSecret) {
        return res.redirect('/signup');
    }
    
    // Verify the token
    const verified = speakeasy.totp.verify({
        secret: req.session.tempTotpSecret,
        encoding: 'base32',
        token: token,
        window: 2
    });
    
    if (verified) {
        // Mark 2FA setup as completed in database
        const { error: updateError } = await supabase
            .from('users')
            .update({ totp_setup_completed: true })
            .eq('id', req.session.tempUserId);
        
        if (updateError) {
            console.error('Error updating totp_setup_completed:', updateError);
        }
        
        // Clear temp session data
        delete req.session.tempUserId;
        delete req.session.tempUserEmail;
        delete req.session.tempTotpSecret;
        
        // Redirect to login with success message
        res.redirect('/login?message=Account created successfully. Please login.');
    } else {
        res.render('setup-user-2fa', {
            qrCode: await QRCode.toDataURL(speakeasy.otpauthURL({
                secret: req.session.tempTotpSecret,
                label: req.session.tempUserEmail,
                issuer: 'DipBot Auth',
                encoding: 'base32'
            })),
            secret: req.session.tempTotpSecret,
            email: req.session.tempUserEmail,
            message: 'Invalid code. Please try again.',
            error: true
        });
    }
});

// Recovery route for users who need to set up 2FA
app.get('/recover-2fa', (req, res) => {
    res.render('recover-2fa', { error: null });
});

app.post('/recover-2fa', async (req, res) => {
    const { email, password } = req.body;
    
    try {
        // Find user in database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error || !user) {
            return res.render('recover-2fa', { error: 'Invalid email or password' });
        }
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!passwordMatch) {
            return res.render('recover-2fa', { error: 'Invalid email or password' });
        }
        
        // Generate QR code for their existing secret
        const otpauthUrl = speakeasy.otpauthURL({
            secret: user.totp_secret,
            label: user.email,
            issuer: 'DipBot Auth',
            encoding: 'base32'
        });
        
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        
        // Store in session for verification
        req.session.recoveryUserId = user.id;
        req.session.recoveryEmail = user.email;
        req.session.recoverySecret = user.totp_secret;
        
        req.session.save((err) => {
            if (err) {
                return res.render('recover-2fa', { error: 'Session error. Please try again.' });
            }
            
            res.render('setup-user-2fa', {
                qrCode: qrCodeUrl,
                secret: user.totp_secret,
                email: user.email,
                message: 'Set up Google Authenticator with this QR code',
                error: false,
                recovery: true
            });
        });
        
    } catch (error) {
        console.error('Recovery error:', error);
        res.render('recover-2fa', { error: 'An error occurred. Please try again.' });
    }
});

// Setup page to show QR code for Google Authenticator (admin)
app.get('/setup-2fa', async (req, res) => {
    try {
        const otpauthUrl = speakeasy.otpauthURL({
            secret: TOTP_SECRET,
            label: 'admin@dip.stingfu.com',
            issuer: 'DipBot Auth',
            encoding: 'base32'
        });
        
        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
        
        res.render('setup-2fa', { 
            qrCode: qrCodeUrl,
            secret: TOTP_SECRET,
            message: 'Scan this QR code with Google Authenticator app'
        });
    } catch (error) {
        console.error('Setup 2FA error:', error);
        res.status(500).send('Error generating QR code');
    }
});

app.get('/success', requireFullAuth, (req, res) => {
    res.render('dashboard', { 
        user: { 
            displayName: req.session.userName || 'Admin', 
            emails: [{ value: req.session.userEmail || 'admin@dipbot.com' }] 
        } 
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/');
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`\n=== GOOGLE AUTHENTICATOR 2FA ENABLED ===`);
    console.log(`1. Visit https://dip.stingfu.com/setup-2fa to get QR code`);
    console.log(`2. Scan with Google Authenticator app`);
    console.log(`3. Login: admin/admin + 6-digit code from app`);
    console.log(`Secret: ${TOTP_SECRET}`);
    console.log(`=========================================\n`);
});