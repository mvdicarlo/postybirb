/**
 * Checks if the application is running in an Electron environment.
 * @returns {boolean} True if running in Electron, false otherwise.
 */
export function isElectron(): boolean {
    // Check if running in a browser environment
    if (typeof window === 'undefined') {
        return false;
    }

    // Check for Electron-specific properties
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
        return true;
    }

    return false;
}