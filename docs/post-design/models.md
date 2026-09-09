```ts

enum UnitOfWorkState = {
    NEW = 'NEW',
    PENDING = 'PENDING',
    EXECUTING = 'EXECUTING',
    SUCCEEDED = 'SUCCEEDED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
    RATE_LIMITED = 'RATE_LIMITED'
}

interface UnitOfWork {
    // Standard fields
    id: string;
    createdAt: string;
    updatedAt: string;

    // Relationships
    postId: string;
    submissionId: string;
    accountId: string;
    fileId?: string;
    fileHash?: string;

    // Fields
    attempt: number; // number of the attempt
    data?: object; // optional posted data
    response?: object; // optional returned response
    evicted: boolean; // (default false)
    url?: string; // optional returned url
    batch?: string; // guid
    state: UnitOfWorkState; // (default NEW)
}

interface Post {
    // Standard fields
    id: string;
    createdAt: string;
    updatedAt: string;

    // Relationships
    submissionId: string;
    unitsOfWork: string[];

    // Fields
    completed: boolean;
    cancelled: boolean;
}
```