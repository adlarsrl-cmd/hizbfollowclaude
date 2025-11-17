# 🔐 Account Deletion - Admin Guide

## 📋 Overview

When a user deletes their account:
1. **All personal data is deleted** (participants, entries, groups, settings, etc.)
2. **Account is marked as deleted** (`deleted_at` timestamp in `user_profiles`)
3. **User cannot log in** (login is blocked)
4. **Auth record remains** (`auth.users` table) - requires admin to permanently delete

---

## ✅ What Happens Automatically

### User Deletes Account:
- ✅ All data deleted from database tables
- ✅ `user_profiles.deleted_at` set to current timestamp
- ✅ User signed out immediately
- ✅ User **cannot log in again** (login blocked)

### User Tries to Log In After Deletion:
- ❌ Login fails with error: "Ce compte a été supprimé"
- ❌ Session is immediately terminated if somehow authenticated

---

## 🔧 Admin Actions Required

### Option 1: Manual Deletion via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **Users**

2. **Find the Deleted User**
   - Search by email
   - Look for users with no associated data

3. **Delete the Auth User**
   - Click on the user
   - Click **Delete User** (or use the trash icon)
   - Confirm deletion

**Note:** This permanently removes the `auth.users` record. The `user_profiles` record with `deleted_at` will remain for audit purposes but can be cleaned up later.

---

### Option 2: SQL Query (Bulk Cleanup)

If you want to permanently delete multiple deleted accounts:

```sql
-- Find all deleted accounts
SELECT 
  up.user_id,
  up.email,
  up.deleted_at,
  au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.user_id
WHERE up.deleted_at IS NOT NULL
ORDER BY up.deleted_at DESC;

-- Delete auth.users records for accounts deleted more than 30 days ago
-- ⚠️ WARNING: This permanently deletes auth records!
-- Run this in Supabase SQL Editor with admin privileges

DELETE FROM auth.users
WHERE id IN (
  SELECT user_id 
  FROM user_profiles 
  WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days'
);
```

---

### Option 3: Supabase Edge Function (Automated)

Create an Edge Function to automatically delete `auth.users` records after a grace period:

**File: `supabase/functions/cleanup-deleted-users/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Find accounts deleted more than 30 days ago
  const { data: deletedProfiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Delete auth.users records
  const userIds = deletedProfiles.map(p => p.user_id)
  let deletedCount = 0

  for (const userId of userIds) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (!deleteError) {
      deletedCount++
    }
  }

  return new Response(
    JSON.stringify({ 
      message: `Deleted ${deletedCount} auth users`,
      total: userIds.length 
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
})
```

**Schedule with Supabase Cron:**
```sql
-- Run cleanup function daily at 2 AM
SELECT cron.schedule(
  'cleanup-deleted-users',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/cleanup-deleted-users',
    headers:='{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## 📊 Monitoring Deleted Accounts

### Check How Many Accounts Are Deleted:

```sql
SELECT COUNT(*) as deleted_count
FROM user_profiles
WHERE deleted_at IS NOT NULL;
```

### List All Deleted Accounts:

```sql
SELECT 
  user_id,
  email,
  display_name,
  deleted_at,
  EXTRACT(EPOCH FROM (NOW() - deleted_at))/86400 as days_since_deletion
FROM user_profiles
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

---

## ⚠️ Important Notes

1. **GDPR Compliance:**
   - All personal data is deleted immediately
   - `deleted_at` timestamp is for audit/logging purposes only
   - Auth record deletion is optional but recommended after grace period

2. **Grace Period:**
   - Consider keeping `auth.users` records for 30-90 days
   - Allows account recovery if user contacts support
   - After grace period, permanently delete for full GDPR compliance

3. **Data Recovery:**
   - Once `auth.users` is deleted, account recovery is **impossible**
   - User would need to create a new account
   - Consider implementing a "restore account" feature if needed

4. **Backup:**
   - Before bulk deletion, ensure you have backups
   - Test deletion process on a test account first

---

## 🔄 Restore Deleted Account (If Needed)

If a user requests account restoration:

```sql
-- Restore account by removing deleted_at flag
UPDATE user_profiles
SET deleted_at = NULL
WHERE user_id = 'USER_ID_HERE';

-- User can now log in again
-- Note: All their data is still deleted, they'll need to recreate it
```

---

## ✅ Summary

**User Deletes Account:**
- ✅ All data deleted
- ✅ Login blocked
- ✅ Account marked as deleted

**Admin Actions:**
- Option 1: Manual deletion via Dashboard (easiest)
- Option 2: SQL query for bulk cleanup
- Option 3: Automated Edge Function with cron

**Timeline:**
- Immediate: Data deleted, login blocked
- 30-90 days: Admin can permanently delete `auth.users` (optional)
- After deletion: Account cannot be recovered

