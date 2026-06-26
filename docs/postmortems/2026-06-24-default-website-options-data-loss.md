# Postmortem: Loss of Default Website Options After 4.0.40 Upgrade

**Status:** Resolved
**Severity:** SEV1 — silent user data loss
**Author:** Engineering
**Date of incident:** 2026-06-24 (first user reports, following the 4.0.40 release)
**Date of writeup:** 2026-06-26

---

## TL;DR (for everyone)

When users updated PostyBirb to version **4.0.40**, the app ran a one-time database
upgrade step. A mistake in that step accidentally **deleted the saved "default"
posting options** (tags, description, rating, etc.) from every submission people
had created before updating. It also **logged everyone out** of their connected
websites.

The cause was a database upgrade that rebuilt an internal table while a safety
switch that was *supposed* to prevent collateral deletion was silently ignored.
When the old table was removed, the database automatically deleted related
records that pointed to it.

**What we did:**

- Fixed the faulty upgrade step so it no longer deletes anything (it now only
  *adds* what it needs).
- Added an automatic recovery step that rebuilds the missing default options the
  next time the app starts.
- Added **automatic database backups taken right before any future upgrade**, so
  data can always be recovered.
- Added **automated tests that will block any future upgrade that destroys
  data** before it can ship.

**What users need to know:** Connected accounts need to be **signed in again**
(their login data could not be recovered). The values previously typed into
default options can only be fully restored from a personal backup, but the app
will no longer be in a broken state.

### If you already upgraded to 4.0.40 (impacted)

- Update to the next release. On first launch it automatically rebuilds the
  missing default options.
- Sign back in to each connected website (login data could not be recovered).
- The exact values you had typed into default options can only be fully restored
  from a personal backup taken before the 4.0.40 upgrade. If you have one, restore
  it before launching the new version.

### If you have not upgraded yet (not impacted)

- Your data is intact. The bug only triggers during the 4.0.40 upgrade, which you
  have not run.
- Skip 4.0.40 and update directly to the next release. Its upgrade step is the
  fixed, non-destructive version.
- Optionally back up your database file first (`~\Documents\PostyBirb\data\database-production.sqlite`),
  though the new version also creates an automatic pre-upgrade backup.

---

## Impact

- **Who:** All users who upgraded to 4.0.40 with pre-existing submissions.
- **What was lost:**
  - All `website-options` rows — the per-submission posting options, including the
    shared **default (null-account)** option that nearly every submission has.
  - All `website-data` rows — stored website login/session data, effectively
    signing users out of every connected website.
  - The `user-specified-website-options` table — saved account default templates
    (this table was intentionally removed by the refactor, but with no data
    migration into the new model).
- **What was *not* affected:**
  - `post-event` history (its account reference is `ON DELETE SET NULL`, so those
    rows survived with the account link cleared).
  - Submissions, files, and other core records themselves.
- **Detection:** Via user reports shortly after release, not by automated
  monitoring.

---

## Timeline

| When | Event |
| --- | --- |
| 2026-06-23 | PR #919 (`54cc281`) merged — "use templates as backing for user defaults", including auto-generated migration `0008`. |
| ~2026-06-23 | Release **4.0.40** cut (`1d4b416`). |
| 2026-06-24 | First user reports: default website options "disappeared" on existing submissions. |
| 2026-06-25 | Issue reproduced internally; suspicion focused on `54cc281`. |
| 2026-06-26 | Root cause confirmed empirically; migration rewritten, recovery + safeguards added. |

---

## Root Cause

Migration `apps/postybirb/src/migrations/0008_windy_kinsey_walden.sql` added two
nullable foreign-key columns to the `account` table. Instead of an additive
change, the drizzle-kit-generated migration performed a **full table rebuild**:

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_account` ( ... );
INSERT INTO `__new_account` (...) SELECT ... FROM `account`;
DROP TABLE `account`;
ALTER TABLE `__new_account` RENAME TO `account`;
PRAGMA foreign_keys=ON;
```

Two facts combined to make this destructive:

1. The application opens the database with `PRAGMA foreign_keys = ON`
   (`libs/database/src/lib/database.ts`).
2. Drizzle's better-sqlite3 migrator runs all migration statements **inside a
   single transaction**.

In SQLite, **`PRAGMA foreign_keys` is a no-op inside a transaction** — foreign-key
enforcement can only be toggled when no transaction is open. So the migration's
`PRAGMA foreign_keys=OFF` did nothing, and foreign keys remained enforced.

With foreign keys enforced, `DROP TABLE account` performs an implicit delete of
all `account` rows, which triggers `ON DELETE CASCADE` on the children that
reference it — `website-options` and `website-data` — deleting all of their rows.

This was confirmed by reproducing the exact pattern: inside a transaction the
`foreign_keys` pragma stayed `1`, and `DROP TABLE account` took the child
`website-options` row count from 2 to 0.

### This is a known upstream framework bug

The behavior is documented as a drizzle-orm bug:
[drizzle-team/drizzle-orm#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782)
— "SQLite table-rebuild migrations silently wipe child tables for any FK with
`ON DELETE CASCADE`." Three individually-correct pieces combine into a silent
data-loss event:

1. drizzle-kit's table-rebuild codegen prepends `PRAGMA foreign_keys=OFF;` to
   disarm cascades during the rebuild (correct in intent).
2. drizzle-orm's migrator wraps every migration in a single `BEGIN ... COMMIT`
   so partial migrations roll back (reasonable).
3. SQLite treats `PRAGMA foreign_keys` as a **no-op inside a transaction**, so
   the guard in (1) is silently neutralized by (2).

Crucially, the failure mode depends on the child FK's `ON DELETE` action:

- `NO ACTION` (default) → the implicit delete **fails loudly** with
  `SQLITE_CONSTRAINT: FOREIGN KEY constraint failed` and rolls back (the
  long-standing, visible variant: issues #1813 / #4089).
- `ON DELETE CASCADE` (our case) → SQLite **silently deletes** every dependent
  row, the `DROP TABLE` succeeds, and the migration commits as applied. No error,
  no log — the only signal is that user data vanished.

A fix (hoisting the pragma before `BEGIN`) is proposed upstream in PR #5784 but
was not yet merged at the time of this incident. Note that `PRAGMA
defer_foreign_keys` does **not** fix it — SQLite performs FK cascading actions
immediately even when constraint checks are deferred. The only reliable approach
is to toggle `foreign_keys` on the connection **outside** the transaction.

---

## The 5 Whys

1. **Why did users' default website options disappear?**
   The `website-options` rows (including the default/null-account option) were
   deleted from the database during the 4.0.40 upgrade.

2. **Why were the `website-options` rows deleted?**
   Migration `0008` dropped and recreated the `account` table. Because foreign
   keys were enforced, dropping the table cascaded via `ON DELETE CASCADE` into
   `website-options` (and `website-data`), deleting their rows.

3. **Why were foreign keys still enforced, when the migration explicitly ran
   `PRAGMA foreign_keys=OFF`?**
   In SQLite that pragma is a no-op inside a transaction, and drizzle runs
   migrations inside a transaction. The connection was opened with
   `foreign_keys = ON`, so enforcement was never actually disabled.

4. **Why did the migration rebuild the entire `account` table instead of making
   an additive change?**
   drizzle-kit auto-generated a table-rebuild migration to add two foreign-key
   columns, and that generated SQL was shipped without scrutinizing its
   destructive `DROP TABLE` pattern (the additive `ALTER TABLE ADD COLUMN` form
   was sufficient).

5. **Why was the destructive migration not caught before release?**
   There was no migration test that seeds representative data and verifies it
   survives, no automated guard against destructive migration patterns, and no
   pre-migration backup safety net. The interaction between the in-migration FK
   pragma and drizzle's surrounding transaction was not understood by reviewers —
   and is in fact a known upstream drizzle-orm bug
   ([#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782)) that is
   silent specifically for `ON DELETE CASCADE` foreign keys.

**Root cause statement:** A generated table-rebuild migration deleted data
because its foreign-key guard was silently ineffective inside drizzle's
transaction, and no test, review check, or backup existed to catch or mitigate
it before release.

---

## Resolution

1. **Made the migration non-destructive.** Migration `0008` was rewritten to add
   the two columns directly, with no table rebuild and therefore no cascade:

   ```sql
   DROP TABLE `user-specified-website-options`;
   ALTER TABLE `account` ADD `defaultFileTemplateId` text
     REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null;
   ALTER TABLE `account` ADD `defaultMessageTemplateId` text
     REFERENCES `submission`(`id`) ON UPDATE no action ON DELETE set null;
   ```

   Verified to preserve `website-options` and `website-data` while producing the
   identical final schema. This protects users still on ≤4.0.39 who upgrade to a
   later release. (Users who already ran the old `0008` will not re-run it, since
   the migrator gates on the journal timestamp.)

2. **Added self-healing recovery.** `SubmissionService.onModuleInit` now runs
   `recreateMissingDefaultOptions()`, which restores the default (null-account)
   website option for any submission missing it, so already-damaged databases
   become structurally whole on next launch. (Note: this restores the option's
   existence with default values; the specific values a user had typed are only
   recoverable from a personal backup.)

3. **Confirmed `website-data` self-heals.** Missing rows are recreated lazily by
   `WebsiteDataManager.createOrLoadWebsiteData()` on website initialization. The
   stored credentials themselves are unrecoverable, so users must re-authenticate.

---

## Remedies / Action Items

| # | Action | Status |
| --- | --- | --- |
| 1 | Rewrite migration `0008` to be additive (no table rebuild). | ✅ Done |
| 2 | Self-healing pass to recreate missing default website options on startup. | ✅ Done |
| 3 | **Automatic pre-migration backups** — consistent `VACUUM INTO` snapshot taken only when migrations are pending, stored in a `backups/` subfolder, retaining the 5 most recent. | ✅ Done |
| 4 | **Migration integrity tests** — seed representative data, run migrations as production does (FKs on, in a transaction), and assert data survives; plus a generic guard that fails for any future migration that destroys seeded data. | ✅ Done |
| 5 | Prefer additive migrations; treat any generated `DROP TABLE` / table-rebuild as a red flag requiring explicit review. | ⏳ Process |
| 6 | Document the FK-pragma trap: the in-SQL `PRAGMA foreign_keys=OFF` is ignored inside drizzle's transaction. If a rebuild is truly required, toggle FKs on the connection *outside* `migrate()`. | ⏳ Process |
| 7 | Unit tests for the new recovery and backup logic. | ⏳ Planned |
| 8 | User-facing restore path (list/restore a backup) instead of manual file swaps. | ⏳ Planned |
| 9 | Decide whether to backfill the dropped `user-specified-website-options` (saved account defaults) into the new template model. | ⏳ Decision needed |
| 10 | Add monitoring/alerting for unexpected mass row deletion so future incidents are detected automatically, not via user reports. | ⏳ Planned |
| 11 | Apply the upstream-recommended workaround for [drizzle-orm#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782): toggle `foreign_keys = OFF` on the raw connection **before** `migrate()` and restore it in a `finally`, so any future table-rebuild migration cannot silently cascade-delete. Revisit once the upstream fix (PR #5784) ships and drizzle is upgraded. | ⏳ Recommended |

---

## Lessons Learned

- **Auto-generated migrations are not automatically safe.** A table rebuild that
  reads as routine can be destructive in the presence of cascading foreign keys.
- **Safety guards can be silently ineffective.** `PRAGMA foreign_keys=OFF` looked
  like protection but did nothing inside a transaction. Guards must be verified,
  not assumed.
- **Backups are the only universal safety net.** Migration-specific fixes only
  protect against known failure modes; a pre-migration snapshot protects against
  the unknown ones too.
- **Data-destroying changes need automated gates.** A seed-and-verify migration
  test would have failed loudly before release.

---

## What Went Well / What Went Poorly

**Went well:** Root cause was isolated and empirically confirmed quickly; the fix
is additive and low-risk; durable safeguards (backups + tests) were added rather
than just patching the symptom.

**Went poorly:** The data loss was silent and shipped to production; it was caught
by users rather than monitoring; the saved account-default data has no recovery
path for already-upgraded users without a personal backup.

---

## References

- [drizzle-team/drizzle-orm#5782](https://github.com/drizzle-team/drizzle-orm/issues/5782)
  — SQLite table-rebuild migrations silently wipe child tables for any FK with
  `ON DELETE CASCADE` (the upstream root-cause bug).
- [drizzle-team/drizzle-orm#5784](https://github.com/drizzle-team/drizzle-orm/pull/5784)
  — proposed upstream fix (hoist `PRAGMA foreign_keys` before `BEGIN`).
- [drizzle-team/drizzle-orm#1813](https://github.com/drizzle-team/drizzle-orm/issues/1813)
  and [#4089](https://github.com/drizzle-team/drizzle-orm/issues/4089) — the
  long-standing *loud* (`NO ACTION`) variant of the same bug.
- [SQLite: PRAGMA foreign_keys](https://www.sqlite.org/pragma.html#pragma_foreign_keys)
  — "This pragma is a no-op within a transaction."
- [SQLite: DROP TABLE](https://www.sqlite.org/lang_droptable.html) — implicit
  `DELETE` and foreign-key actions on drop.
- PostyBirb PR #919 (`54cc281`) — the change that introduced migration `0008`.
