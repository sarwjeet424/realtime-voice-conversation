# Debug Video Bot Issue

## Problem
Video bot option is selected but still getting audio responses instead of video.

## Quick Fixes Applied

### 1. Frontend Fix
- **Issue**: Type selection wasn't automatically starting conversation
- **Fix**: Modified `setConversationTypeAndStart()` to automatically start conversation after setting type

### 2. Backend Logging
- **Issue**: Not enough debugging info
- **Fix**: Added comprehensive logging to track video mode activation

### 3. Video Element Handling
- **Issue**: Video element not properly attached to DOM
- **Fix**: Improved video element creation and DOM attachment

## Debugging Steps

### Step 1: Check Environment Variables
Make sure you have `DID_API_KEY` set in your `.env` file:
```bash
# backend/.env
DID_API_KEY=your_actual_did_api_key_here
```

### Step 2: Test D-ID Connection
Run the test script:
```bash
cd backend
node ../test-did.js
```

### Step 3: Check Backend Logs
Start the backend and watch for these logs:
```bash
cd backend
npm run start:dev
```

Look for:
- `✅ D-ID API key loaded: xxxxxx...`
- `🎯 Conversation type set to video for session_xxx`
- `🎬 Video mode activated for session_xxx`
- `🎬 Calling D-ID service...`

### Step 4: Check Frontend Console
Open browser dev tools and look for:
- `🎯 Setting conversation type to: video`
- `🎬 Video processing: creating`
- `🎥 Video ready: [url]`

### Step 5: Test API Endpoints
Test the D-ID service directly:
```bash
# Test connection
curl http://localhost:4000/test/did-connection

# Test video creation
curl -X POST http://localhost:4000/test/did-video \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello test"}'
```

## Common Issues & Solutions

### Issue 1: "DID_API_KEY not found"
**Solution**: Set the environment variable in `backend/.env`

### Issue 2: "Video creation failed"
**Solution**: Check D-ID API key validity and account credits

### Issue 3: Video not playing
**Solution**: Check browser console for CORS or video loading errors

### Issue 4: Still getting audio responses
**Solution**: Check that conversation type is properly set to 'video' in backend logs

## Expected Flow

1. User clicks "Video Bot" button
2. Frontend sends `set_conversation_type` with `type: 'video'`
3. Backend logs: `🎯 Conversation type set to video`
4. User speaks
5. Backend logs: `🎬 Video mode activated`
6. Backend calls D-ID API
7. Frontend shows "Creating video..." indicator
8. Video appears and plays automatically

## If Still Not Working

1. **Check the test script output** - it will tell you exactly what's wrong
2. **Check backend logs** - look for error messages
3. **Check browser console** - look for JavaScript errors
4. **Verify D-ID account** - make sure you have credits and valid API key

## Test Commands

```bash
# Test D-ID connection
node test-did.js

# Test backend endpoints
curl http://localhost:4000/test/did-connection
curl -X POST http://localhost:4000/test/did-video -H "Content-Type: application/json" -d '{"text":"test"}'

# Check environment
echo $DID_API_KEY
```

