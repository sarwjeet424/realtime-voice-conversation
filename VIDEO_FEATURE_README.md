# Video Bot Feature Implementation

## Overview
This implementation adds video conversation capability to the realtime voice conversation app using D-ID's video generation API. Users can now choose between audio-only or video bot conversations.

## Features Added

### Backend Changes
1. **D-ID Service** (`backend/src/voice-rtc/services/did.service.ts`)
   - Complete D-ID API integration
   - Video creation with custom presenter
   - Video status polling and completion waiting
   - Error handling and fallback to audio

2. **Updated Gateway** (`backend/src/voice-rtc/gateways/voice-rtc.gateway.ts`)
   - New `set_conversation_type` message handler
   - Enhanced `text_message` handler with video mode support
   - Session management for conversation types
   - Automatic fallback to audio if video generation fails

3. **Module Updates**
   - Added D-ID service to VoiceRtcModule
   - Updated package.json with axios dependency

### Frontend Changes
1. **Conversation Type Selection**
   - UI for choosing between audio and video modes
   - Real-time type switching
   - Visual feedback for selected mode

2. **Video Player Integration**
   - Video element for displaying D-ID generated videos
   - Processing indicators during video generation
   - Automatic video playback and cleanup

3. **Enhanced UI**
   - New conversation type selector component
   - Video processing overlays and indicators
   - Responsive design for all screen sizes

## Environment Variables Required

Add these to your `.env` file:

```bash
# D-ID Configuration
DID_API_KEY=your_did_api_key_here

# Existing variables
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## D-ID Presenter Configuration

The implementation uses the provided presenter ID:
```
presenter_id: 'v2_public_Alyssa_NoHands_BlackShirt_Home@Mvn6Nalx90'
```

## How to Test

### 1. Install Dependencies
```bash
cd backend
npm install axios

cd ../frontend
npm install
```

### 2. Set Environment Variables
Create a `.env` file in the backend directory with your D-ID API key:
```bash
DID_API_KEY=your_actual_did_api_key
```

### 3. Start the Application
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 4. Test Video Mode
1. Open the application in your browser
2. Choose "Video Bot" option before starting conversation
3. Click "Start Conversation"
4. Speak to the bot - it will generate video responses using D-ID
5. The video will play automatically when ready

## API Flow

### Audio Mode (Existing)
1. User speaks → Speech-to-Text → OpenAI → ElevenLabs TTS → Audio playback

### Video Mode (New)
1. User speaks → Speech-to-Text → OpenAI → D-ID Video Generation → Video playback
2. If video generation fails → Fallback to ElevenLabs TTS

## Error Handling

- **Video Generation Failures**: Automatically falls back to audio mode
- **API Errors**: Proper error logging and user feedback
- **Network Issues**: Graceful degradation and retry mechanisms

## Performance Considerations

- Video generation takes 10-30 seconds depending on text length
- Processing indicators keep users informed
- Automatic cleanup of video elements
- Efficient session management

## Customization

### Changing Presenter
Update the `presenterId` parameter in `did.service.ts`:
```typescript
const presenterId = 'your_new_presenter_id';
```

### Voice Selection
Modify the voice provider in the D-ID service:
```typescript
provider: {
  type: 'microsoft',
  voice_id: 'en-US-AriaNeural', // Change this
}
```

## Troubleshooting

### Common Issues
1. **Video not playing**: Check CORS settings and video URL validity
2. **API errors**: Verify D-ID API key and account credits
3. **Slow generation**: Normal for D-ID, consider shorter responses
4. **Fallback to audio**: Check D-ID service logs for specific errors

### Debug Mode
Enable debug logs in the browser console to see detailed flow information.

## Future Enhancements

- Multiple presenter options
- Custom voice selection
- Video caching
- Real-time video streaming
- Multiple conversation types in one session

