# Azure Application Insights Implementation

## Overview

Azure Application Insights has been successfully integrated into PostyBirb to track:

- **Uncaught exceptions** in Electron main process, NestJS backend, and React UI
- **Posting success/failure events** with granular website-level tracking
- **Error-level logs** from Winston (to reduce noise)
- **Application version** - Automatically injected into all telemetry for version tracking

## What's Being Tracked

### 1. Uncaught Exceptions

**Electron Main Process:**

- Uncaught exceptions
- Unhandled promise rejections
- Tagged with `source: 'electron-main'`

**NestJS Backend:**

- Uncaught exceptions
- Unhandled promise rejections
- Tagged with `source: 'nestjs-backend'`

**React UI:**

- Window errors
- Unhandled promise rejections
- **React Error Boundary catches** - Component rendering failures with component name and stack
- Tagged with `source: 'window.onerror'`, `'unhandledrejection'`, or `'error-boundary'`

### 2. HTTP Dependencies ⭐ NEW

**All outgoing HTTP requests are tracked as dependencies:**

- Populates the **Application Map** - Visual representation of all external services
- Populates the **Dependencies view** - Performance and reliability metrics
- Tracked details:
  - HTTP method (GET, POST, PATCH)
  - Target domain and path
  - Full URL (truncated to 500 chars)
  - Status code
  - Request duration (ms)
  - Success/failure status
  - Protocol (http/https)

**Benefits:**
- Visual service discovery in Application Map
- Identify slow APIs and bottlenecks
- Track failure rates per website
- Correlate HTTP errors with posting failures

See [HTTP Dependency Tracking Guide](./APP_INSIGHTS_HTTP_TRACKING.md) for detailed documentation.

### 3. Posting Events

**PostSuccess Event:**

- Tracked when a post succeeds to a website
- Properties:
  - `website` - The website name (e.g., "FurAffinity", "Twitter")
  - `accountId` - The account ID
  - `submissionId` - The submission ID
  - `submissionType` - File or Message
  - `hasSourceUrl` - Whether a source URL was returned
  - `completed` - Whether fully completed
  - `isFileBatch` - Whether this was a file batch
  - `fileCount` - Number of files in batch

**PostFailure Event:**

- Tracked when a post fails to a website
- Properties:
  - `website` - The website name
  - `accountId` - The account ID
  - `submissionId` - The submission ID
  - `submissionType` - File or Message
  - `errorMessage` - The error message
  - `stage` - What stage the error occurred
  - `hasException` - Whether an exception was thrown
  - `isFileBatch` - Whether this was a file batch
  - `fileCount` - Number of files in batch

**PostCompleted Event:**

- Tracked when an entire post (all websites) completes
- Properties:
  - `submissionId` - The submission ID
  - `submissionType` - File or Message
  - `state` - DONE or FAILED
  - `websiteCount` - Total websites attempted
  - `successCount` - Successful posts
  - `failureCount` - Failed posts

### 4. Metrics

**Success Metrics:**

- `post.success.{websiteName}` - Counter for each successful post per website

**Failure Metrics:**

- `post.failure.{websiteName}` - Counter for each failed post per website

### 5. Winston Logs

**Only ERROR level logs** are sent to Application Insights to reduce noise:

- All error logs from Winston are tracked as traces
- Errors with exceptions are also tracked as exceptions

## Querying Data in Azure Portal

All Azure Application Insights queries are available in the [APP_INSIGHTS_QUERIES.md](./APP_INSIGHTS_QUERIES.md) file, organized by category:

- **HTTP Dependencies** - Performance, reliability, and volume metrics
- **Posting Events** - Success rates, recent activity, and metrics
- **Exceptions** - By source, React errors, and HTTP errors
- **Correlation Queries** - HTTP failures + post failures, slow requests, etc.
- **Version Tracking** - Compare metrics across versions
- **Alerts** - Ready-to-use alert queries
- **Dashboard Tiles** - Key metrics for monitoring dashboards

See [APP_INSIGHTS_QUERIES.md](./APP_INSIGHTS_QUERIES.md) for 50+ ready-to-use Kusto queries.

## Architecture

### Cloud Role

The implementation uses a single cloud role **`postybirb`** for all components:

- Electron main process
- NestJS backend
- React UI

This simplifies queries and avoids duplicate initialization issues in the Electron process where the backend runs in the same Node.js runtime.

You can still distinguish the source of errors/events using the **`source`** property in custom dimensions:

- `source: 'electron-main'` - Electron main process exceptions
- `source: 'nestjs-backend'` - Backend exceptions
- `source: 'window.onerror'` - UI window errors
- `source: 'unhandledrejection'` - Promise rejections
- `source: 'error-boundary'` - React Error Boundary catches

Example query filtering by source:

```kusto
exceptions
| where customDimensions.source == "electron-main"
| order by timestamp desc
```

### Application Version

The application version is automatically injected into all telemetry:

- **Electron main process** - Uses `environment.version` from the build
- **NestJS backend** - Uses `process.env.POSTYBIRB_VERSION`
- **React UI** - Uses `window.electron.app_version`

This allows you to:

- Track which versions have errors
- Compare metrics across versions
- Filter telemetry by version in Azure Portal
- Create alerts for specific version issues

Example query to see errors by version:

```kusto
exceptions
| summarize Count = count() by Version = tostring(application_Version)
| order by Count desc
```

### Data Flow

```
┌─────────────────────┐
│  Electron Main      │──► Application Insights
│  (main.ts)          │    (Exceptions, Events)
└─────────────────────┘

┌─────────────────────┐
│  NestJS Backend     │──► Application Insights
│  (post-manager)     │    (Posting Events, Errors)
└─────────────────────┘

┌─────────────────────┐
│  React UI           │──► Application Insights
│  (app-insights-ui)  │    (UI Errors, Error Boundary)
└─────────────────────┘

┌─────────────────────┐
│  Winston Logger     │──► Application Insights
│  (error level only) │    (Error Logs)
└─────────────────────┘
```

│ React UI │──► Application Insights
│ (app-insights-ui) │ (UI Errors)
└─────────────────────┘

┌─────────────────────┐
│ Winston Logger │──► Application Insights
│ (error level only) │ (Error Logs)
└─────────────────────┘

```

```
