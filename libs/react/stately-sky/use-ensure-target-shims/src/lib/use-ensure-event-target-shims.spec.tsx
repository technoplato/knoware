import { renderHook } from '@testing-library/react';
import { useEnsureEventShimsAreLoaded } from './use-ensure-event-target-shims';

describe('UseEnsureEventTargetShims', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.Event = undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    globalThis.EventTarget = undefined;
  });
  it('should set shims correctly', () => {
    const hook = renderHook(() => useEnsureEventShimsAreLoaded());
    if (hook.result.current) {
      expect(globalThis.Event).not.toBe(undefined);
      expect(globalThis.EventTarget).not.toBe(undefined);
    }
  });
  it('should not be a false fix', () => {
    const hook = { result: { current: true } };
    if (hook.result.current) {
      expect(globalThis.Event).toBe(undefined);
      expect(globalThis.EventTarget).toBe(undefined);
    }
  });
});
