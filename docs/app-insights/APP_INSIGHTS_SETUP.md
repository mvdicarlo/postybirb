# Application Insights: errors and integration health

PostyBirb uses Application Insights for:

- Diagnosing application errors in Electron, the embedded backend, and the UI.
- Finding broken website integrations through dependency success/failure and latency.
- Aggregating existing error/dependency telemetry by a random installation ID.

It does not send computer resource-usage measurements, page views, app-start
events, or activity heartbeats.

## Implementation

The backend uses the Azure Monitor OpenTelemetry exporter directly, with isolated
log and trace providers. It does not install automatic instrumentation, register a
global telemetry provider, create a meter provider, or discover host/OS resources.
The compatible exporter/OpenTelemetry versions are declared directly in the
dependency manifest rather than supplied by the legacy `applicationinsights` shim.

The UI retains the browser Application Insights SDK, configured for manually
reported exceptions only. Its final telemetry initializer rejects every other
telemetry type and removes the SDK's identity, device, session, and page context.
It then supplies the same app-managed pseudonymous installation ID as the backend.

See Microsoft's [exporter documentation](https://learn.microsoft.com/javascript/api/overview/azure/monitor-opentelemetry-exporter-readme?view=azure-node-preview)
for the supported log/trace provider APIs.

### Configuration

- `initializeAppInsights({ enabled, connectionString, appVersion, cloudRole })`
  initializes the backend once. Passing `enabled: false`, or providing no
  connection string, leaves it disabled.
- Connection-string precedence is explicit configuration, then the
  `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable, then the build
  placeholder. Configuration objects are not modified.
- `initializeAppInsightsUI({ enabled, connectionString })` initializes the browser
  SDK once. The normal UI entry point uses the build placeholder.
- `yarn inject:app-insights` fills both build placeholders from `APP_INSIGHTS_KEY`.
  Despite the legacy variable name, supply the complete Azure connection string,
  not a bare instrumentation key. `yarn inject:app-insights:clear` resets them.
- A runtime backend environment variable does not automatically configure the UI.
  Distributed builds inject both placeholders through the existing build script.
- These are startup switches, not a live settings/consent toggle.

Do not commit injected connection strings or log credentials. Keep the existing
build-time injection in CI.

### Installation identity

On telemetry initialization or a trusted UI metadata request, the main process
creates a random UUID v4 in
`telemetry-installation-id.txt` inside the configured PostyBirb data directory.
The file is reused across launches and app updates; the ID is not derived from
an account, computer name, email address, hardware identifier, or local path.

Every remote exception, error trace, and dependency carries this ID in the native
Application Insights `user_Id` field (`ai.user.id` on the wire). The backend uses
the exporter's `enduser.pseudo.id` attribute, not an authenticated user identity.
The trusted Electron metadata/preload bridge supplies the same ID to the UI
without cookies or browser storage.

This identifies a data-directory installation, not a person. Separate data
directories have separate IDs; copying the directory also copies its identity.
To reset it, close the app and delete only `telemetry-installation-id.txt` before
restarting. Resetting does not remove previously ingested Azure records.

Unreadable, invalid, or unwritable identity files are reported locally and leave
the affected remote telemetry disabled rather than silently rotating the ID or
using a temporary one. The app and local logging still operate. UI identity does
not depend on the backend exporter's connection or provider lifecycle.

No startup/activity record is sent. Distinct IDs therefore count installations
observed through existing error/dependency telemetry, not all launches or every
active installation.

## What is sent

Every item contains `customDimensions.telemetrySchemaVersion = "2"`. Queries in
[APP_INSIGHTS_QUERIES.md](./APP_INSIGHTS_QUERIES.md) filter this version so old
events do not distort the new dependency-based health views.

### Errors

- Main-process uncaught exceptions and unhandled rejections.
- Startup failures and abnormal process/window failures reported by the existing
  diagnostics.
- Error-level Winston logs. LogLayer's `err` field is recognized correctly:
  errors with an `Error` become exception telemetry; plain messages become
  error-severity traces.
- UI window errors, unhandled rejections, and caught React error-boundary failures.
- Posting failures, including failures that return a message rather than throw.
- HTTP transport exceptions. Ordinary HTTP failure responses are dependencies,
  not additional synthetic exceptions.

Explicit exception reports keep their corresponding Winston log local using
`withMetadata({ telemetry: false })`, preventing duplicate remote reports while
preserving local diagnostic logs.

### HTTP dependencies

The Electron HTTP wrapper reports:

- HTTP method and URL pathname as the dependency name, such as
  `GET /controls/submissions`.
- Public remote hostname as the target.
- Duration, final status code, and success/failure.
- `customDimensions.dependencyType = "HTTP"`.

It does **not** send query strings, fragments, URL credentials, ports,
headers, request bodies, response bodies, cookies, or partition/account identifiers
as dependency data. IP-address targets, local/single-label hostnames, and
`.local`/`.localhost`/`.internal` targets become `private-host`.
The dependency's URL-data field stays empty; the pathname is retained in `name`.
Path segments are not templated or redacted and can contain usernames, IDs, or
tokens supplied by an integration.

Cloudflare resolution reports the final browser response rather than the initial
challenge status. An unresolved challenge or a thrown browser fallback is a
failed dependency, even when the challenge page had HTTP status 200.

### Website-posting dependencies

Each actual `websiteInstance.post` attempt also reports:

- `Post FILE` or `Post MESSAGE`.
- The integration's stable code-defined website name as the target.
- Duration and success/failure.
- Website, submission type, and failure stage.
- `customDimensions.dependencyType = "Website"`.

This includes integrations using third-party SDKs that bypass the Electron HTTP
wrapper. Thrown errors and returned exceptions are failures. Server-imposed rate
limits are failures with result code 429, distinguishable from integration defects.
Locally deferred rate limits and user cancellations are not posting attempts in
these health statistics. Preparation/validation/login failures still generate
error reports, but are not counted as attempted website posts.

Both dependency categories are client spans mapped by the Azure exporter to its
HTTP dependency representation (`type` is emitted as `Http`). Filter
`customDimensions.dependencyType`, not the SDK-specific casing of `type`, to
separate them. They populate Application Map and Dependencies without automatic
HTTP instrumentation or adding correlation headers to website requests.

Do not combine HTTP and website-posting counts when computing a posting success
rate: one website attempt can involve several HTTP requests. There is no
account or per-submission correlation; items can be grouped by installation ID.

## Privacy policy and limitations

### Kept deliberately

- **Error messages remain useful and otherwise unchanged.** Local filesystem
  paths are stripped where recognized; arbitrary emails, tokens, IDs, or remote
  URLs inside a message are not redacted.
- Stack traces preserve function names and code filenames/line/column locations,
  without installation paths or renderer origins/query strings.
- Public dependency hostnames identify failing services. A self-hosted or
  federated hostname can identify its server owner.
- HTTP dependency names retain endpoint paths for endpoint-level diagnosis.
- A persistent random installation ID links telemetry across app sessions without
  using an account or machine identifier.
- App version and fixed component roles distinguish releases and error sources.
  Backend role defaults to `postybirb`; UI role is `postybirb-ui`. Role instances
  are fixed strings, not computer names.
- A small allowlist of structural properties is accepted, including source,
  website, stage, method, status code, process failure reason, and UI component.

### Not collected

- CPU, memory, disk, network-utilization, event-loop, or other computer
  resource-usage measurements.
- Performance counters, standard metrics, Live Metrics, SDK Statsbeat, resource
  metrics, or SDK statistics.
- Posting success/failure custom events or custom metric counters. Dependency
  counts provide the denominators needed for health rates.
- Page views, navigation history, page-visit timing, or user activity events.
- Account/submission IDs, personal user identities, or posting form options as
  structured properties. The random installation ID is retained separately.
- Machine hostname, device/OS resource attributes, authenticated user IDs,
  SDK-generated user IDs, or session IDs.
- Browser telemetry cookies or browser storage buffers.
- Disk-backed telemetry retry caches. Telemetry uses memory-only queues; offline
  failures or process termination can lose pending reports.

Items explicitly override Application Insights' client IP tag to `0.0.0.0`.
The backend uses a fixed ingestion User-Agent rather than the SDK's
OS/architecture/runtime-bearing default. Browsers still control their own
transport headers. Azure necessarily sees the network source IP while accepting a connection;
this is not a network-anonymization mechanism.

**This is pseudonymous data minimization, not guaranteed anonymity.** A stable
random ID makes records linkable even though it does not encode personal details.
Full error messages and endpoint path segments can contain personal information
or secrets supplied by a website or SDK. Filesystem path recognition in errors
is best-effort. Keeping messages and endpoint names is an intentional debugging
tradeoff; callers should avoid embedding sensitive payloads in their own errors.
Existing local application logs remain unchanged by the remote telemetry policy.

## Lifecycle and failure handling

`flushAppInsights()` awaits both providers' real flush promises. There is no fixed
100 ms sleep masquerading as successful export. Failed exports surface through
local SDK diagnostics and rejected flushes, handled by startup/crash diagnostics.

`shutdownAppInsights()` flushes and stops both providers during graceful shutdown.
The existing bounded Electron shutdown timer still guards against a hung exit.
Telemetry failures never replace posting results or interrupt error logging.

## Portal views and alert proposals

Use Application Map for the service topology and Dependencies for failures.
Use the queries in [APP_INSIGHTS_QUERIES.md](./APP_INSIGHTS_QUERIES.md) to build:

1. Website-posting failure-rate table with attempt-count thresholds.
2. HTTP failures by target, endpoint name, and status code.
3. Recent exceptions and error logs, broken down by source and app version.
4. A release regression chart and rate-limit table.
5. Integration usage and distinct reporting-installation counts.

The query reference also supplies candidate scheduled-query alert conditions.
Thresholds are starting points; tune them against real traffic. Compare distinct
reporting installations with attempt counts to distinguish a noisy single
installation from failures affecting several installations.

Creating workbooks, dashboards, saved queries, action groups, alert rules, changing
retention, or purging historical data requires explicit Azure-resource approval.
The code migration does not change Azure resources or delete historical telemetry.
Historical records can still contain previously collected identifiers/options.

## Validation

Focused tests cover real Azure exporter serialization with a fake HTTP transport,
absence of resource metrics and account/device metadata, exact dependency
durations and endpoint names, SDK configuration, UI context filtering,
LogLayer/Winston integration, Cloudflare
outcomes, and existing posting/cancellation/rate-limit behavior.

The SQLite addon's native ABI must match the test runtime. If the installed addon
was built for Electron and Node-based posting tests report an ABI mismatch, run
the existing Jest suites with the installed Electron executable and
`ELECTRON_RUN_AS_NODE=1`. Use Node when the addon was built for Node, rather than
rebuilding a shared native addon merely to run these tests.
