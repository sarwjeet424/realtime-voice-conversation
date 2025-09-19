# Supabase Setup Guide for Voice Assistant

This guide will help you set up Supabase for persistent data storage in your voice assistant application.

## 🚀 Quick Setup

### 1. Supabase Project Details
- **Project URL**: `https://jbmgssngyldvqjflqepk.supabase.co`
- **Database URL**: `postgresql://postgres:P@ssw0rd12345@db.jbmgssngyldvqjflqepk.supabase.co:5432/postgres`

### 2. Get Your API Key
1. Go to [supabase.com](https://supabase.com)
2. Login to your project: `jbmgssngyldvqjflqepk`
3. Go to **Settings** → **API**
4. Copy your **anon public** key
5. Update the `SUPABASE_ANON_KEY` in `supabase.service.ts`

### 3. Set Up Database Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL script
4. This will create all necessary tables and functions

### 4. Install Dependencies
```bash
cd backend
npm install @supabase/supabase-js
```

### 5. Update Supabase Service
Update the `SUPABASE_ANON_KEY` in `backend/src/voice-rtc/services/supabase.service.ts`:

```typescript
const supabaseKey = "your_actual_anon_key_here";
```

## 📊 Database Schema

### Tables Created
1. **user_sessions** - Active user sessions
2. **blocked_users** - Users blocked due to daily limits
3. **monthly_usage** - Monthly usage tracking

### Key Features
- **Row Level Security** enabled
- **Automatic cleanup** functions
- **Indexes** for performance
- **Views** for easy monitoring

## 🔧 Configuration

### Monthly Limits
- **Session Duration**: 5 minutes
- **Message Limit**: 20 messages per session
- **Monthly Limit**: 1 session per month per email
- **Admin Exception**: `sarwjeetfreelancer@gmail.com` has unlimited access

### Admin Email
```typescript
// In auth.service.ts
private readonly ADMIN_EMAIL = "sarwjeetfreelancer@gmail.com";
```

## 📈 Monitoring

### Supabase Dashboard
- Go to **Table Editor** to view data
- Use **SQL Editor** for custom queries
- Check **Logs** for debugging

### API Endpoints
- `GET /monthly-usage` - All monthly usage
- `GET /check-user/:email` - Specific user status
- `GET /admin-status` - Admin configuration

## 🧪 Testing

### Run Tests
```bash
# Test Supabase system
node test-supabase-system.js

# Test with specific email
TEST_EMAIL=test@example.com node test-supabase-system.js
```

### Manual Testing
1. Start backend: `npm run start:dev`
2. Start frontend: `npm start`
3. Test with different emails
4. Check Supabase dashboard for data

## 🔒 Security Considerations

### Row Level Security
- Currently allows all operations
- Adjust policies based on your needs
- Consider adding authentication

### Data Privacy
- User emails are stored
- Session data is tracked
- Consider GDPR compliance

## 🚀 Production Deployment

### Environment Variables
Make sure to set these in your production environment:
- `SUPABASE_URL` (already set)
- `SUPABASE_ANON_KEY` (update with actual key)
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

### Database Backups
- Supabase handles automatic backups
- Consider additional backup strategies
- Test restore procedures

## 📊 Monitoring Queries

### Check Monthly Usage
```sql
SELECT * FROM current_month_usage;
```

### Check Active Sessions
```sql
SELECT * FROM active_sessions;
```

### Check Blocked Users
```sql
SELECT * FROM blocked_users_current;
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check SUPABASE_URL and SUPABASE_ANON_KEY
   - Verify project is active
   - Check network connectivity

2. **Permission Denied**
   - Check RLS policies
   - Verify API key permissions
   - Check table permissions

3. **Data Not Persisting**
   - Check if SupabaseService is being used
   - Verify database connection
   - Check for errors in logs

### Debug Mode
```typescript
// Add to supabase.service.ts constructor
this.logger.log(`Supabase URL: ${supabaseUrl}`);
this.logger.log(`Supabase Key: ${supabaseKey ? 'Set' : 'Not set'}`);
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [API Reference](https://supabase.com/docs/reference/javascript)

## 🎯 Next Steps

1. Get your Supabase anon key
2. Update the key in `supabase.service.ts`
3. Run the schema script in Supabase
4. Test the integration
5. Deploy to production

Your voice assistant will now have persistent monthly usage tracking with admin exceptions using Supabase!

