# Post Queue Flow Diagrams

This document provides comprehensive flow diagrams for submissions going through the post queue system in PostyBirb.

## 1. High-Level Overview

```mermaid
flowchart TD
    subgraph Entry Points
        A[User Manually Enqueues Submission]
        B[Scheduled Submission Triggers]
    end

    A --> C[PostQueueService.enqueue]
    B -->|CRON: Every 30s| C

    C --> D{Queue Entry<br/>Already Exists?}
    D -->|Yes| E[Skip - First-in wins]
    D -->|No| F[Create PostRecord via<br/>PostRecordFactory]

    F --> G[Determine Resume Mode]
    G --> H[Insert PostQueueRecord]

    H --> I[Queue Processing Loop<br/>CRON: Every 1s]

    I --> J{Queue Paused?}
    J -->|Yes| K[Skip Execution]
    J -->|No| L[PostQueueService.peek]

    L --> M{Top Record State?}
    M -->|DONE/FAILED| N[Dequeue & Remove]
    M -->|PENDING/RUNNING| O{Manager Already<br/>Posting?}

    O -->|Yes| P[Wait for completion]
    O -->|No| Q[PostManagerRegistry.startPost]

    Q --> R[Post Execution<br/>See Detailed Flow]
    R --> M
```

## 2. Resume Mode Logic

```mermaid
flowchart TD
    A[enqueue called with submissionId] --> AA{Any PENDING or<br/>RUNNING PostRecord?}

    AA -->|Yes| AB[Throw InvalidPostChainError<br/>reason: in_progress]

    AA -->|No| B{Any Prior<br/>PostRecord?}

    B -->|No| C[Create Fresh PostRecord<br/>resumeMode = NEW<br/>originPostRecordId = null]

    B -->|Yes| D{Most Recent<br/>PostRecord State?}

    D -->|DONE| E[Create Fresh PostRecord<br/>resumeMode = NEW<br/>originPostRecordId = null<br/>Previous was successful]

    D -->|FAILED| F{resumeMode<br/>provided?}

    F -->|Yes| G[Use Provided Mode]
    F -->|No| H[Default to CONTINUE]

    G --> I[PostRecordFactory.create]
    H --> I

    I --> J{resumeMode = NEW?}
    J -->|Yes| K[originPostRecordId = null<br/>This record IS the origin]
    J -->|No| L[Find most recent NEW record]

    L --> M{Origin found?}
    M -->|No| N[Throw InvalidPostChainError<br/>reason: no_origin]
    M -->|Yes| MA{Origin state<br/>= DONE?}
    MA -->|Yes| MB[Throw InvalidPostChainError<br/>reason: origin_done]
    MA -->|No| O[originPostRecordId = origin.id<br/>Chain to origin]

    subgraph Resume Modes
        P[NEW]
        Q[CONTINUE]
        R[CONTINUE_RETRY]
    end

    P --> S[Start completely fresh<br/>Ignore all prior progress]
    Q --> T[Continue from where it left off<br/>Skip successfully posted files/accounts]
    R --> U[Retry failed websites<br/>but remember successful posts]

    subgraph InvalidPostChainError Reasons
        ERR1[in_progress: PENDING/RUNNING record exists]
        ERR2[no_origin: No prior NEW record for CONTINUE/RETRY]
        ERR3[origin_done: Origin NEW record already DONE]
    end

    subgraph Chain Example
        V["#1 NEW (origin)"]
        W["#2 CONTINUE → origin=#1"]
        X["#3 CONTINUE → origin=#1"]
        Y["#4 NEW (new origin)"]
        Z["#5 RETRY → origin=#4"]
    end
```

## 3. PostManagerRegistry & Manager Selection

```mermaid
flowchart TD
    A[PostManagerRegistry.startPost] --> B{Get Manager by<br/>Submission Type}

    B --> C{SubmissionType.FILE}
    B --> D{SubmissionType.MESSAGE}

    C --> E[FileSubmissionPostManager]
    D --> F[MessageSubmissionPostManager]

    E --> G{Manager Already<br/>Posting?}
    F --> G

    G -->|Yes| H[Return - Cannot start<br/>new post]
    G -->|No| I[Build Resume Context]

    I --> J[postRecordFactory.buildResumeContext]
    J --> K[Query chain via originPostRecordId<br/>Aggregate events from all records]

    K --> L[BasePostManager.startPost<br/>with ResumeContext]
```

## 4. Post Execution Flow (BasePostManager)

```mermaid
flowchart TD
    A[startPost called] --> B{Currently<br/>Posting?}

    B -->|Yes| C[Return early]
    B -->|No| D[Create CancellableToken]

    D --> E[Set PostRecord state<br/>to RUNNING]

    E --> F[Get Post Order<br/>Group websites into batches]

    F --> G[Batch 1: Standard Websites<br/>post concurrently]
    G --> H[Batch 2: Websites that Accept<br/>External Source URLs<br/>post concurrently]

    H --> I[finishPost]

    I --> J{Check PostEvents<br/>for failures}
    J -->|All Success| K[State = DONE]
    J -->|Any Failures| L[State = FAILED]

    K --> M[Archive submission if<br/>non-recurring schedule]
    L --> N[Create failure notification]

    M --> O[Cleanup & End]
    N --> O

    subgraph Post Order Logic
        P[Standard Websites First]
        Q[Then External Source Websites]
        R[So source URLs can propagate]
    end
```

## 5. Website Posting Flow (per website)

```mermaid
flowchart TD
    A[postToWebsite] --> B[Emit POST_ATTEMPT_STARTED<br/>event]

    B --> C{Account<br/>Logged In?}
    C -->|No| D[Throw: Not logged in]

    C -->|Yes| E{Website Supports<br/>Submission Type?}
    E -->|No| F[Throw: Type not supported]

    E -->|Yes| G[Prepare Post Data<br/>Parse descriptions, tags]
    G --> H[Validate Submission]

    H --> I{Validation<br/>Passed?}
    I -->|No| J[Throw: Validation errors]

    I -->|Yes| K[attemptToPost<br/>Type-specific logic]

    K --> L{Post<br/>Successful?}

    L -->|Yes| M[Emit POST_ATTEMPT_COMPLETED<br/>event]
    L -->|No| N[handlePostFailure<br/>Emit POST_ATTEMPT_FAILED event]

    M --> O[Track success metrics]
    N --> P[Create error notification]

    D --> N
    F --> N
    J --> N
```

## 6. File Submission Flow (FileSubmissionPostManager)

```mermaid
flowchart TD
    A[attemptToPost] --> B{Website is<br/>FileWebsite?}
    B -->|No| C[Throw Error]

    B -->|Yes| D[Get Files to Post]
    D --> E[Filter: Not ignored for this website]
    E --> F[Filter: Not already posted<br/>based on resumeContext]
    F --> G[Sort by order]

    G --> H{Any files<br/>to post?}
    H -->|No| I[Return - Nothing to post]

    H -->|Yes| J[Split into batches<br/>based on fileBatchSize]

    J --> K[For Each Batch]

    K --> L[Collect source URLs<br/>from other accounts]
    L --> M[Process files:<br/>Resize/Convert if needed]
    M --> N[Verify file types supported]

    N --> O[Wait for posting interval]
    O --> P[cancelToken.throwIfCancelled]

    P --> Q[website.onPostFileSubmission]

    Q --> R{Result has<br/>exception?}

    R -->|Yes| S[Emit FILE_FAILED events<br/>for each file in batch]
    S --> T[Stop posting to<br/>this website]

    R -->|No| U[Emit FILE_POSTED events<br/>for each file in batch]
    U --> V{More Batches?}

    V -->|Yes| K
    V -->|No| W[Complete]
```

## 7. Message Submission Flow (MessageSubmissionPostManager)

```mermaid
flowchart TD
    A[attemptToPost] --> B[Wait for posting interval]
    B --> C[cancelToken.throwIfCancelled]

    C --> D[website.onPostMessageSubmission]

    D --> E{Result has<br/>exception?}

    E -->|Yes| F[Emit MESSAGE_FAILED event]
    F --> G[Throw exception]

    E -->|No| H[Emit MESSAGE_POSTED event<br/>with sourceUrl]
    H --> I[Complete]
```

## 8. File Processing Pipeline

```mermaid
flowchart TD
    A[SubmissionFile] --> B{File Type?}

    B -->|IMAGE| C{Can convert to<br/>accepted format?}
    C -->|Yes| D[FileConverterService.convert]
    C -->|No| E[Keep original]

    D --> F[Calculate resize parameters]
    E --> F

    F --> G{User defined<br/>dimensions?}
    G -->|Yes| H[Apply user dimensions]
    G -->|No| I[Use website limits]

    H --> J[PostFileResizerService.resize]
    I --> J

    J --> K[PostingFile]

    B -->|TEXT| L{Has alt file &<br/>original not accepted?}
    L -->|Yes| M[Use alt file]
    L -->|No| N[Use original]

    M --> O[Convert if needed]
    N --> K
    O --> K

    K --> P[Add source URLs<br/>from other websites]
    P --> Q[Ready for posting]
```

## 9. Crash Recovery Flow

```mermaid
flowchart TD
    A[Application Startup] --> B[PostQueueService.onModuleInit]

    B --> C[Find all PostRecords<br/>with state = RUNNING]

    C --> D{Any RUNNING<br/>records found?}

    D -->|No| E[Normal startup]

    D -->|Yes| F[For each RUNNING record]

    F --> G[Log: Resuming interrupted PostRecord]
    G --> H[PostManagerRegistry.startPost]

    H --> I[Build resume context<br/>using originPostRecordId chain]

    I --> J{Resume Mode?}

    J -->|NEW + RUNNING| K[Aggregate own events<br/>for crash recovery]
    J -->|CONTINUE| L[Skip completed accounts<br/>& posted files]
    J -->|CONTINUE_RETRY| M[Skip completed accounts<br/>Retry failed]

    K --> N[Resume posting]
    L --> N
    M --> N
```

## 10. Complete End-to-End Flow

```mermaid
flowchart TD
    subgraph User/Scheduler
        A[Enqueue Request]
    end

    subgraph PostQueueService
        B[enqueue]
        C[Queue Loop - 1s CRON]
        D[peek - get next item]
    end

    subgraph PostRecordFactory
        E[create PostRecord]
        F[buildResumeContext]
    end

    subgraph PostManagerRegistry
        G[startPost]
        H[Route to appropriate manager]
    end

    subgraph PostManagers
        I[FileSubmissionPostManager]
        J[MessageSubmissionPostManager]
    end

    subgraph Website
        K[onPostFileSubmission]
        L[onPostMessageSubmission]
    end

    A --> B
    B --> E
    E --> B
    B --> C
    C --> D
    D --> G
    G --> F
    F --> H
    H --> I
    H --> J
    I --> K
    J --> L
    K --> M{Success?}
    L --> M
    M -->|Yes| N[Emit success events]
    M -->|No| O[Emit failure events]
    N --> P[Update PostRecord state]
    O --> P
    P --> Q[Dequeue]
```

## Key Classes & Files Reference

| Component           | File                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Queue Management    | `apps/client-server/src/app/post/services/post-queue/post-queue.service.ts`                           |
| Manager Registry    | `apps/client-server/src/app/post/services/post-manager-v2/post-manager-registry.service.ts`           |
| Base Manager        | `apps/client-server/src/app/post/services/post-manager-v2/base-post-manager.service.ts`               |
| File Posting        | `apps/client-server/src/app/post/services/post-manager-v2/file-submission-post-manager.service.ts`    |
| Message Posting     | `apps/client-server/src/app/post/services/post-manager-v2/message-submission-post-manager.service.ts` |
| Record Factory      | `apps/client-server/src/app/post/services/post-record-factory/post-record-factory.service.ts`         |
| Chain Error         | `apps/client-server/src/app/post/errors/invalid-post-chain.error.ts`                                  |
| Legacy Manager      | `apps/client-server/src/app/post/services/post-manager/post-manager.service.ts`                       |

## PostRecord Chain Model

PostRecords are linked via `originPostRecordId` to form posting chains:

```text
Chain 1 (Group):
┌─────────────────────────────────────────────────────────────────┐
│  #1 NEW                    ← origin (originPostRecordId: null)  │
│  #2 CONTINUE → origin=#1   ← chains to #1                       │
│  #3 CONTINUE → origin=#1   ← chains to #1 (DONE closes chain)   │
└─────────────────────────────────────────────────────────────────┘

Chain 2 (Self-contained):
┌─────────────────────────────────────────────────────────────────┐
│  #4 NEW (DONE)             ← origin, completed in one attempt   │
└─────────────────────────────────────────────────────────────────┘

Chain 3 (Active):
┌─────────────────────────────────────────────────────────────────┐
│  #5 NEW                    ← origin (originPostRecordId: null)  │
│  #6 RETRY → origin=#5      ← chains to #5                       │
└─────────────────────────────────────────────────────────────────┘
```

**Query for chain aggregation:**

```sql
SELECT * FROM post_record
WHERE id = :originId OR originPostRecordId = :originId
ORDER BY createdAt ASC
```

## PostRecord Creation Guards

Before creating a new PostRecord, the factory performs the following validations:

| Guard                 | Condition                                    | Error Reason    |
| --------------------- | -------------------------------------------- | --------------- |
| In-Progress Check     | PENDING or RUNNING record exists             | `in_progress`   |
| Origin Exists         | CONTINUE/RETRY without prior NEW record      | `no_origin`     |
| Origin Open           | CONTINUE/RETRY when origin is DONE           | `origin_done`   |

These guards ensure:

1. **No concurrent posting** - Only one PostRecord can be PENDING/RUNNING per submission at a time
2. **Valid chain linkage** - CONTINUE/RETRY modes must have a valid origin to chain from
3. **Chain closure respected** - Once an origin is DONE, a new chain (NEW mode) must be started
