/* eslint-disable no-console */
/* eslint-disable lingui/no-unlocalized-strings */
import { useCallback } from 'react';

/**
 * Hook that provides a function to manually trigger errors
 * Useful for testing error boundaries or handling programmatic errors
 * 
 * @example
 * function MyComponent() {
 *   const throwError = useErrorThrower();
 *   
 *   const handleAsyncError = async () => {
 *     try {
 *       await riskyAsyncOperation();
 *     } catch (error) {
 *       throwError(error); // This will be caught by the nearest error boundary
 *     }
 *   };
 * 
 *   return (
 *     <button onClick={() => throwError(new Error('Test error'))}>
 *       Throw Error
 *     </button>
 *   );
 * }
 */
export function useErrorThrower() {
  return useCallback((error: Error | string) => {
    const errorToThrow = typeof error === 'string' ? new Error(error) : error;
    
    // Use setTimeout to ensure the error is thrown outside of the current call stack
    // This ensures React's error boundary can catch it properly
    setTimeout(() => {
      throw errorToThrow;
    }, 0);
  }, []);
}

/**
 * Hook for handling async errors that should be caught by error boundaries
 * 
 * @example
 * function MyComponent() {
 *   const handleAsyncError = useAsyncErrorHandler();
 *   
 *   const fetchData = async () => {
 *     try {
 *       const data = await api.getData();
 *       // handle success
 *     } catch (error) {
 *       handleAsyncError(error); // Will be caught by error boundary
 *     }
 *   };
 * }
 */
export function useAsyncErrorHandler() {
  const throwError = useErrorThrower();
  
  return useCallback((error: Error | string) => {
    console.error('Async error occurred:', error);
    throwError(error);
  }, [throwError]);
}
