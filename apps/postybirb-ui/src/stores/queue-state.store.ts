import { create } from 'zustand';

type QueueState = {
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
};

export const useQueueState = create<QueueState>()((set) => ({
  isPaused: false,
  setIsPaused: (isPaused) => set({ isPaused }),
}));