# Selected Posting Targets

The single and bulk post review dialogs have two posting scopes:

- **Incomplete work** retains normal resume behavior. Users can also select completed work to post again.
- **Selected targets** posts only the chosen website, account, or file targets, including previously successful targets. A website checkbox selects its configured accounts; an account checkbox selects its eligible files. Unselected submissions in a bulk operation are not staged.

## API

`POST /api/posting/`, `/api/posting/dry-run`, and `/api/posting/incomplete-work` accept the same optional `targets` property:

```json
{
  "submissionId": "submission-id",
  "evictions": {},
  "targets": {
    "account-id": ["file-id"]
  }
}
```

`targets` is an allow-list keyed by account ID. An empty file array selects every eligible target for that account, including a message submission's account target. Accounts absent from the map are excluded. An empty map is invalid; omitting `targets` preserves the normal resume behavior. When supplied, `targets` takes precedence over `evictions`.

Unknown accounts, unavailable files, and account/file pairs excluded by a file's ignored-websites setting are rejected. Selection does not bypass active-worker ownership, posting pause, dependencies, rate limits, or website validation.

## Persistence

Explicit selection creates fresh pending units. Previous units for selected targets and unselected unfinished units are evicted from active scheduling, retaining their recorded states and results in history. Unselected successes remain active historical successes. A later normal manual post can rebuild unfinished targets that were left out.

Selected units share a `data.postingSelectionId`. The worker preserves this value across state updates and uses it to scope batch numbering and same-account thread URLs, including after a restart. This prevents older successful files from changing a selected run's first/last-batch behavior. Cross-account source URL propagation is unchanged.

A successful selected run follows the existing completion and archive rules. Target selection does not permanently remove accounts or files from the submission.