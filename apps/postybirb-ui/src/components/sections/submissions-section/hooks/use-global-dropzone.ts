import { FileWithPath } from '@mantine/dropzone';
import { useCallback, useEffect } from 'react';

interface UseGlobalDropzoneProps {
  /** Whether this feature is enabled (e.g., only for FILE submission type) */
  enabled?: boolean;
  onDrop: (files: FileWithPath[]) => void;
}

/**
 * Hook that listens for files being dragged into a page without any specific target.
 */
export function useGlobalDropzone({
  onDrop,
  enabled = true,
}: UseGlobalDropzoneProps): void {
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;

      event.preventDefault();
    },
    [enabled],
  );

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled || !event.dataTransfer) return;

      const fileList = event.dataTransfer.files;
      if (!fileList) return;

      if (
        event.target instanceof HTMLElement &&
        event.target.className.toLowerCase().includes('dropzone')
      )
        return;

      event.preventDefault();

      onDrop(Array.from(fileList));
    },
    [enabled, onDrop],
  );

  // Add global event listeners
  useEffect(() => {
    if (!enabled) return undefined;

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [enabled, handleDragOver, handleDrop]);
}
