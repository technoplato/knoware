/**
 * Ensures that the necessary event shims are loaded.
 *
 * Required to use Stately Sky on React Native.
 *
 * MUST to be called at the top level of the app BEFORE `useStatelyActor` is invoked.
 * You MUST prevent any component that uses the `useState hook from being mounted before this is called.
 *
 * Required via Stately Sky -> PartySocket
 * - https://github.com/statelyai/sky/blob/main/packages/sky-core/src/actorFromStately.ts#L1
 * - Related issue from Party Kit explaining need for event-target-shim: https://github.com/partykit/partykit/issues/232
 *
 * @return {boolean} The value indicating whether the event shims are set or not.
 */
/**
 * Install `event-target-shim`
 */
import { Event, EventTarget } from 'event-target-shim';
import { useEffect, useState } from 'react';
export const useEnsureEventShimsAreLoaded = () => {
  const [shimIsSet, setShimIsSet] = useState(
    [globalThis.Event, globalThis.EventTarget].every(
      (requiredGlobal) => requiredGlobal !== undefined
    )
  );

  useEffect(() => {
    if (shimIsSet) {
      return;
    }

    if (!globalThis.Event) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.Event = Event;
    }

    if (!globalThis.EventTarget) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      globalThis.EventTarget = EventTarget;
    }

    if (!globalThis.EventTarget || !globalThis.Event) {
      throw new Error(
        'Event Target or Event not set properly and everything is gonna suck'
      );
    }
    setShimIsSet(true);
  }, [shimIsSet]);

  return shimIsSet;
};
