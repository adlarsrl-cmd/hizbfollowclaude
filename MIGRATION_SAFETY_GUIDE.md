# Migration Safety Guide

## ⚠️ IMPORTANT: Production Database

**Your database is shared between dev and prod.**  
**Test thoroughly in dev before deploying to prod.**

---

## 📋 Migrations Created

I've created **3 safe migrations** for you to review:

### 1. `20251110000004_add_missing_foreign_key_indexes.sql`
- **What it does:** Adds 8 missing indexes on foreign keys
- **Risk:** ✅ **VERY LOW** - Only adds indexes, no data changes
- **Impact:** Improves query performance
- **Reversible:** Yes, can drop indexes if needed
- **Test:** Run queries that JOIN on these columns, should be faster

### 2. `20251110000005_remove_duplicate_indexes.sql`
- **What it does:** Removes 4 duplicate indexes (keeps originals)
- **Risk:** ✅ **LOW** - Only removes duplicates, originals remain
- **Impact:** Reduces storage, slightly faster writes
- **Reversible:** Yes, but shouldn't be necessary
- **Test:** Verify queries still work normally

### 3. `20251110000006_optimize_rls_policies_performance.sql`
- **What it does:** Optimizes RLS policies for better performance
- **Risk:** ✅ **LOW** - Same security, better performance
- **Impact:** Faster queries at scale
- **Reversible:** Yes, can revert policies if needed
- **Test:** Test login, group operations, profile updates

---

## 🧪 Testing Checklist

Before applying migrations, test:

### Test 1: Basic Functionality
- [ ] Login works
- [ ] Create/join groups works
- [ ] Add participants works
- [ ] Create entries works
- [ ] View dashboard works

### Test 2: After Migration 1 (Indexes)
- [ ] All queries still work
- [ ] No performance degradation
- [ ] Check query performance improved (optional)

### Test 3: After Migration 2 (Remove Duplicates)
- [ ] All queries still work
- [ ] No errors in console
- [ ] Storage reduced (check in Supabase dashboard)

### Test 4: After Migration 3 (RLS Optimization)
- [ ] Login works
- [ ] Group operations work
- [ ] Profile updates work
- [ ] Member permissions still enforced correctly

---

## 🚀 How to Apply

### Option 1: Apply All at Once (Recommended)
```bash
# Review migrations first
cat supabase/migrations/20251110000004_add_missing_foreign_key_indexes.sql
cat supabase/migrations/20251110000005_remove_duplicate_indexes.sql
cat supabase/migrations/20251110000006_optimize_rls_policies_performance.sql

# Apply via Supabase CLI (if you have it)
supabase db push

# OR apply manually in Supabase Dashboard → SQL Editor
# Copy and paste each migration one at a time
```

### Option 2: Apply One at a Time (Safer)
1. Apply migration 1
2. Test thoroughly
3. Apply migration 2
4. Test thoroughly
5. Apply migration 3
6. Test thoroughly

---

## 🔄 Rollback Plan

If something goes wrong:

### Rollback Migration 1 (Indexes)
```sql
-- Drop the indexes we added
DROP INDEX IF EXISTS idx_group_weekly_snapshots_created_by;
DROP INDEX IF EXISTS idx_groups_archived_by;
DROP INDEX IF EXISTS idx_groups_created_by;
DROP INDEX IF EXISTS idx_pending_user_creations_created_by;
DROP INDEX IF EXISTS idx_invitations_group_id;
DROP INDEX IF EXISTS idx_pending_user_creations_group_id;
DROP INDEX IF EXISTS idx_pending_user_creations_participant_id;
DROP INDEX IF EXISTS idx_user_links_participant_id;
```

### Rollback Migration 2 (Duplicates)
```sql
-- Recreate duplicate indexes (if needed)
CREATE INDEX idx_entries_group_id ON entries(group_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_participants_group_id ON participants(group_id);
```

### Rollback Migration 3 (RLS Policies)
```sql
-- Revert to original policies (check your backup or git history)
-- Or contact me for the original policy definitions
```

---

## ⚠️ What I Did NOT Create

I did **NOT** create migrations for:

1. **Security Definer View** (`vw_participant_latest`)
   - Need to review view usage first
   - May require code changes
   - **Action:** Review manually, decide if change needed

2. **Leaked Password Protection**
   - This is a Supabase Dashboard setting
   - **Action:** Enable in Dashboard → Authentication → Password Security

3. **Multiple Permissive Policies**
   - These are intentional for different use cases
   - **Action:** Keep as-is unless you see performance issues

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Check Supabase logs
3. Test each migration individually
4. Rollback if needed using the rollback scripts above

---

## ✅ Recommended Order

1. **First:** Apply migration 1 (indexes) - safest
2. **Second:** Apply migration 2 (remove duplicates) - safe
3. **Third:** Apply migration 3 (RLS optimization) - test carefully
4. **Finally:** Enable leaked password protection in Dashboard

---

**Remember:** Test in dev first, then deploy to prod when confident!

