// src/test-utils/timers.ts
import { act } from '@testing-library/react-native';

export const flushMicrotasks = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve(); // twice to be safe
  });
};

export const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  await flushMicrotasks();
};

export const runAll = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
  await flushMicrotasks();
};