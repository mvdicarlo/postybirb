/**
 * Hook for global window drag-and-drop to open file submission modal.
 * Detects when files are dragged into a specific target element.
 */

import { useCallback, useEffect, useState } from 'react';

interface UseGlobalDropzoneProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to open the modal */
  onOpen: () => void;
  /** Callback to close the modal (called when drag leaves the window) */
  onClose?: () => void;
  /** Whether this feature is enabled (e.g., only for FILE submission type) */
  enabled?: boolean;
  /** The ID of the target element to listen for drag events on */
  targetElementId?: string;
}

interface UseGlobalDropzoneResult {
  /** Whether a file is currently being dragged over the window */
  isDraggingOver: boolean;
}

/**
 * Hook that listens for files being dragged into a specific target element.
 * Opens the file submission modal when files are detected over the target.
 */
export function useGlobalDropzone({
  isOpen,
  onOpen,
  onClose,
  enabled = true,
  targetElementId,
}: UseGlobalDropzoneProps): UseGlobalDropzoneResult {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // Check if the drag event contains files
  const hasFiles = useCallback((event: DragEvent): boolean => {
    if (!event.dataTransfer) return false;
    
    // Check types for files
    const { types } = event.dataTransfer;
    return types.includes('Files') || types.includes('application/x-moz-file');
  }, []);

  // Check if the event target is within the target element
  const isWithinTarget = useCallback(
    (event: DragEvent): boolean => {
      if (!targetElementId) return true; // If no target specified, allow anywhere
      
      const targetElement = document.getElementById(targetElementId);
      if (!targetElement) return false;
      
      const eventTarget = event.target as Node;
      return targetElement.contains(eventTarget);
    },
    [targetElementId]
  );

  // Handle drag enter
  const handleDragEnter = useCallback(
    (event: DragEvent) => {
      if (!enabled || isOpen) return;
      
      event.preventDefault();
      
      if (hasFiles(event) && isWithinTarget(event)) {
        setDragCounter((c) => c + 1);
        setIsDraggingOver(true);
        
        // Open the modal when files are dragged in
        onOpen();
      }
    },
    [enabled, isOpen, hasFiles, isWithinTarget, onOpen]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      
      event.preventDefault();
      
      // Check if drag is leaving the window (relatedTarget is null when leaving window)
      const isLeavingWindow = event.relatedTarget === null;
      
      setDragCounter((c) => {
        const newCount = c - 1;
        if (newCount <= 0) {
          setIsDraggingOver(false);
          
          // Close modal if drag leaves the window entirely
          if (isLeavingWindow && isOpen && onClose) {
            onClose();
          }
          
          return 0;
        }
        return newCount;
      });
    },
    [enabled, isOpen, onClose]
  );

  // Handle drag over (required to allow drop)
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      
      event.preventDefault();
      if (event.dataTransfer) {
        // eslint-disable-next-line no-param-reassign
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [enabled]
  );

  // Handle drop - reset state (the modal's dropzone handles the actual files)
  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enabled) return;
      
      // Don't prevent default here - let the modal's dropzone handle it
      setDragCounter(0);
      setIsDraggingOver(false);
    },
    [enabled]
  );

  // Add global event listeners
  useEffect(() => {
    if (!enabled) return undefined;

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [enabled, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDragCounter(0);
      setIsDraggingOver(false);
    }
  }, [isOpen]);

  return { isDraggingOver };
}
