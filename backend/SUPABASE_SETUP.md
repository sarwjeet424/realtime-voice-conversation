# Supabase Setup Guide for Voice Assistant

This guide will help you set up Supabase for persistent data storage in your voice assistant application.

## 🚀 Quick Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Choose a region close to your users
4. Set a strong database password
5. Wait for the project to be ready (2-3 minutes)

### 2. Get Your Credentials

1. Go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. These will be your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 3. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL script
4. This will create all necessary tables and functions

### 4. Configure Environment Variables

Add these to your backend `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here

# Existing variables
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
PORT=4000
```

### 5. Install Supabase Client

```bash
cd backend
npm install @supabase/supabase-js
```

### 6. Update AuthService (Optional)

If you want to use Supabase for persistence, replace the in-memory storage in `auth.service.ts` with calls to `SupabaseService`.

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

## 🔧 Configuration Options

### Monthly Limits
```sql
-- In the schema, you can adjust:
-- 1 session per month for regular users
-- Unlimited for admin users
```

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
# Test monthly system
node test-monthly-system.js

# Test with specific email
TEST_EMAIL=test@example.com node test-monthly-system.js
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
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
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
// Add to auth.service.ts constructor
this.logger.log(`Supabase URL: ${supabaseUrl}`);
this.logger.log(`Supabase Key: ${supabaseKey ? 'Set' : 'Not set'}`);
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [API Reference](https://supabase.com/docs/reference/javascript)

## 🎯 Next Steps

1. Set up Supabase project
2. Run the schema script
3. Configure environment variables
4. Test the integration
5. Deploy to production

Your voice assistant will now have persistent monthly usage tracking with admin exceptions!

