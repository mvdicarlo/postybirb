/**
 * HoldToConfirm - A component that requires users to hold down mouse or Enter key
 * for a specified duration to confirm an action. Useful for destructive actions.
 */

import { ActionIcon, type ActionIconProps, Progress } from '@mantine/core';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

/** Default duration in ms to hold before confirming */
const DEFAULT_HOLD_DURATION = 1000;
/** Update interval for progress animation */
const PROGRESS_INTERVAL = 16;

export interface UseHoldToConfirmOptions {
  /** Callback when hold is completed */
  onConfirm: () => void;
  /** Whether the hold action is disabled */
  disabled?: boolean;
  /** Duration in ms to hold before confirming (default: 1000) */
  duration?: number;
}

export interface UseHoldToConfirmReturn {
  /** Current progress percentage (0-100) */
  progress: number;
  /** Whether currently holding */
  isHolding: boolean;
  /** Start the hold action */
  startHold: () => void;
  /** Stop the hold action */
  stopHold: () => void;
}

/**
 * Hook to handle hold-to-confirm logic for mouse and keyboard.
 */
export function useHoldToConfirm({
  onConfirm,
  disabled,
  duration = DEFAULT_HOLD_DURATION,
}: UseHoldToConfirmOptions): UseHoldToConfirmReturn {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearHoldInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopHold = useCallback(() => {
    setIsHolding(false);
    setProgress(0);
    clearHoldInterval();
  }, [clearHoldInterval]);

  const startHold = useCallback(() => {
    if (disabled) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();
    setProgress(0);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        setIsHolding(false);
        setProgress(0);
        clearHoldInterval();
        onConfirm();
      }
    }, PROGRESS_INTERVAL);
  }, [disabled, onConfirm, duration, clearHoldInterval]);

  // Cleanup on unmount
  useEffect(() => clearHoldInterval, [clearHoldInterval]);

  return { progress, isHolding, startHold, stopHold };
}

export interface HoldToConfirmButtonProps
  extends Omit<ActionIconProps, 'onMouseDown' | 'onMouseUp' | 'onMouseLeave'> {
  /** Callback when hold is completed */
  onConfirm: () => void;
  /** Duration in ms to hold before confirming (default: 1000) */
  duration?: number;
  /** Color of the progress bar (default: inherits from button color) */
  progressColor?: string;
  /** Children to render inside the button */
  children: React.ReactNode;
}

/**
 * An ActionIcon that requires holding down to confirm an action.
 * Shows a progress bar that fills as the user holds.
 */
export const HoldToConfirmButton = forwardRef<
  HTMLButtonElement,
  HoldToConfirmButtonProps
>((props, ref) => {
  const {
    onConfirm,
    duration,
    progressColor,
    disabled,
    children,
    color,
    ...rest
  } = props;

  const { progress, isHolding, startHold, stopHold } = useHoldToConfirm({
    onConfirm,
    disabled,
    duration,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault();
        startHold();
      }
    },
    [startHold]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        stopHold();
      }
    },
    [stopHold]
  );

  return (
    <ActionIcon
      ref={ref}
      {...rest}
      color={color}
      disabled={disabled}
      onMouseDown={startHold}
      onMouseUp={stopHold}
      onMouseLeave={stopHold}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={{ position: 'relative', overflow: 'hidden', ...rest.style }}
    >
      {isHolding && (
        <Progress
          value={progress}
          color={progressColor ?? (color as string) ?? 'blue'}
          size="xs"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: 0,
          }}
        />
      )}
      {children}
    </ActionIcon>
  );
});

// eslint-disable-next-line lingui/no-unlocalized-strings
HoldToConfirmButton.displayName = 'HoldToConfirmButton';
