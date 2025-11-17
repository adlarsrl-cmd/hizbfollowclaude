# 🔧 Enable Email Verification in Supabase

## ⚠️ **Current Status: Email Verification is DISABLED**

Your Supabase project has email verification **disabled**, which means:
- ✅ Users are logged in immediately after signup
- ❌ **No verification email is sent**
- ❌ Emails are **auto-confirmed** by Supabase
- ❌ Banner won't show (because emails are already "verified")

---

## ✅ **How to Enable Email Verification:**

### **Step 1: Go to Supabase Dashboard**
1. Open your Supabase project
2. Go to **Authentication** → **Configuration** → **Sign In / Providers**

### **Step 2: Enable Email Confirmations**
1. Scroll down to the **"User Signups"** section
2. Find **"Confirm email"** toggle
3. **Toggle it to ON** ✅
4. Click **"Save changes"** button (bottom right)

**Location:** Authentication → Configuration → Sign In / Providers → "User Signups" section → "Confirm email" toggle

### **Step 3: Configure Email Provider (if needed)**
- **Option A: Use Supabase's default email** (works for testing)
  - No configuration needed
  - Limited to ~3 emails/hour
  - Good for development/testing

- **Option B: Use custom SMTP** (recommended for production)
  - Go to **Settings** → **Auth** → **SMTP Settings**
  - Configure your email provider (Gmail, SendGrid, etc.)
  - Better deliverability and higher limits

---

## 🧪 **After Enabling:**

### **Test with a NEW account:**
1. **Sign out** from current account
2. **Sign up** with a **new email address**
3. **Check your email inbox** (and spam folder)
4. **Banner should appear** at the top
5. **Click verification link** in email
6. **Banner should disappear** after verification

---

## 📋 **What Changes:**

### **Before (Verification Disabled):**
- User signs up → ✅ Logged in immediately
- No email sent
- No banner
- Email auto-confirmed

### **After (Verification Enabled):**
- User signs up → ⏳ Needs to verify email
- ✅ Verification email sent
- ✅ Banner appears: "Votre email n'est pas vérifié"
- User clicks link → ✅ Email verified
- ✅ Banner disappears

---

## ⚙️ **Additional Settings to Check:**

### **Email Template Customization:**
- Go to **Email Templates** tab
- You can customize the verification email
- Default template works fine

### **Redirect URLs:**
- Make sure your site URL is configured:
  - **Site URL:** `https://your-site.netlify.app`
  - This is where users are redirected after clicking verification link

---

## 🎯 **Quick Checklist:**

- [ ] Go to Supabase Dashboard
- [ ] Settings → Authentication → Email Templates
- [ ] Enable "Enable email confirmations"
- [ ] Save changes
- [ ] Test with a new account
- [ ] Check email inbox
- [ ] Banner should appear ✅

---

**Once enabled, the email verification feature will work as expected!**

