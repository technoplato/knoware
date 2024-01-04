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
  return context.replayIndex < context.savedEventsFromLastMain.length - 1;
};

const hasPreviousReplayableActions = ({ context }) => 0 < context.replayIndex;

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
  event: TimedInspectionEvent
): SlimSnapshot => {
  // return event as SlimSnapshot;
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    type: event.event.type,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    context: event.snapshot.context,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    timestamp: event.timestamp,
    index: event.index,
  };
};

const putEventsOnDiet = (
  events: TimedInspectionEvent[]
): Array<SlimSnapshot> => {
  const slimEvents: Array<SlimSnapshot> = events.map((event, idx) => {
    // const previous =
    //   idx > 0 ? convertInspectEventToSlimEvent(events[idx - 1]) : undefined;
    // const next =
    //   idx < events.length - 1
    //     ? convertInspectEventToSlimEvent(events[idx + 1])
    //     : undefined;
    const slimEvent = convertInspectEventToSlimEvent(event);

    return {
      ...slimEvent,
      // previous,
      // next,
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
              actions: 'assignSavedEventsFromLastSession',
            },

            onError: 'error',
          },
        ],
      },

      error: {
        entry: (stuff) => {
          console.log(stuff);
        },
      },
      active: {
        on: {
          // // Next and prev will allow user to page through savedEventsFromLastMain
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
              assign(({ context }) => {
                const decrementedIndex = context.replayIndex - 1;
                return {
                  replayIndex: decrementedIndex,
                  currentSnapshot:
                    context.savedEventsFromLastMain[decrementedIndex],
                };
              }),
              // assign({ replayIndex: decrementReplayIndex }),
              // assign(({ context }) => ({
              //   currentSnapshot:
              //     context.savedEventsFromLastMain[context.replayIndex],
              // })),
            ],
          },
          NEXT: {
            guard: hasMoreReplayableActions,
            actions: assign(({ context }) => {
              const incrementedIndex = context.replayIndex + 1;
              const incrementedSnapshot =
                context.savedEventsFromLastMain[incrementedIndex];
              return {
                replayIndex: incrementedIndex,
                currentSnapshot: incrementedSnapshot,
              };
            }),
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
        // if (inspectionEvent.event.type.startsWith('xstate.')) return;
        // if (inspectionEvent.event.type === '*') return;
        // TODO: periodic sync to firebase storage for example
        // or utilize websockets in lower envs
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await logStorage.append({ ...inspectionEvent, timestamp: new Date() });
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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore

        snapshot.context.count === 0
          ? 0
          : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            snapshot.context.count ||
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            snapshot.context.currentSnapshot?.context?.count,

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore

      replayIndex: snapshot.context.replayIndex,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore

      currentSnapshot: snapshot.context.currentSnapshot,

      numberReplayEventsTotal:
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore

        snapshot.context?.savedEventsFromLastMain?.length,
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

type TimedInspectionEvent = InspectionEvent & {
  timestamp: string;
  index: number;
};
const logKey = 'latestEvents';
const logStorage = {
  append: async function (inspectionEvent: TimedInspectionEvent) {
    const previousLogs = JSON.parse(
      await storage.get(key, '[]')
    ) as Array<TimedInspectionEvent>;

    const newValue = [
      ...previousLogs,
      { ...inspectionEvent, index: previousLogs.length },
    ];

    await storage.save(key, JSON.stringify(newValue));
  },
  read: async function (): Promise<Array<TimedInspectionEvent>> {
    const blobStr = await storage.get(logKey, '[]');
    // return [];
    const logs: Array<TimedInspectionEvent> = JSON.parse(blobStr).map(
      (event) => ({
        ...event,
        timestamp: new Date(event.timestamp),
      })
    );

    return logs
      .sort((a, b) => {
        return a.index - b.index;
      })
      .map((l) => {
        return {
          ...l,
          // format timestamp as mm:ss with padded single digit
          // like 52:07
          // or 06:01
          timestamp: `${l.timestamp
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            .getMinutes()
            .toString()
            .padStart(2, '0')}:${l.timestamp
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .getSeconds()
            .toString()
            .padStart(2, '0')}`,
        };
      });
    return logs;
  },
  clear: async function () {
    return storage.clear(logKey);
  },
};
