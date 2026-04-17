# The Fallen DayZ
Gaming website with Discord OAuth authentication.

---

## Discord OAuth Setup

### Prerequisites
- **Node.js** installed
- **Discord Application** at https://discord.com/developers/applications

### Step 1: Discord Developer Portal
1. Create new Application → "OAuth2" → Add redirect: `http://localhost:3000/auth/discord/callback`
2. "Bot" → Get Bot Token → Enable **Server Members Intent**
3. Copy **Client ID**, **Client Secret**, **Bot Token**
4. Enable Developer Mode in Discord → right-click server → Copy ID = **Guild ID**

### Step 2: Configure `.env`
```env
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_GUILD_ID=your-server-id
SESSION_SECRET=random-secret-string
REDIRECT_URI=http://localhost:3000/auth/discord/callback
PORT=3000
```

### Step 3: Run
```bash
npm install
npm start
```
Open **http://localhost:3000**

---

## Original Template Info
This is gaming website template and fully responsive ( HTML , CSS And JavaScript)

#### Demo Live Now : [GO](https://sm8uti.github.io/gamewebsite/)

## Pc Version

<br/>
<img src="game.png">

##Mobile Version

<img src="game-mobile.png">
