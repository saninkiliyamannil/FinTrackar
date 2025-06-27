# 🆓 Completely FREE Deployment Guide

This guide shows you how to deploy your Personal Finance Tracker API **completely free** using various free hosting platforms.

## 🏠 Local Development (Always Free)

### Quick Start
1. **Install Python 3.8+** (free from python.org)
2. **Install dependencies:**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`
3. **Run the server:**
   \`\`\`bash
   python run_server.py
   \`\`\`
4. **Access your API:**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

## ☁️ Free Cloud Hosting Options

### 1. Railway (Recommended - Easiest)
**Free Tier:** 500 hours/month, 1GB RAM, 1GB storage

**Steps:**
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway auto-detects Python and deploys
4. Your API will be live at `https://your-app.railway.app`

**Pros:** Zero configuration, automatic deployments
**Cons:** Limited to 500 hours/month

### 2. Render
**Free Tier:** 750 hours/month, 512MB RAM

**Steps:**
1. Create account at [render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `python main.py`

**Pros:** More hours than Railway
**Cons:** Slower cold starts

### 3. Fly.io
**Free Tier:** 3 shared-cpu-1x VMs, 3GB storage

**Steps:**
1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Create account: `flyctl auth signup`
3. Create app: `flyctl launch`
4. Deploy: `flyctl deploy`

**Pros:** Good performance, multiple regions
**Cons:** Requires CLI setup

### 4. Heroku (Limited Free)
**Note:** Heroku ended free tier but offers student credits

**Steps:**
1. Create `Procfile`: `web: python main.py`
2. Create `runtime.txt`: `python-3.11.0`
3. Deploy via Git or GitHub integration

### 5. PythonAnywhere (Free Tier)
**Free Tier:** 1 web app, 512MB storage

**Steps:**
1. Create account at [pythonanywhere.com](https://www.pythonanywhere.com)
2. Upload your files
3. Create web app with manual configuration
4. Set WSGI file to point to your FastAPI app

## 📱 Frontend Deployment (Also Free)

### Vercel (Recommended for Next.js)
1. Connect your GitHub repo to [vercel.com](https://vercel.com)
2. Update API base URL to your deployed backend
3. Deploy automatically on every push

### Netlify
1. Connect repo to [netlify.com](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `out` or `dist`

## 🔧 Configuration for Free Hosting

### Environment Variables
Most free platforms support environment variables:

\`\`\`bash
# For production
SECRET_KEY=your-super-secret-production-key
DATABASE_URL=sqlite:///./finance_tracker.db
CORS_ORIGINS=https://your-frontend-domain.com
\`\`\`

### Database Persistence
**Important:** SQLite file will persist on most platforms, but some may reset on deployment.

**Solutions:**
1. **Railway/Render:** Files persist between deployments
2. **Fly.io:** Use volumes for persistence
3. **Backup strategy:** Export data periodically

## 🚀 Deployment Checklist

- [ ] Change `SECRET_KEY` in production
- [ ] Update CORS origins to your frontend domain
- [ ] Test all API endpoints work
- [ ] Verify database persists between restarts
- [ ] Set up automatic backups (optional)
- [ ] Monitor usage to stay within free limits

## 💡 Tips for Free Hosting

1. **Keep apps active:** Some free tiers sleep after inactivity
2. **Monitor usage:** Stay within free tier limits
3. **Use CDN:** For static files (many free options)
4. **Optimize code:** Faster startup = better free tier experience
5. **Database backups:** Export your SQLite file regularly

## 🔄 Switching Between Platforms

Your app is designed to work on any platform. Simply:
1. Push code to new platform
2. Update frontend API URL
3. Test functionality

## 📊 Cost Comparison

| Platform | Monthly Cost | RAM | Storage | Hours |
|----------|-------------|-----|---------|-------|
| Local | $0 | Unlimited | Unlimited | Unlimited |
| Railway | $0 | 1GB | 1GB | 500h |
| Render | $0 | 512MB | - | 750h |
| Fly.io | $0 | 256MB | 3GB | Unlimited |
| PythonAnywhere | $0 | 512MB | 512MB | Always on |

## 🆘 Troubleshooting

**App won't start:**
- Check Python version (3.8+ required)
- Verify all dependencies installed
- Check logs for specific errors

**Database issues:**
- Ensure SQLite file has write permissions
- Check if platform supports file persistence

**CORS errors:**
- Update CORS_ORIGINS in your code
- Ensure frontend URL is whitelisted

## 🎯 Next Steps

1. Choose a free hosting platform
2. Deploy your backend
3. Update frontend API configuration
4. Test all functionality
5. Share your free finance tracker!

Remember: This entire setup costs **$0** and can handle personal use and small teams perfectly!
