// Simple test to verify our setup works
import { advance, runAll, flushMicrotasks } from './timers';

describe('Test Setup Verification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await runAll();
    jest.useRealTimers();
  });

  it('should handle basic timer operations', async () => {
    let called = false;
    setTimeout(() => { called = true; }, 1000);
    
    expect(called).toBe(false);
    await advance(1000);
    expect(called).toBe(true);
  });

  it('should handle microtasks', async () => {
    let resolved = false;
    Promise.resolve().then(() => { resolved = true; });
    
    expect(resolved).toBe(false);
    await flushMicrotasks();
    expect(resolved).toBe(true);
  });
});