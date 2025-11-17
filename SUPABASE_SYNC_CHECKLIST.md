# ✅ Pre-Testing Checklist: Supabase Sync Required

## 🔴 **REQUIRED: Database Migration**

### **1. Password Reset Trigger Fix** ⚠️ **CRITICAL**
**File:** `supabase/migrations/20251106000000_fix_password_reset_trigger.sql`

**Why:** This fixes the 500 error when resetting passwords. Without this, password reset will fail.

**How to Apply:**
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open the file: `supabase/migrations/20251106000000_fix_password_reset_trigger.sql`
3. **Copy ALL the SQL code** from that file
4. **Paste it** into the SQL Editor in Supabase
5. Click **"Run"** or press `Ctrl+Enter`

**What it does:**
- Fixes the trigger function that was causing password reset to fail
- Updates the function to use the correct column name (`password_changed_at` instead of `last_password_change`)

---

## ⚙️ **REQUIRED: Supabase Configuration**

### **2. Password Reset Redirect URLs** ⚠️ **CRITICAL**
**Location:** Supabase Dashboard → Settings → Authentication → URL Configuration

**Add these Redirect URLs:**
```
http://localhost:5173/reset-password
https://your-site.netlify.app/reset-password
```

**Set Site URL:**
```
https://your-site.netlify.app
```

**Why:** Without this, password reset email links won't redirect correctly.

---

### **3. Email Verification Settings** (Optional but Recommended)
**Location:** Supabase Dashboard → Settings → Authentication → Email Templates

**Check:**
- ✅ **"Enable email confirmations"** - Should be ON if you want email verification
- ✅ **"Enable email change confirmations"** - Recommended ON

**Note:** If email verification is OFF, users will be logged in immediately after signup. If it's ON, they'll need to verify their email first.

---

## ✅ **NO DATABASE CHANGES NEEDED FOR:**

### **Change Password Feature**
- ✅ Uses Supabase's built-in `updateUser()` API
- ✅ No migrations required
- ✅ Works immediately after code deployment

### **Email Verification Feature**
- ✅ Uses Supabase's built-in email verification
- ✅ No migrations required
- ✅ Works immediately after code deployment

---

## 📋 **Quick Sync Checklist**

Before testing, make sure you've done:

- [ ] **Applied migration:** `20251106000000_fix_password_reset_trigger.sql` in Supabase SQL Editor
- [ ] **Configured redirect URLs** in Supabase Dashboard (for password reset)
- [ ] **Checked email verification settings** in Supabase Dashboard (optional)
- [ ] **Deployed code** to Netlify (or running locally)

---

## 🧪 **After Syncing, Test:**

1. **Password Reset:**
   - Click "Mot de passe oublié ?"
   - Enter email
   - Check email and click reset link
   - Should work without 500 error ✅

2. **Change Password:**
   - Go to Settings
   - Use "Changer le mot de passe" section
   - Should work immediately ✅

3. **Email Verification:**
   - Sign up with new account
   - Check if verification banner appears
   - Click "Renvoyer" to resend email
   - Should work immediately ✅

---

## ⚠️ **If You Skip the Migration:**

- ❌ Password reset will fail with 500 error
- ✅ Change password will work
- ✅ Email verification will work

**So the migration is CRITICAL for password reset to work!**

