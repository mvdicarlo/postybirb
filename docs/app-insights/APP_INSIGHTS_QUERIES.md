# Application Insights queries: website usage, errors, and integration health

Run these in **Application Insights > Logs**, scoped to the resource. They use the
Application Insights table names (`dependencies`, `exceptions`, `traces`), not the
workspace-level `AppDependencies`, `AppExceptions`, and `AppTraces` schema.

All queries filter `telemetrySchemaVersion = "2"` to exclude legacy telemetry.
Telemetry is not intentionally sampled, so dependency counts represent recorded
attempts, not users. Offline/memory-queue losses can still undercount attempts.
See [APP_INSIGHTS_SETUP.md](./APP_INSIGHTS_SETUP.md) for the privacy policy.

## Website usage

Use posting activity as the primary measure of integration usage: one actual
website post attempt is one `Website` dependency, regardless of how many HTTP
requests the integration makes. These queries also cover posting integrations
that use third-party SDKs rather than the Electron HTTP wrapper.

These are counts of recorded attempts, not distinct users, accounts, submissions,
or installations. Retries and posting to multiple accounts increase the counts.
They do not measure every interaction with an integration, such as selecting it
in the UI or editing an account. The separate installation ranking uses the
persistent random `user_Id`, not an account or personal identity. The volume
ranking includes older records without installation IDs; the installation
ranking only includes records with an ID.

Unlike the defect-rate queries below, usage counts include successes, failures,
and server-imposed rate limits. User cancellations, locally deferred rate limits,
and preparation failures are not actual posting attempts and are excluded.
Change `ago(30d)` to adjust the reporting window.

### Most-used integrations and share of posting activity

Rank integrations by attempts and show their percentage of all recorded attempts.
`FailedAttempts` includes server-imposed rate limits. To rank by completed posts
instead, change the final sort to `SuccessfulPosts desc`.

```kusto
let WebsiteUsage = dependencies
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| summarize Attempts = count(), SuccessfulPosts = countif(success == true),
    FailedAttempts = countif(success == false)
    by Website = tostring(customDimensions.website);
let TotalAttempts = toscalar(WebsiteUsage | summarize sum(Attempts));
WebsiteUsage
| extend UsageSharePercent = round(100.0 * Attempts / TotalAttempts, 2)
| order by Attempts desc, Website asc
```

### Most-used integrations by reporting installations

Filter out missing IDs before counting so older telemetry is not mistaken for
one shared installation. The attempt counts in this view also only include
records with an installation ID.

```kusto
dependencies
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where isnotempty(user_Id)
| summarize ReportingInstallations = dcount(user_Id), Attempts = count(),
    SuccessfulPosts = countif(success == true)
    by Website = tostring(customDimensions.website)
| order by ReportingInstallations desc, Attempts desc
```

### File versus message posting activity

Break down each integration's attempts and successful posts by submission type
(`FILE` or `MESSAGE`).

```kusto
dependencies
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| summarize Attempts = count(), SuccessfulPosts = countif(success == true)
    by Website = tostring(customDimensions.website),
       SubmissionType = tostring(customDimensions.submissionType)
| order by Website asc, Attempts desc
```

### Daily posting activity by integration

```kusto
dependencies
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| summarize Attempts = count()
    by bin(timestamp, 1d), Website = tostring(customDimensions.website)
| order by timestamp asc
| render timechart
```

### Most-requested HTTP hostnames

This is a broader request-volume view, including non-posting requests made through
the Electron HTTP wrapper. It ranks hostnames, not integration names: an
integration can contact multiple hosts, and several integrations can share a host.
Third-party SDK requests are not automatically tracked, and private targets are
combined under `private-host`.

Use this as supplementary activity data, not as a posting denominator or a
complete integration-usage ranking. Do not add these counts to `Website` counts:
one post can generate several HTTP dependencies.

```kusto
dependencies
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| summarize Requests = count(), FailedRequests = countif(success == false)
    by Hostname = target
| order by Requests desc, Hostname asc
```

## Reporting installations

The same random installation GUID is stored in `user_Id` on dependencies,
exceptions, and error traces. It is pseudonymous and identifies an installation
data directory, not a person. These counts only include installations that sent
existing telemetry: no app-start record or activity heartbeat is collected, so
opening an idle, error-free app may not be counted.

`dcount` provides approximate distinct counts. Do not sum daily or
per-website distinct counts to calculate an overall distinct count: one
installation can appear on several days and use several integrations.

### Distinct reporting installations in the last thirty days

```kusto
union dependencies, exceptions, traces
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where isnotempty(user_Id)
| summarize ReportingInstallations = dcount(user_Id)
```

### Daily reporting-installation trend

```kusto
union dependencies, exceptions, traces
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where isnotempty(user_Id)
| summarize ReportingInstallations = dcount(user_Id) by bin(timestamp, 1d)
| order by timestamp asc
| render timechart
```

### Telemetry for one installation

Replace the placeholder with an installation GUID from a telemetry record.

```kusto
let InstallationId = "<installation-guid>";
union dependencies, exceptions, traces
| where timestamp > ago(30d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where user_Id == InstallationId
| project timestamp, itemType, cloud_RoleName, application_Version,
    Details = coalesce(outerMessage, message, name)
| order by timestamp desc
| take 200
```

## Website health dashboard

Use this as the primary broken-integration view. It counts website posts, not the
several HTTP calls that may be made by one post. Exclude server-imposed rate limits
from the defect rate, and show them separately below.

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where resultCode != "429"
| extend Website = tostring(customDimensions.website)
| summarize Attempts = count(), Failures = countif(success == false),
    P95Duration = percentile(duration, 95) by Website
| extend FailurePercent = round(100.0 * Failures / Attempts, 2)
| order by FailurePercent desc, Attempts desc
```

### Website failures by stage and release

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where success == false and resultCode != "429"
| summarize Failures = count()
    by Website = tostring(customDimensions.website),
       Stage = tostring(customDimensions.stage),
       Version = application_Version
| order by Failures desc
```

### Failure-rate trend

```kusto
dependencies
| where timestamp > ago(7d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where resultCode != "429"
| summarize Attempts = count(), Failures = countif(success == false)
    by bin(timestamp, 1h), Website = tostring(customDimensions.website)
| extend FailurePercent = 100.0 * Failures / Attempts
| project timestamp, Website, FailurePercent
| render timechart
```

### Server-imposed rate limits

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where resultCode == "429"
| summarize RateLimitedAttempts = count()
    by Website = tostring(customDimensions.website)
| order by RateLimitedAttempts desc
```

## HTTP dependency health

Dependency names contain methods and URL pathnames, such as
`GET /controls/submissions`. Targets contain public hostnames or `private-host`;
query strings, fragments, and URL credentials are intentionally unavailable as
dependency data. Endpoint path segments are retained as-is and can contain
identifying values.
An HTTP 200 challenge page can still have `success == false`.

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| summarize Requests = count(), Failures = countif(success == false),
    P95Duration = percentile(duration, 95) by target
| extend FailurePercent = round(100.0 * Failures / Requests, 2)
| order by Failures desc
```

### Endpoint success and failure rates

Group by both hostname and dependency name so the same path on different hosts
does not share a denominator. Older method-only records remain separate rows.

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| summarize Requests = count(), Failures = countif(success == false),
    P95Duration = percentile(duration, 95) by target, name
| extend FailurePercent = round(100.0 * Failures / Requests, 2)
| order by Failures desc, Requests desc
```

### Recent HTTP failures

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| where success == false
| project timestamp, target, name, resultCode, duration, application_Version, user_Id
| order by timestamp desc
| take 100
```

### Failed status codes

```kusto
dependencies
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| where success == false
| summarize Failures = count() by target, resultCode
| order by Failures desc
```

## Application errors

### Recent exceptions

```kusto
exceptions
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| project timestamp, type, outerMessage, cloud_RoleName, application_Version, user_Id,
    Source = tostring(customDimensions.source),
    Website = tostring(customDimensions.website),
    Stage = tostring(customDimensions.stage)
| order by timestamp desc
| take 100
```

### Most common exceptions

```kusto
exceptions
| where timestamp > ago(7d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| summarize Errors = count()
    by type, outerMessage, Source = tostring(customDimensions.source),
       Website = tostring(customDimensions.website)
| order by Errors desc
| take 50
```

### Plain error-level logs

```kusto
traces
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where severityLevel >= 3
| project timestamp, message, application_Version, cloud_RoleName,
    Source = tostring(customDimensions.source)
| order by timestamp desc
| take 100
```

### Caught React rendering failures

```kusto
exceptions
| where timestamp > ago(24h)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.source) == "error-boundary"
| summarize Errors = count()
    by Component = tostring(customDimensions.component), type, application_Version
| order by Errors desc
```

### Compare release health

```kusto
dependencies
| where timestamp > ago(7d)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where resultCode != "429"
| summarize Attempts = count(), Failures = countif(success == false)
    by application_Version, Website = tostring(customDimensions.website)
| extend FailurePercent = round(100.0 * Failures / Attempts, 2)
| order by Website asc, application_Version desc
```

## Candidate scheduled-query alerts

These queries return a row only when the proposed condition is met. Configure a
scheduled-query alert on **number of results > 0**, for example every five minutes
with a 15-minute lookback. Evaluate actual volume before adopting the thresholds.
Creating alert rules/action groups requires explicit approval; these queries do
not deploy anything.

### High website failure rate

Minimum ten attempts, at least five failures, and at least 50% failure rate.
Rate limits are excluded. These are request counts, not distinct-user counts.

```kusto
dependencies
| where timestamp > ago(15m)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "Website"
| where resultCode != "429"
| summarize Attempts = count(), Failures = countif(success == false)
    by Website = tostring(customDimensions.website)
| extend FailurePercent = 100.0 * Failures / Attempts
| where Attempts >= 10 and Failures >= 5 and FailurePercent >= 50.0
```

### Repeated application exception

Ten instances of the same exception type and source within fifteen minutes.

```kusto
exceptions
| where timestamp > ago(15m)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| summarize Errors = count()
    by type, Source = tostring(customDimensions.source), application_Version
| where Errors >= 10
```

### HTTP server failures

At least five HTTP 5xx responses to one target within fifteen minutes.

```kusto
dependencies
| where timestamp > ago(15m)
| where tostring(customDimensions.telemetrySchemaVersion) == "2"
| where tostring(customDimensions.dependencyType) == "HTTP"
| where toint(resultCode) between (500 .. 599)
| summarize Failures = count() by target
| where Failures >= 5
```
