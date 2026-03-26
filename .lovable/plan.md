

## Fix: Ambiguous relationship error in SettingsAccountsTab

### Problem
The query `profiles.select("... departments(name)")` fails with HTTP 300 because there are two foreign keys between `profiles` and `departments`:
1. `profiles.department_id → departments.id` (profiles_department_id_fkey)
2. `departments.manager_id → profiles.id` (fk_dept_manager)

PostgREST cannot determine which relationship to use.

### Fix
In `src/components/settings/SettingsAccountsTab.tsx` line 54, change:
```
departments(name)
```
to:
```
departments!profiles_department_id_fkey(name)
```

This explicitly tells PostgREST to use the `department_id` foreign key.

### File changed
| File | Change |
|------|--------|
| `src/components/settings/SettingsAccountsTab.tsx` | Line 54: disambiguate the departments join |

