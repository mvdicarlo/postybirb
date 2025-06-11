import { ComponentType, ReactNode } from 'react';
import { ErrorBoundary } from './error-boundary';

interface WithErrorBoundaryOptions {
  fallback?: (error: Error, errorInfo: { componentStack: string }, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  level?: 'page' | 'section' | 'component';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * 
 * @example
 * const SafeMyComponent = withErrorBoundary(MyComponent, {
 *   level: 'component',
 *   onError: (error) => console.error('Component failed:', error)
 * });
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundaryComponent;
}

/**
 * React hook for creating error boundaries declaratively
 * 
 * @example
 * function MyComponent() {
 *   const ErrorBoundaryWrapper = useErrorBoundary({
 *     level: 'component',
 *     onError: (error) => logError(error)
 *   });
 * 
 *   return (
 *     <ErrorBoundaryWrapper>
 *       <RiskyComponent />
 *     </ErrorBoundaryWrapper>
 *   );
 * }
 */
export function useErrorBoundary(options: WithErrorBoundaryOptions = {}) {
  return function ErrorBoundaryWrapper({ children }: { children: ReactNode }) {
    return (
      <ErrorBoundary {...options}>
        {children}
      </ErrorBoundary>
    );
  };
}
