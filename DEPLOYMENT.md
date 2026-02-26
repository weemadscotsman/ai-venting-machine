# 🎭 AI Venting Machine - Deployment Guide

> *4 AI Agents. 1 Crisis. Infinite Arguments.*

## Quick Start

### 1. Get a Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy it for the next step

### 2. Local Development
```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and add your GEMINI_API_KEY

# Start development server
npm run dev
```

App will be available at `http://localhost:3000`

---

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)

#### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

#### Manual Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Environment Setup
1. In Vercel Dashboard → Project Settings → Environment Variables
2. Add `GEMINI_API_KEY` with your API key
3. Redeploy

---

### Option 2: Netlify

#### One-Click Deploy
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

#### Manual Deploy
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

#### Environment Setup
1. In Netlify Dashboard → Site Settings → Build & Deploy → Environment Variables
2. Add `GEMINI_API_KEY` with your API key
3. Trigger new deploy

---

### Option 3: Static Hosting (GitHub Pages, S3, etc.)

```bash
# Build production bundle
npm run build

# The `dist/` folder is your static site
# Upload contents of dist/ to your hosting provider
```

**Note:** For static hosting, you'll need to handle the API key differently:
- Option A: Use a serverless function (see `api/` folder)
- Option B: Users provide their own API key in the UI
- Option C: Use a proxy API you control

---

## 🔒 Security Considerations

### API Key Protection
- **NEVER** commit `.env.local` to git
- For production, use your hosting provider's environment variables
- Consider implementing rate limiting on your proxy

### Rate Limits
- Gemini API has rate limits based on your tier
- Default: 60 requests/minute for free tier
- The app fetches ~5-10 news items per session

---

## 📊 Monitoring

### Health Check Endpoint
When deployed, the app exposes these states via `localStorage`:
- `vm_agents` - Agent states and wins
- `vm_logs` - Session logs
- `vm_pressure` - Current entropy level

### Performance
- Bundle size: ~150KB gzipped
- First load: <2s on 4G
- API latency: 2-5s per crisis generation

---

## 🎮 Features for Spectators

### Shareable URLs
The app supports URL parameters for sharing specific experiences:
```
?crisis=CATEGORY&entropy=75&spectator=true
```

### Viewing Modes
1. **Interactive Mode** - Pull lever, add agents, full control
2. **Spectator Mode** - Auto-plays sessions, hides controls
3. **Archive Mode** - Browse past sessions from logs

---

## 🛠️ Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### API Errors
- Check that `GEMINI_API_KEY` is set correctly
- Verify your API key has access to Gemini 2.0 Flash
- Check browser console for CORS errors

### "No Chaos Candidates"
- The app needs internet access to fetch news
- Check that news API is not blocked by firewall
- Try refreshing the page

---

## 🌐 Custom Domain Setup

### Vercel
1. Dashboard → Domains
2. Add your domain
3. Update DNS records as instructed

### Netlify
1. Dashboard → Domain Settings
2. Add custom domain
3. Configure DNS with provided records

---

## 📱 Mobile Support

The app is fully responsive:
- Mobile: Stacked layout, touch-friendly lever
- Tablet: 2-column layout
- Desktop: Full 3-column dashboard

---

**Ready to watch AI agents argue? Deploy now!** 🍿
