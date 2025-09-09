const express = require('express');
const session = require('express-session');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

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
    res.render('login', { error: req.query.error });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin') {
        req.session.basicAuthPassed = true;
        req.session.save((err) => {
            if (err) {
                return res.redirect('/login?error=Session error');
            }
            res.redirect('/2fa');
        });
    } else {
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
    
    // Verify the 6-digit token
    const verified = speakeasy.totp.verify({
        secret: TOTP_SECRET,
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

// Setup page to show QR code for Google Authenticator
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
    res.render('success', { user: { displayName: 'Admin', emails: [{ value: 'admin@dipbot.com' }] } });
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