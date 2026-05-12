import { PreloadBridge } from '@postybirb/types';
import { createRoot } from 'react-dom/client';
import { initializeAppInsightsUI } from './app-insights-ui';
import { PostyBirb } from './index';

// Initialize Application Insights for UI error tracking
initializeAppInsightsUI();

function Root() {
  return <PostyBirb />;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById('root')!).render(<Root />);

window.addEventListener('keydown', (event) => {
  if (
    event.key === 'F5' ||
    (event.ctrlKey && event.key.toLowerCase() === 'r')
  ) {
    event.preventDefault();
    window.location.reload();
  }
});

const isFileDropEvent = (event: Event): boolean => {
  const dragEvent = event as DragEvent;
  const transferTypes = dragEvent.dataTransfer?.types;

  if (!transferTypes) {
    return false;
  }

  // eslint-disable-next-line lingui/no-unlocalized-strings
  return Array.from(transferTypes).includes('Files');
};

const preventUnhandledFileDropNavigation = (event: Event) => {
  if (event.defaultPrevented || !isFileDropEvent(event)) {
    return;
  }

  event.preventDefault();
};

window.addEventListener('dragover', preventUnhandledFileDropNavigation);
window.addEventListener('drop', preventUnhandledFileDropNavigation);

declare global {
  interface Window {
    electron: PreloadBridge;
  }
}
