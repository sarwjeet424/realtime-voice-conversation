# Voice Conversation App - Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Railway (Backend) + Vercel (Frontend) - RECOMMENDED

#### Backend Deployment (Railway)

1. **Sign up at [Railway.app](https://railway.app)**
2. **Connect your GitHub repository**
3. **Deploy the backend:**
   - Select the `backend` folder
   - Railway will auto-detect Node.js
   - Add environment variables:
     ```
     OPENAI_API_KEY=your_openai_key
     ELEVENLABS_API_KEY=your_elevenlabs_key
     PORT=4000
     ```
4. **Get your backend URL** (e.g., `https://your-app.railway.app`)

#### Frontend Deployment (Vercel)

1. **Sign up at [Vercel.com](https://vercel.com)**
2. **Connect your GitHub repository**
3. **Deploy the frontend:**
   - Select the `frontend` folder
   - Add environment variable:
     ```
     REACT_APP_BACKEND_URL=https://your-app.railway.app
     ```
4. **Get your frontend URL** (e.g., `https://your-app.vercel.app`)

### Option 2: Render (Both Backend & Frontend)

#### Backend on Render

1. **Sign up at [Render.com](https://render.com)**
2. **Create new Web Service:**
   - Connect GitHub repo
   - Select `backend` folder
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`
   - Add environment variables (same as above)

#### Frontend on Render

1. **Create new Static Site:**
   - Connect GitHub repo
   - Select `frontend` folder
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Add environment variable: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

### Option 3: Netlify (Frontend) + Railway (Backend)

#### Frontend on Netlify

1. **Sign up at [Netlify.com](https://netlify.com)**
2. **Deploy from GitHub:**
   - Select `frontend` folder
   - Build Command: `npm run build`
   - Publish Directory: `build`
   - Add environment variable: `REACT_APP_BACKEND_URL=https://your-backend.railway.app`

## 🔧 Required Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=sk-your-openai-key
ELEVENLABS_API_KEY=your-elevenlabs-key
PORT=4000
```

### Frontend (.env.local)
```
REACT_APP_BACKEND_URL=https://your-backend-url
```

## 📝 Pre-Deployment Checklist

- [ ] Get OpenAI API key from [OpenAI Platform](https://platform.openai.com)
- [ ] Get ElevenLabs API key from [ElevenLabs](https://elevenlabs.io)
- [ ] Push code to GitHub repository
- [ ] Test locally with `npm run start` (backend) and `npm start` (frontend)

## 🚨 Important Notes

1. **HTTPS Required**: Voice recognition requires HTTPS in production
2. **CORS**: Backend is configured to allow all origins
3. **Web Speech API**: Only works in Chrome, Edge, Safari (not Firefox)
4. **Free Tiers**: All platforms have usage limits

## 🔍 Troubleshooting

### Common Issues:
- **CORS errors**: Check backend URL in frontend
- **API key errors**: Verify environment variables
- **Voice not working**: Ensure HTTPS and supported browser
- **Socket connection failed**: Check backend URL and CORS settings

### Testing Locally:
```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend (new terminal)
cd frontend
npm install
npm start
```

## 📊 Performance Tips

1. **Use Railway for backend** (better for WebSocket connections)
2. **Use Vercel for frontend** (better CDN and performance)
3. **Enable gzip compression** (automatic on most platforms)
4. **Monitor usage** to stay within free tiers

## 🎯 Recommended Setup

**Best for production:**
- Backend: Railway
- Frontend: Vercel
- Domain: Custom domain (optional)

**Best for testing:**
- Backend: Railway
- Frontend: Netlify
- Quick setup, good free tier

