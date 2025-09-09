const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

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
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

const requireBasicAuth = (req, res, next) => {
    if (req.session.basicAuthPassed) {
        return next();
    }
    res.redirect('/login');
};

const requireFullAuth = (req, res, next) => {
    if (req.session.basicAuthPassed && req.isAuthenticated()) {
        return next();
    }
    if (!req.session.basicAuthPassed) {
        return res.redirect('/login');
    }
    res.redirect('/auth/google');
};

app.get('/', (req, res) => {
    if (req.session.basicAuthPassed && req.isAuthenticated()) {
        return res.redirect('/success');
    }
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    if (req.session.basicAuthPassed) {
        return res.redirect('/auth/google');
    }
    res.render('login', { error: req.query.error });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.basicAuthPassed = true;
        res.redirect('/auth/google');
    } else {
        res.redirect('/login?error=Invalid credentials');
    }
});

app.get('/auth/google',
    requireBasicAuth,
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    requireBasicAuth,
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/success');
    }
);

app.get('/success', requireFullAuth, (req, res) => {
    res.render('success', { user: req.user });
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
    console.log(`Visit http://localhost:${PORT} to test locally`);
});