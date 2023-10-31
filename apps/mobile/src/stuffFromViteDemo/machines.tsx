import { useActor } from '@xstate/react';
import { assign, createMachine, fromPromise } from 'xstate';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InspectionEvent } from 'xstate/dist/declarations/src/system';
// import { savedEventsFromLastMain } from './sideEffects/logsFromMainRun';
import { SlimSnapshot } from './types';

export const j = (s) => JSON.stringify(s, null, 2);
export const lj = (o) => {
  console.log(j(o));
};

const increment = ({ context }) => context.count + 1;
const decrement = ({ context }) => context.count - 1;

const hasMoreReplayableActions = ({ context }) => {
  lj({
    i: context.replayIndex,
    savedEventsFromLastMainLength: context.savedEventsFromLastMain.length,
  });
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

const putEventsOnDiet = (events: InspectionEvent[]): Array<SlimSnapshot> => {
  const slimEvents: Array<SlimSnapshot> = events.map((event, idx) => {
    const previous =
      idx > 0 ? convertInspectEventToSlimEvent(events[idx - 1]) : undefined;
    const next =
      idx < events.length - 1
        ? convertInspectEventToSlimEvent(events[idx + 1])
        : undefined;
    const slimEvent = convertInspectEventToSlimEvent(event);

    return {
      ...slimEvent,
      previous,
      next,
    };
  });
  return slimEvents;
};

const replaySnapshotMachine = createMachine(
  {
    initial: 'loading',

    context: {
      replayIndex: StartingIndex,
      currentSnapshot: undefined,
      savedEventsFromLastMain: [],
    },
    states: {
      loading: {
        invoke: [
          {
            src: 'loadLogs',
            onDone: {
              target: 'active',
              // actions: (onDoneSomething) => {
              //   lj({ onDoneSomething });
              //   return assign((onDoneAssignSomething) => ({
              //     foo: 'onDoneSomething',
              //   }));
              // },
              actions: 'assignSavedEventsFromLastSession',
            },

            onError: 'error',
          },
        ],
      },
      evaluate: {
        entry: (thing) => {
          // k({ thing });
        },
      },

      error: {
        entry: (stuff) => {
          console.log(stuff);
        },
      },
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
                replayIndex: context.savedEventsFromLastMain.length,
              })),
            ],
          },
        },
      },
    },
  },
  {
    actions: {
      assignSavedEventsFromLastSession: assign((stuff) => {
        const savedEventsFromLastMain = putEventsOnDiet(stuff.event.output);
        const currentSnapshot = savedEventsFromLastMain[0];

        return {
          savedEventsFromLastMain,
          currentSnapshot,
          replayIndex: 0,
        };
      }),
    },
    actors: {
      loadLogs: fromPromise(async () => {
        const savedLogs = await logStorage.read();
        return savedLogs;
      }),
    },
  }
);

const doingReplay = true;
export const machine = doingReplay ? replaySnapshotMachine : countMachine;

const key = 'latestEvents';
export const useOurActor = () => {
  const [snapshot, send, actor] = useActor(machine, {
    inspect: async (inspectionEvent: InspectionEvent) => {
      if (doingReplay) {
        return;
      }
      if (inspectionEvent.type === '@xstate.snapshot') {
        await logStorage.append(inspectionEvent);
      }
    },
  });

  const events = snapshot.nextEvents.map((e) => ({
    type: e,
    disabled: !snapshot.can({ type: e }),
  }));

  return {
    snapshot,
    clearEvents: () => storage.clear(key),
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

const storage = {
  save: async function (key: string, value: string): Promise<void> {
    AsyncStorage.setItem(key, value);
  },
  get: async function (key: string, fallback: string): Promise<string> {
    const blobStr = await AsyncStorage.getItem(key);
    if (!blobStr) {
      return fallback;
    }

    return blobStr;
  },
  clear: async function (key: string) {
    return AsyncStorage.removeItem(key);
  },
};

const logKey = 'latestEvents';
const logStorage = {
  append: async function (inspectionEvent: InspectionEvent) {
    const previousLogs = JSON.parse(
      await storage.get(key, '[]')
    ) as Array<InspectionEvent>;

    const newValue = [...previousLogs, inspectionEvent];

    await storage.save(key, JSON.stringify(newValue));
  },
  read: async function () {
    const blobStr = await storage.get(logKey, '[]');
    // lj(blobStr);
    const logs = JSON.parse(blobStr);
    return logs;
  },
  clear: async function () {
    return storage.clear(logKey);
  },
};
