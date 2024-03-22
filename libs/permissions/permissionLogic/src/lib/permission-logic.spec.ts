// permissionMonitoringMachine.test.ts
export const Permissions = {
  bluetooth: 'bluetooth',
  microphone: 'microphone',
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];
export const PermissionStatuses = {
  unasked: 'unasked',
  granted: 'granted',
  denied: 'denied',
  revoked: 'revoked',
  blocked: 'blocked',
} as const;
const ApplicationLifecycleEvents = {
  applicationForegrounded: 'applicationForegrounded',
  applicationBackgrounded: 'applicationBackgrounded',
} as const;

type ApplicationLifecycleEvent =
  (typeof ApplicationLifecycleEvents)[keyof typeof ApplicationLifecycleEvents];

interface PermissionMachineActions {
  checkAllPermissions: () => Promise<PermissionStatusMapType>;
  requestPermission: () => Promise<PermissionStatus>;
}
export type PermissionStatus =
  (typeof PermissionStatuses)[keyof typeof PermissionStatuses];

type PermissionStatusMapType = Record<Permission, PermissionStatus>;
const InitialPermissionStatusMap: PermissionStatusMapType = {
  [Permissions.bluetooth]: PermissionStatuses.unasked,
  [Permissions.microphone]: PermissionStatuses.unasked,
} as const;

const ApplicationLifecycleStates = {
  applicationInForeground: 'application is in foreground',
  applicationInBackground: 'application is in background',
} as const;

const PermissionCheckingStates = {
  idle: 'idle',
  checking: 'checking',
} as const;

type PermissionMonitoringMachineContext = {
  permissionStatuses: PermissionStatusMapType;
  listener;
};
type PermissionMonitoringMachineEvents =
  | { type: 'checkPermissions' }
  | {
      type: 'permissionChecked';
      permission: Permission;
      status: PermissionStatus;
    }
  | {
      type: 'triggerPermissionCheck';
      permission: Permission;
    }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    }
  | { type: 'applicationForegrounded' }
  | { type: 'applicationBackgrounded' };

import {
  ActorRef,
  Snapshot,
  assign,
  createActor,
  enqueueActions,
  fromPromise,
  log,
  sendTo,
  setup,
  waitFor,
} from 'xstate';

const unimplementedPermissionMachineActions: PermissionMachineActions = {
  checkAllPermissions: () => {
    return new Promise((resolve) =>
      resolve({
        [Permissions.bluetooth]: PermissionStatuses.denied,
        [Permissions.microphone]: PermissionStatuses.denied,
      })
    );
  },
  requestPermission: () => {
    return new Promise((resolve) => resolve(PermissionStatuses.denied));
    throw new Error('unimplemented');
  },
} as const;

type PermissionMachineEvents = { type: 'triggerPermissionCheck' };

describe('bluetooth permission machine', () => {
  it('should request permission when triggered', async () => {
    const bluetoothPermissionActor = createActor(
      permissionCheckerAndRequesterMachine,
      { input: { parent: undefined } }
    ).start();

    bluetoothPermissionActor.send({ type: 'triggerPermissionCheck' });

    await waitFor(bluetoothPermissionActor, (state) => state.value === 'idle', {
      timeout: 0,
    });

    expect(bluetoothPermissionActor.getSnapshot().value).toBe('idle');
    expect(bluetoothPermissionActor.getSnapshot().context.statuses).toEqual({
      [Permissions.bluetooth]: PermissionStatuses.denied,
      [Permissions.microphone]: PermissionStatuses.denied,
    });
  });

  it('should report permission to parent after a check', async () => {
    const spy = jest.fn();

    const fooMachine = setup({
      types: {
        context: {} as {
          parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
          statuses: PermissionStatusMapType;
        },
        events: {} as PermissionMachineEvents,
        input: {} as {
          parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
        },
      },

      actions: {
        checkedSendParent: enqueueActions(
          ({ context, enqueue }, event: ParentEvent) => {
            if (!context.parent) {
              console.log(
                'WARN: an attempt to send an event to a non-existent parent'
              );
              return;
            }

            console.log('sending event to parent', event);
            console.log(JSON.stringify(event.type, null, 2));

            enqueue.sendTo(context.parent, event);
          }
        ),
      },

      actors: {
        checkAllPermissions: fromPromise(async () => {
          const result =
            await unimplementedPermissionMachineActions.checkAllPermissions();

          // return InitialPermissionStatusMap;
          return result;
        }),
      },
    }).createMachine({
      id: 'bluetoothPermissionActor',
      context: ({ input }) => ({
        parent: input.parent,
        statuses: InitialPermissionStatusMap,
      }),

      initial: 'idle',

      states: {
        idle: {
          on: {
            triggerPermissionCheck: { target: 'checkingPermission' },
          },
        },

        checkingPermission: {
          on: {
            triggerPermissionCheck: {
              actions: [
                log('triggerPermissionCheck within checkingPermission'),
              ],
            },
          },
          invoke: {
            src: 'checkAllPermissions',
            onDone: {
              target: 'idle',
              actions: [
                assign({
                  statuses: ({ event }) => event.output,
                }),

                {
                  type: 'checkedSendParent',
                  params({ event }) {
                    console.log(JSON.stringify(event, null, 2));

                    return {
                      type: 'allPermissionsChecked',
                      statuses: event.output,
                    };
                  },
                },
              ],
            },
          },
        },
      },
    });

    const parentMachine = setup({
      types: {} as { events: ParentEvent },
      actors: {
        fooMachine,
      },
    }).createMachine({
      on: {
        allPermissionsChecked: {
          actions: spy,
        },
        triggerPermissionCheck: {
          actions: [
            sendTo('someFooMachine', {
              type: 'triggerPermissionCheck',
            }),
          ],
        },
      },
      invoke: {
        id: 'someFooMachine',
        src: 'fooMachine',
        input: ({ self }) => ({ parent: self }),
      },
      entry: [
        sendTo('someFooMachine', {
          type: 'triggerPermissionCheck',
        }),
      ],
    });

    const actorRef = createActor(parentMachine).start();

    await waitFor(
      actorRef,
      (state) => state.children.someFooMachine?.getSnapshot().value === 'idle',
      { timeout: 0 }
    );

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

type ParentEvent =
  | {
      type: 'allPermissionsChecked';
      statuses: PermissionStatusMapType;
    }
  | { type: 'FOO' }
  | { type: 'triggerPermissionCheck' };

const permissionCheckerAndRequesterMachine = setup({
  types: {
    context: {} as {
      parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
      statuses: PermissionStatusMapType;
    },
    events: {} as PermissionMachineEvents,
    input: {} as {
      parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
    },
  },

  actions: {
    checkedSendParent: enqueueActions(
      ({ context, enqueue }, event: ParentEvent) => {
        if (!context.parent) {
          console.log(
            'WARN: an attempt to send an event to a non-existent parent'
          );
          return;
        }

        console.log('sending event to parent', event);

        enqueue.sendTo(context.parent, event);
      }
    ),
  },

  actors: {
    checkAllPermissions: fromPromise(async () => {
      const result =
        await unimplementedPermissionMachineActions.checkAllPermissions();

      // return InitialPermissionStatusMap;
      return result;
    }),
  },
}).createMachine({
  id: 'bluetoothPermissionActor',
  context: ({ input }) => ({
    parent: input.parent,
    statuses: InitialPermissionStatusMap,
  }),

  initial: 'idle',

  states: {
    idle: {
      on: {
        triggerPermissionCheck: { target: 'checkingPermission' },
      },
    },

    checkingPermission: {
      on: {
        triggerPermissionCheck: {
          actions: [log('triggerPermissionCheck within checkingPermission')],
        },
      },
      invoke: {
        src: 'checkAllPermissions',
        onDone: {
          target: 'idle',
          actions: [
            // {
            //   type: 'checkedSendParent',
            //   params({ context, event }) {
            //     return { type: 'FOO' };
            //   },
            // },

            assign({
              statuses: ({ event }) => event.output,
            }),

            {
              type: 'checkedSendParent',
              params({ event }) {
                console.log(JSON.stringify(event, null, 2));

                return {
                  type: 'allPermissionsChecked',
                  statuses: event.output,
                };
              },
            },
          ],
        },
      },
    },
  },
});
