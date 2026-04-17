const express = require('express');
const axios = require('axios');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Discord OAuth2 config
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3001/auth/discord/callback';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Login button - redirect to Discord OAuth
app.get('/auth/discord', (req, res) => {
    const scopes = 'identify';
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}`;
    console.log('Redirecting to Discord OAuth...');
    res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    
    if (error) {
        console.error('OAuth error:', error, req.query.error_description);
        return res.send(`<script>alert('Login failed: ${error}'); window.location.href='/';</script>`);
    }
    
    if (!code) return res.redirect('/');

    try {
        console.log('Exchanging code for token...');
        
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        console.log('Token obtained');

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        console.log('User fetched:', userResponse.data.username);

        const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        req.session.user = {
            id: userResponse.data.id,
            username: userResponse.data.username,
            discriminator: userResponse.data.discriminator,
            avatar: userResponse.data.avatar,
            guilds: guildsResponse.data
        };

        console.log('Session saved, redirecting to home...');
        res.redirect('/');
    } catch (error) {
        console.error('Auth error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        res.send(`<script>alert('Login failed: ${error.message}'); window.location.href='/';</script>`);
    }
});

// Logout
app.get('/auth/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// API: Get current user
app.get('/api/user', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// API: Get user roles
app.get('/api/user/roles', async (req, res) => {
    if (!req.session.user) {
        return res.json({ error: 'Not logged in' });
    }

    if (!BOT_TOKEN || !GUILD_ID) {
        return res.json({ roles: [], message: 'Bot not configured' });
    }

    try {
        // Get member from guild
        const memberResponse = await axios.get(
            `https://discord.com/api/guilds/${GUILD_ID}/members/${req.session.user.id}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        
        const roleIds = memberResponse.data.roles || [];
        
        // Get all guild roles to map IDs to names
        const guildResponse = await axios.get(
            `https://discord.com/api/guilds/${GUILD_ID}/roles`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );
        
        const roles = roleIds.map(roleId => {
            const role = guildResponse.data.find(r => r.id === roleId);
            return role ? { id: roleId, name: role.name, color: role.color } : { id: roleId, name: 'Unknown', color: 0 };
        });
        
        res.json({ 
            roles: roles,
            nickname: memberResponse.data.nickname,
            joinedAt: memberResponse.data.joined_at,
            rolesSince: memberResponse.data.roles
        });
    } catch (error) {
        console.error('Role fetch error:', error.message);
        res.json({ roles: [], error: 'Could not fetch roles' });
    }
});

// API: Get all spin winners (for profile)
app.get('/api/spin-winners', (req, res) => {
    try {
        const data = require('fs').readFileSync(path.join(__dirname, 'winners.json'), 'utf8');
        const winners = JSON.parse(data).winners || [];
        res.json(winners);
    } catch (e) {
        res.json([]);
    }
});

// API: Save spin winner
app.post('/api/spin-winners', (req, res) => {
    if (!req.session.user) {
        return res.json({ error: 'Not logged in' });
    }
    
    const { prize } = req.body;
    const winner = {
        id: req.session.user.id,
        username: req.session.user.username,
        discriminator: req.session.user.discriminator,
        avatar: req.session.user.avatar,
        prize: prize,
        time: new Date().toISOString()
    };
    
    try {
        const data = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'winners.json'), 'utf8') || '{"winners":[]}');
        data.winners.unshift(winner);
        if (data.winners.length > 50) data.winners = data.winners.slice(0, 50);
        require('fs').writeFileSync(path.join(__dirname, 'winners.json'), JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.json({ error: 'Could not save' });
    }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Redirect URI: ${REDIRECT_URI}`);
});