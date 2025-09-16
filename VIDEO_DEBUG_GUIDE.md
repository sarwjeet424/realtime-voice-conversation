# Video Bot Debug Guide

## Issues Fixed

### 1. Compilation Error
- **Problem**: Duplicate function declaration and recursive call in `setConversationType`
- **Fix**: Removed recursive call and added proper state management

### 2. UI Visibility
- **Problem**: Conversation type selector was hidden when conversation was active
- **Fix**: Made selector always visible with current mode indicator

### 3. Debugging
- **Added**: Comprehensive logging for video mode activation
- **Added**: Test button for manual video testing
- **Added**: Backend test endpoints

## How to Test Video Bot

### Step 1: Start the Application
```bash
# Backend
cd backend
npm run start:dev

# Frontend
cd frontend
npm start
```

### Step 2: Check Environment Variables
Make sure you have `DID_API_KEY` in `backend/.env`:
```bash
DID_API_KEY=your_actual_did_api_key_here
```

### Step 3: Test D-ID Connection
```bash
# Test D-ID API
curl http://localhost:4000/test/did-connection

# Test video creation
curl -X POST http://localhost:4000/test/did-video \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello test video"}'
```

### Step 4: Test in Browser
1. Open http://localhost:3000
2. You should see "Choose Conversation Type" with two buttons
3. Click "Video Bot" button
4. Click "Start Conversation" 
5. Speak or click "Test Video Mode" button
6. Watch the debug logs for video processing

## Debug Logs to Watch

### Frontend Console
Look for these logs:
- `🎯 Setting conversation type to: video`
- `🔍 Current conversation active: true`
- `🔍 Current conversation type: video`
- `🎬 Video processing: creating`
- `🎥 Video ready: [url]`

### Backend Console
Look for these logs:
- `🎯 Received set_conversation_type request: video`
- `✅ Conversation type changed from audio to video`
- `🎬 Video mode activated for session_xxx`
- `🎬 Calling D-ID service...`
- `✅ Video created successfully: [url]`

## Common Issues & Solutions

### Issue 1: "DID_API_KEY not found"
**Solution**: Set the environment variable in `backend/.env`

### Issue 2: Video not appearing
**Check**: 
- Backend logs for D-ID API errors
- Frontend console for video element errors
- Network tab for failed requests

### Issue 3: Still getting audio responses
**Check**:
- Backend logs show "Video mode activated"
- Frontend logs show conversation type is "video"
- D-ID service is working (test endpoints)

### Issue 4: Video processing stuck
**Check**:
- D-ID API key is valid
- Account has credits
- Network connection is stable

## Test Commands

```bash
# Test D-ID connection
curl http://localhost:4000/test/did-connection

# Test video creation
curl -X POST http://localhost:4000/test/did-video \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}'

# Check session info
curl http://localhost:4000/test/session-info
```

## Expected Flow

1. **Select Video Bot** → Frontend logs: "Setting conversation type to: video"
2. **Start Conversation** → Backend logs: "Video mode activated"
3. **Send Message** → Backend logs: "Creating video for: [text]"
4. **Video Processing** → Frontend shows "Creating video..." indicator
5. **Video Ready** → Video appears and plays automatically

## Debug Features Added

- **Always Visible Selector**: Can change mode even during conversation
- **Current Mode Indicator**: Shows which mode is active
- **Test Video Button**: Manually test video mode
- **Enhanced Logging**: Detailed logs for every step
- **Test Endpoints**: Backend endpoints for testing D-ID integration
- **Error Handling**: Better error messages and fallbacks

## If Still Not Working

1. Check the test script: `node test-did.js`
2. Check backend logs for D-ID errors
3. Check frontend console for JavaScript errors
4. Verify D-ID account has credits
5. Test with the manual test button

