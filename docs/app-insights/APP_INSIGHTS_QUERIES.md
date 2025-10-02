# Azure App Insights - Complete Query Reference

> This file contains all Application Insights queries for PostyBirb, organized by category.
> Copy and paste these queries directly into Azure Portal → Application Insights → Logs.

## Quick Start

1. Open **Azure Portal** → Your Application Insights resource
2. Click **Logs** in the left sidebar
3. Copy any query from this file
4. Paste into the query editor
5. Click **Run** to execute

## Table of Contents

- [HTTP Dependencies](#http-dependencies)
  - [Performance](#performance)
  - [Reliability](#reliability)
  - [Volume & Trends](#volume--trends)
- [Posting Events](#posting-events)
  - [Success Rate](#success-rate)
  - [Recent Activity](#recent-activity)
  - [Metrics](#metrics)
- [Exceptions](#exceptions)
  - [By Source](#by-source)
  - [React Errors](#react-errors)
  - [HTTP Errors](#http-errors)
- [Correlation Queries](#correlation-queries)
- [Version Tracking](#version-tracking)
- [Alerts](#alerts)
- [Dashboard Tiles](#dashboard-tiles)

---

## HTTP Dependencies

### Performance
```kusto
// Average response time by website
dependencies
| where type == "HTTP"
| summarize AvgDuration = avg(duration), Calls = count() by target
| order by AvgDuration desc
```

```kusto
// 95th percentile response time
dependencies
| where type == "HTTP"
| summarize P95 = percentile(duration, 95) by target
| order by P95 desc
```

```kusto
// Slowest recent requests
dependencies
| where type == "HTTP"
| order by duration desc
| take 100
| project timestamp, name, target, duration, resultCode
```

### Reliability
```kusto
// Failure rate by website
dependencies
| where type == "HTTP"
| summarize
    Total = count(),
    Failures = countif(success == false),
    FailureRate = 100.0 * countif(success == false) / count()
    by target
| order by FailureRate desc
```

```kusto
// Recent failures
dependencies
| where type == "HTTP"
| where success == false
| order by timestamp desc
| take 50
| project timestamp, name, target, resultCode, duration
```

```kusto
// Status code distribution
dependencies
| where type == "HTTP"
| summarize count() by resultCode, target
| order by count_ desc
```

### Volume & Trends
```kusto
// Request volume by website
dependencies
| where type == "HTTP"
| summarize count() by target
| order by count_ desc
```

```kusto
// Request volume over time
dependencies
| where type == "HTTP"
| summarize count() by bin(timestamp, 1h), target
| render timechart
```

```kusto
// Most called endpoints
dependencies
| where type == "HTTP"
| summarize count() by name, target
| top 20 by count_
```

## Posting Events

### Success Rate
```kusto
// Overall success rate by website
customEvents
| where name in ("PostSuccess", "PostFailure")
| summarize
    Total = count(),
    Successes = countif(name == "PostSuccess"),
    SuccessRate = 100.0 * countif(name == "PostSuccess") / count()
    by Website = tostring(customDimensions.website)
| order by Total desc
```

```kusto
// Success rate over time
customEvents
| where name in ("PostSuccess", "PostFailure")
| summarize
    Successes = countif(name == "PostSuccess"),
    Failures = countif(name == "PostFailure"),
    SuccessRate = 100.0 * countif(name == "PostSuccess") / count()
    by bin(timestamp, 1h)
| render timechart
```

### Recent Activity
```kusto
// Recent post failures
customEvents
| where name == "PostFailure"
| order by timestamp desc
| take 50
| project
    timestamp,
    Website = tostring(customDimensions.website),
    Error = tostring(customDimensions.errorMessage),
    Stage = tostring(customDimensions.stage)
```

```kusto
// Recent post failures (detailed)
customEvents
| where name == "PostFailure"
| order by timestamp desc
| take 50
| project
    timestamp,
    Website = tostring(customDimensions.website),
    ErrorMessage = tostring(customDimensions.errorMessage),
    Stage = tostring(customDimensions.stage),
    SubmissionType = tostring(customDimensions.submissionType),
    SubmissionId = tostring(customDimensions.submissionId),
    AccountId = tostring(customDimensions.accountId)
```

```kusto
// Recent post successes
customEvents
| where name == "PostSuccess"
| order by timestamp desc
| take 50
| project
    timestamp,
    Website = tostring(customDimensions.website),
    SubmissionType = tostring(customDimensions.submissionType),
    FileCount = tostring(customDimensions.fileCount)
```

```kusto
// Posting trends over time
customEvents
| where name in ("PostSuccess", "PostFailure")
| summarize
    Successes = countif(name == "PostSuccess"),
    Failures = countif(name == "PostFailure")
    by bin(timestamp, 1h), Website = tostring(customDimensions.website)
| render timechart
```

### Metrics
```kusto
// Post success metrics by website
customMetrics
| where name startswith "post.success."
| extend Website = replace(@"post\.success\.", "", name)
| summarize Total = sum(value) by Website
| order by Total desc
```

```kusto
// Post failure metrics by website
customMetrics
| where name startswith "post.failure."
| extend Website = replace(@"post\.failure\.", "", name)
| summarize Total = sum(value) by Website
| order by Total desc
```

## Exceptions

### By Source
```kusto
// Exceptions by component
exceptions
| summarize count() by Source = tostring(customDimensions.source)
| order by count_ desc
```

```kusto
// Recent exceptions
exceptions
| order by timestamp desc
| take 50
| project
    timestamp,
    Source = tostring(customDimensions.source),
    Type = type,
    Message = outerMessage
```

```kusto
// Uncaught exceptions
exceptions
| where customDimensions.type in ("uncaughtException", "unhandledRejection")
| order by timestamp desc
| take 50
| project
    timestamp,
    Source = tostring(customDimensions.source),
    Type = tostring(customDimensions.type),
    Message = outerMessage,
    Details = details
```

```kusto
// Exceptions by website
exceptions
| where customDimensions.website != ""
| summarize Count = count() by
    Website = tostring(customDimensions.website),
    ErrorType = type,
    Message = outerMessage
| order by Count desc
```

### React Errors
```kusto
// React Error Boundary catches
exceptions
| where customDimensions.source == "error-boundary"
| order by timestamp desc
| take 50
| project
    timestamp,
    Component = tostring(customDimensions.component),
    Level = tostring(customDimensions.level),
    Message = outerMessage
```

```kusto
// React Error Boundary catches (detailed)
exceptions
| where customDimensions.source == "error-boundary"
| order by timestamp desc
| take 50
| project
    timestamp,
    Component = tostring(customDimensions.component),
    Level = tostring(customDimensions.level),
    Message = outerMessage,
    ComponentStack = tostring(customDimensions.componentStack)
```

```kusto
// Most common React component failures
exceptions
| where customDimensions.source == "error-boundary"
| summarize
    Count = count(),
    UniqueErrors = dcount(outerMessage)
    by Component = tostring(customDimensions.component)
| order by Count desc
```

```kusto
// Most common React components failing (detailed)
exceptions
| where customDimensions.source == "error-boundary"
| summarize
    ErrorCount = count(),
    UniqueErrors = dcount(outerMessage),
    LatestOccurrence = max(timestamp)
    by Component = tostring(customDimensions.component)
| order by ErrorCount desc
```

### HTTP Errors
```kusto
// HTTP request exceptions
exceptions
| where customDimensions.source == "http-dependency"
| order by timestamp desc
| take 50
| project
    timestamp,
    Method = tostring(customDimensions.method),
    Domain = tostring(customDimensions.domain),
    StatusCode = tostring(customDimensions.statusCode),
    Message = outerMessage
```

## Correlation Queries

### HTTP Failures + Post Failures
```kusto
union
    (dependencies
     | where type == "HTTP"
     | where success == false
     | extend EventType = "HTTPFailure", Website = target, Details = strcat("Status: ", resultCode)),
    (customEvents
     | where name == "PostFailure"
     | extend EventType = "PostFailure", Website = tostring(customDimensions.website), Details = tostring(customDimensions.errorMessage))
| order by timestamp desc
| project timestamp, EventType, Website, Details
```

### Slow HTTP + Post Failures
```kusto
let slowRequests = dependencies
    | where type == "HTTP"
    | where duration > 10000
    | summarize SlowCalls = count() by Website = target;
let postFailures = customEvents
    | where name == "PostFailure"
    | summarize Failures = count() by Website = tostring(customDimensions.website);
slowRequests
| join kind=inner (postFailures) on Website
| project Website, SlowCalls, Failures
| order by SlowCalls desc
```

### Exceptions + Post Failures
```kusto
union
    (exceptions
     | extend EventType = "Exception", Website = tostring(customDimensions.website)),
    (customEvents
     | where name == "PostFailure"
     | extend EventType = "PostFailure", Website = tostring(customDimensions.website))
| where Website != ""
| order by timestamp desc
| project timestamp, EventType, Website, Message = outerMessage
```

## Version Tracking

### Success Rate by Version
```kusto
customEvents
| where name in ("PostSuccess", "PostFailure")
| extend Version = application_Version
| summarize
    Total = count(),
    Successes = countif(name == "PostSuccess"),
    SuccessRate = 100.0 * countif(name == "PostSuccess") / count()
    by Version
| order by Version desc
```

```kusto
// Success rate by version (detailed)
customEvents
| where name in ("PostSuccess", "PostFailure")
| extend Version = tostring(application_Version)
| summarize
    Total = count(),
    Successes = countif(name == "PostSuccess"),
    SuccessRate = 100.0 * countif(name == "PostSuccess") / count()
    by Version
| order by Version desc
```

### Exceptions by Version
```kusto
exceptions
| summarize
    Count = count(),
    UniqueErrors = dcount(outerMessage)
    by Version = application_Version
| order by Count desc
```

```kusto
// Exceptions by version (detailed)
exceptions
| summarize
    Count = count(),
    UniqueErrors = dcount(outerMessage)
    by Version = tostring(application_Version)
| order by Count desc
```

### HTTP Performance by Version
```kusto
dependencies
| where type == "HTTP"
| summarize
    TotalCalls = count(),
    AvgDuration = avg(duration),
    FailureRate = 100.0 * countif(success == false) / count()
    by Version = application_Version
| order by Version desc
```

## Alerts

### High HTTP Failure Rate
```kusto
dependencies
| where type == "HTTP"
| where timestamp > ago(15m)
| summarize
    Total = count(),
    Failures = countif(success == false),
    FailureRate = 100.0 * countif(success == false) / count()
    by target
| where FailureRate > 10  // Alert if >10%
```

### Slow HTTP Requests
```kusto
dependencies
| where type == "HTTP"
| where timestamp > ago(15m)
| summarize AvgDuration = avg(duration) by target
| where AvgDuration > 30000  // Alert if >30 seconds
```

### High Post Failure Rate
```kusto
customEvents
| where name in ("PostSuccess", "PostFailure")
| where timestamp > ago(15m)
| summarize
    Total = count(),
    FailureRate = 100.0 * countif(name == "PostFailure") / count()
    by Website = tostring(customDimensions.website)
| where FailureRate > 20  // Alert if >20%
```

### Spike in Exceptions
```kusto
exceptions
| where timestamp > ago(15m)
| summarize Count = count()
| where Count > 50  // Alert if >50 exceptions in 15 min
```

## Dashboard Tiles

### Key Metrics
```kusto
// Total HTTP requests (last 24h)
dependencies
| where type == "HTTP"
| where timestamp > ago(24h)
| summarize count()
```

```kusto
// HTTP success rate (last 24h)
dependencies
| where type == "HTTP"
| where timestamp > ago(24h)
| summarize SuccessRate = 100.0 * countif(success == true) / count()
```

```kusto
// Average HTTP duration (last 24h)
dependencies
| where type == "HTTP"
| where timestamp > ago(24h)
| summarize avg(duration)
```

```kusto
// Total posts (last 24h)
customEvents
| where name == "PostCompleted"
| where timestamp > ago(24h)
| summarize count()
```

```kusto
// Post success rate (last 24h)
customEvents
| where name in ("PostSuccess", "PostFailure")
| where timestamp > ago(24h)
| summarize SuccessRate = 100.0 * countif(name == "PostSuccess") / count()
```

```kusto
// Total exceptions (last 24h)
exceptions
| where timestamp > ago(24h)
| summarize count()
```

## Tips

- Use `bin(timestamp, 1h)` for hourly aggregation
- Use `percentile(duration, 95)` for P95 latency
- Use `render timechart` for time-series visualization
- Use `render barchart` for distributions
- Filter by `application_Version` to compare versions
- Use `ago(24h)` for last 24 hours, `ago(7d)` for last 7 days
- Combine with `| take 100` to limit large result sets

## Query Syntax Reference

### Common Filters
```kusto
// Time range
| where timestamp > ago(24h)
| where timestamp between (datetime(2025-01-01) .. datetime(2025-01-31))

// String matching
| where name == "PostSuccess"
| where name in ("PostSuccess", "PostFailure")
| where name contains "Post"
| where name startswith "post."

// Numeric comparisons
| where duration > 5000
| where resultCode == 200
| where resultCode in (200, 201, 204)
```

### Common Aggregations
```kusto
// Count
| summarize count()
| summarize count() by Website

// Average and percentiles
| summarize avg(duration)
| summarize percentile(duration, 95)

// Success rate
| summarize SuccessRate = 100.0 * countif(success == true) / count()

// Multiple metrics
| summarize 
    Total = count(),
    Avg = avg(duration),
    Max = max(duration),
    Min = min(duration)
```

### Common Operations
```kusto
// Sort
| order by timestamp desc
| order by count_ desc

// Limit results
| take 50
| top 20 by duration

// Project (select columns)
| project timestamp, name, duration

// Extend (add calculated columns)
| extend DurationSeconds = duration / 1000

// Render charts
| render timechart
| render barchart
| render piechart
```

## Additional Resources

- **Main Setup Guide**: [APP_INSIGHTS_SETUP.md](./APP_INSIGHTS_SETUP.md)
- **HTTP Tracking Guide**: [APP_INSIGHTS_HTTP_TRACKING.md](./APP_INSIGHTS_HTTP_TRACKING.md)
- **Azure Documentation**: [Kusto Query Language (KQL)](https://docs.microsoft.com/en-us/azure/data-explorer/kusto/query/)

---

**Total Queries**: 50+ ready-to-use queries covering all PostyBirb telemetry

**Last Updated**: October 2, 2025

