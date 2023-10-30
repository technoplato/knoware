import { useActor } from '@xstate/react';
import { assign, createMachine } from 'xstate';

import React, { useEffect } from 'react';
import { InspectionEvent } from 'xstate/dist/declarations/src/system';
import { savedEventsFromLastMain } from './sideEffects/logsFromMainRun';
import { SlimSnapshot } from './types';

export const j = (s) => JSON.stringify(s, null, 2);
export const lj = (o) => {
  console.log(j(o));
};

const increment = ({ context }) => context.count + 1;
const decrement = ({ context }) => context.count - 1;

const hasMoreReplayableActions = ({ context }) => {
  return context.replayIndex < context.savedEventsFromLastMain.length;
};

const hasPreviousReplayableActions = ({ context }) => 0 < context.replayIndex;

const incrementReplayIndex = ({ context }) => context.replayIndex + 1;
const decrementReplayIndex = ({ context }) => context.replayIndex - 1;

const countMachine = createMachine({
  initial: 'active',

  context: {
    count: 0,
  },
  states: {
    active: {
      on: {
        INC: {
          // target: 'forward',
          actions: assign({ count: increment }),
        },

        DEC: { actions: assign({ count: decrement }) },
      },
    },
  },
});

const StartingIndex = 0;

const convertInspectEventToSlimEvent = (
  event: InspectionEvent
): SlimSnapshot => {
  // return event as SlimSnapshot;
  return {
    type: event.event.type,
    context: event.snapshot.context,
  };
};

const slimEvents = savedEventsFromLastMain.map((event, idx) => {
  const previous =
    idx > 0
      ? convertInspectEventToSlimEvent(savedEventsFromLastMain[idx - 1])
      : undefined;
  const next =
    idx < savedEventsFromLastMain.length - 1
      ? convertInspectEventToSlimEvent(savedEventsFromLastMain[idx + 1])
      : undefined;
  const slimEvent = convertInspectEventToSlimEvent(event);

  return {
    ...slimEvent,
    previous,
    next,
  };
});
const firstSnapshot = slimEvents[StartingIndex];

const replaySnapshotMachine = createMachine({
  initial: 'active',

  context: {
    replayIndex: StartingIndex,
    currentSnapshot: firstSnapshot,
    savedEventsFromLastMain: slimEvents,
  },
  states: {
    active: {
      on: {
        // Next and prev will allow user to page through savedEventsFromLastMain
        FIRST: {
          guard: hasPreviousReplayableActions,
          actions: [
            assign(({ context }) => ({
              currentSnapshot: context.savedEventsFromLastMain[0],
              replayIndex: 0,
            })),
          ],
        },
        PREV: {
          guard: hasPreviousReplayableActions,
          actions: [
            assign(({ context }) => ({
              currentSnapshot:
                context.savedEventsFromLastMain[context.replayIndex],
            })),

            assign({ replayIndex: decrementReplayIndex }),
          ],
        },
        NEXT: {
          guard: hasMoreReplayableActions,
          actions: [
            assign(({ context }) => ({
              currentSnapshot:
                context.savedEventsFromLastMain[context.replayIndex],
            })),
            assign({ replayIndex: incrementReplayIndex }),
          ],
        },
        LAST: {
          guard: hasMoreReplayableActions,
          actions: [
            assign(({ context }) => ({
              currentSnapshot:
                context.savedEventsFromLastMain[
                  context.savedEventsFromLastMain.length - 1
                ],
              replayIndex: context.savedEventsFromLastMain.length - 1,
            })),
          ],
        },
      },
    },
  },
});

export const machine = replaySnapshotMachine;
// export const machine = countMachine;
const addEvent = async (event: InspectionEvent) => {
  await localStorage.setItem('lastEvent', JSON.stringify(event));
  const foo = await localStorage.getItem('lastEvent');
  console.log({ foo });
};

export const useOurActor = () => {
  const [loggedEvents, setLoggedEvents] = React.useState<InspectionEvent[]>([]);
  useEffect(() => {
    return () => {
      // lj(loggedEvents);
    };
  }, [loggedEvents]);

  const [snapshot, send, actor] = useActor(machine, {
    inspect: async (inspectionEvent) => {
      if (inspectionEvent.type === '@xstate.snapshot') {
        addEvent(inspectionEvent);
        // setLoggedEvents((eventsDraft) => eventsDraft.concat(inspectionEvent));
      }
    },
  });

  const events = snapshot.nextEvents.map((e) => ({
    type: e,
    disabled: !snapshot.can({ type: e }),
  }));

  return {
    snapshot,
    context: {
      count:
        // yay.js
        snapshot.context.count === 0
          ? 0
          : snapshot.context.count ||
            snapshot.context.currentSnapshot?.context?.count,

      replayIndex: snapshot.context.replayIndex,
      currentSnapshot: snapshot.context.currentSnapshot,
    },
    events,
    send,
  };
};
