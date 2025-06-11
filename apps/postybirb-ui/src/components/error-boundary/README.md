# Error Boundary Usage Guide

This guide shows you how to use the error boundary components in the PostyBirb application.

## Quick Start

### 1. Wrap Your Entire App (Already Done)

The app is already wrapped with `PageErrorBoundary` in `app.tsx` to catch any unhandled errors.

### 2. Basic Component Wrapping

```tsx
import { ComponentErrorBoundary } from '../components/error-boundary';

function MyPage() {
  return (
    <div>
      <ComponentErrorBoundary>
        <RiskyComponent />
      </ComponentErrorBoundary>
    </div>
  );
}
```

### 3. Form Error Handling

```tsx
import { FormErrorBoundary } from '../components/error-boundary';

function SubmissionForm() {
  const handleFormError = (error: Error) => {
    // Custom error handling, e.g., reset form state
    console.log('Form error:', error);
  };

  return (
    <FormErrorBoundary onError={handleFormError}>
      <MyComplexForm />
    </FormErrorBoundary>
  );
}
```

### 4. Route-Level Error Boundaries

```tsx
import { useLocation } from 'react-router';
import { RouteErrorBoundary } from '../components/error-boundary';

function MyPage() {
  const location = useLocation();
  
  return (
    <RouteErrorBoundary routeKey={location.pathname}>
      <PageContent />
    </RouteErrorBoundary>
  );
}
```

### 5. Higher-Order Component (HOC) Pattern

```tsx
import { withErrorBoundary } from '../components/error-boundary';

// Original component
function DashboardStats({ data }: { data: any }) {
  return <div>{data.stats}</div>;
}

// Wrapped with error boundary
export default withErrorBoundary(DashboardStats, {
  level: 'component',
  onError: (error) => console.error('Dashboard stats error:', error)
});
```

### 6. Notification Integration

```tsx
import { NotificationErrorBoundary } from '../components/error-boundary';

function UserProfile() {
  return (
    <NotificationErrorBoundary 
      notificationTitle={<Trans>Profile Error</Trans>}
      showNotification={true}
    >
      <ProfileContent />
    </NotificationErrorBoundary>
  );
}
```

### 7. Silent Error Boundaries for Non-Critical Components

```tsx
import { SilentErrorBoundary } from '../components/error-boundary';

function OptionalWidget() {
  return (
    <div>
      <h2>Main Content</h2>
      
      {/* This widget can fail silently without affecting the page */}
      <SilentErrorBoundary>
        <NonCriticalWidget />
      </SilentErrorBoundary>
    </div>
  );
}
```

### 8. Handling Async Errors

```tsx
import { useAsyncErrorHandler } from '../components/error-boundary';

function DataComponent() {
  const handleAsyncError = useAsyncErrorHandler();
  
  const fetchData = async () => {
    try {
      const response = await api.getUserData();
      // Handle success
    } catch (error) {
      handleAsyncError(error); // Will be caught by nearest error boundary
    }
  };

  return <button onClick={fetchData}>Load Data</button>;
}
```

### 9. Testing Error Boundaries

```tsx
import { useErrorThrower } from '../components/error-boundary';

function ErrorTestComponent() {
  const throwError = useErrorThrower();
  
  return (
    <div>
      <button onClick={() => throwError('Test error')}>
        Throw Test Error
      </button>
      
      <button onClick={() => throwError(new Error('Custom error'))}>
        Throw Custom Error
      </button>
    </div>
  );
}
```

### 10. Custom Fallback UI

```tsx
import { ErrorBoundary } from '../components/error-boundary';

function CustomErrorUI({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Alert color="orange" title="Oops!">
      <Text>Something went wrong: {error.message}</Text>
      <Button onClick={retry} mt="sm">Try Again</Button>
    </Alert>
  );
}

function MyComponent() {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, retry) => (
        <CustomErrorUI error={error} retry={retry} />
      )}
    >
      <ComplexComponent />
    </ErrorBoundary>
  );
}
```

## Best Practices

### 1. Layer Your Error Boundaries

```tsx
function App() {
  return (
    <PageErrorBoundary> {/* Catches app-level errors */}
      <Router>
        <Routes>
          <Route path="/submissions" element={
            <RouteErrorBoundary routeKey="/submissions"> {/* Catches page-level errors */}
              <SubmissionsPage />
            </RouteErrorBoundary>
          } />
        </Routes>
      </Router>
    </PageErrorBoundary>
  );
}

function SubmissionsPage() {
  return (
    <div>
      <ComponentErrorBoundary> {/* Catches component-level errors */}
        <SubmissionsList />
      </ComponentErrorBoundary>
      
      <FormErrorBoundary> {/* Catches form-specific errors */}
        <SubmissionForm />
      </FormErrorBoundary>
    </div>
  );
}
```

### 2. Reset Error Boundaries on Route Changes

```tsx
import { useLocation } from 'react-router';

function MyApp() {
  const location = useLocation();
  
  return (
    <ErrorBoundary resetKeys={[location.pathname]}>
      <AppContent />
    </ErrorBoundary>
  );
}
```

### 3. Integrate with Error Reporting Services

```tsx
// In your error boundary onError callback
onError={(error, errorInfo) => {
  // Log to console for development
  console.error('Error caught:', error, errorInfo);
  
  // Send to error reporting service (example)
  // Sentry.captureException(error, { extra: errorInfo });
  
  // Show user notification
  notifications.show({
    title: 'Something went wrong',
    message: 'We\'ve been notified and are working on a fix.',
    color: 'red'
  });
}}
```

### 4. Progressive Error Boundaries

Start with a global error boundary, then add more specific ones as needed:

1. **Global** - Wrap entire app
2. **Route-level** - Wrap major page components
3. **Section-level** - Wrap major UI sections
4. **Component-level** - Wrap individual risky components

This gives you multiple layers of protection while maintaining good user experience.
