// permissionMonitoringMachine.test.ts

describe('Permission Monitoring Machine', () => {
  it('should start in application foregrounded state', () => {
    const permissionMonitoringActor = createActor(permissionMonitoringMachine);
    permissionMonitoringActor.start();

    expect(permissionMonitoringActor.getSnapshot().value).toEqual({
      applicationLifecycle: 'application is in foreground',
      permissionChecking: {},
    });
  });

  it.skip('should check permissions once invoked', async () => {
    const permissionMonitoringActor = createActor(permissionMonitoringMachine);
    const initialPermissionMap: PermissionStatusMapType = {
      bluetooth: 'unasked',
      microphone: 'unasked',
    };
    const expectedFinalPermissionMap: PermissionStatusMapType = {
      bluetooth: 'denied',
      microphone: 'denied',
    };

    expect(permissionMonitoringActor.getSnapshot().context).toStrictEqual({
      permissionStatuses: initialPermissionMap,
    });

    permissionMonitoringActor.start();

    await waitFor(
      permissionMonitoringActor,
      (state) => {
        console.log(state.context.permissionStatuses);
        state.context.permissionStatuses;
        return (
          state.context.permissionStatuses.bluetooth === 'denied' &&
          state.context.permissionStatuses.microphone === 'denied'
        );
      },
      { timeout: 100 }
    );

    // permissionMonitoringActor.getSnapshot().context;

    // expect(permissionMonitoringActor.getSnapshot().context).toStrictEqual({
    //   permissionStatuses: expectedFinalPermissionMap,
    // });
  });

  it.skip('should request permission when asked to do so', async () => {
    const permissionMonitoringActor = createActor(permissionMonitoringMachine);
    permissionMonitoringActor.start();

    await waitFor(
      permissionMonitoringActor,
      (state) => {
        return (
          state.context.permissionStatuses.bluetooth ===
            PermissionStatuses.denied &&
          state.context.permissionStatuses.microphone ===
            PermissionStatuses.denied
        );
      },
      {
        timeout: /* speeds up tests, no need to wait any real amount of time, just a tick */ 0,
      }
    );

    permissionMonitoringActor.send({
      type: 'triggerPermissionRequest',
      permission: Permissions.microphone,
    });
  });
});

import {
  assign,
  createActor,
  fromCallback,
  sendParent,
  sendTo,
  setup,
  waitFor,
  raise,
} from 'xstate';

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
export type PermissionStatus =
  (typeof PermissionStatuses)[keyof typeof PermissionStatuses];

type PermissionStatusMapType = Record<Permission, PermissionStatus>;
const PermissionStatusMap: PermissionStatusMapType = {
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

const ApplicationLifecycleEvents = {
  applicationForegrounded: 'applicationForegrounded',
  applicationBackgrounded: 'applicationBackgrounded',
} as const;

type ApplicationLifecycleEvent =
  (typeof ApplicationLifecycleEvents)[keyof typeof ApplicationLifecycleEvents];

interface PermissionMachineActions {
  checkPermission: () => Promise<PermissionStatus>;
  requestPermission: () => Promise<PermissionStatus>;
}

const unimplementedPermissionMachineActions: PermissionMachineActions = {
  checkPermission: () => {
    console.log('checkPermission');
    return new Promise((resolve) => resolve(PermissionStatuses.denied));

    throw new Error('unimplemented');
  },
  requestPermission: () => {
    return new Promise((resolve) => resolve(PermissionStatuses.denied));
    throw new Error('unimplemented');
  },
} as const;

type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | { type: 'triggerPermissionRequest'; permission: Permission };

const bluetoothPermissionMachine = setup({
  types: {
    input: {} as { permission: Permission },
    events: {} as PermissionMachineEvents,
  },
  actions: {
    // checkPermission: unimplementedPermissionMachineActions.checkPermission,
    checkPermission: ({ context, event }) => {
      console.log('checkPermission', { event });

      sendParent({
        type: 'permissionChecked',
        permission: Permissions.bluetooth,
        status: PermissionStatuses.denied,
      });
    },
    requestPermission: unimplementedPermissionMachineActions.requestPermission,
  },
}).createMachine({
  id: 'bluetoothPermissionActor',
  on: {
    triggerPermissionCheck: {
      actions: [
        'checkPermission',
        () => console.log('checkPermission-----------'),
      ],
    },
    triggerPermissionRequest: {
      actions: 'requestPermission',
    },
  },
});

// can i come bck from the background and cache the permission check
// head honcho
const permissionMonitoringMachine = setup({
  types: {
    context: {} as PermissionMonitoringMachineContext,
    events: {} as PermissionMonitoringMachineEvents,
  },
  actions: {
    triggerPermissionCheck: sendTo('bluetoothPermissionActor', {
      type: 'triggerPermissionCheck',
      permission: Permissions.bluetooth,
    }),
    // triggerPermissionRequest: (_, params: { permission: Permission }) =>
    //   sendTo('permissionRequestActor', {
    //     type: 'requestPermission',
    //     permission: params.permission,
    //   }),
  },
  actors: {
    subscribeToApplicationLifecycleEvents: fromCallback(
      ({ sendBack, receive }) => {
        // ...
        // i have to have a default implementation here... what should it be?
        // I'm leaning towards unimplemented to avoid confusion
        /*
         can't "forward" input to child actor...

         input.subscribeToApplicationLifecycleEvents((event) => {
         if (event === 'applicationForegrounded') {
         sendBack({ type: 'applicationForegrounded' });
         } else if (event === 'applicationBackgrounded') {
         sendBack({ type: 'applicationBackgrounded' });
         }
         });
         */
      }
    ),
    bluetoothPermissionActor: bluetoothPermissionMachine,

    microphonePermissionActor: fromCallback(({ sendBack, receive }) => {
      const checkPermission = (): Promise<PermissionStatus> => {
        return Promise.resolve(PermissionStatuses.granted);
      };

      const requestPermission = (): Promise<PermissionStatus> => {
        return Promise.resolve(PermissionStatuses.granted);
      };

      receive(async (event) => {
        if (event.type === 'checkPermissions') {
          const result = await checkPermission();

          sendBack({
            type: 'permissionChecked',
            permission: Permissions.microphone,
            status: result,
          });
        } else if (event.type === 'requestPermission') {
          // const result = await requestPermission();
          // sendBack({
          //   type: 'permissionChecked',
          //   permission: Permissions.bluetooth,
          //   status: result,
          // });
        }
      });
    }),
  },
}).createMachine({
  type: 'parallel',
  context: { permissionStatuses: PermissionStatusMap },
  states: {
    applicationLifecycle: {
      initial: ApplicationLifecycleStates.applicationInForeground,
      states: {
        [ApplicationLifecycleStates.applicationInForeground]: {
          entry: [raise({ type: 'triggerPermissionCheck' })],
          on: {
            [ApplicationLifecycleEvents.applicationBackgrounded]: {
              target: ApplicationLifecycleStates.applicationInBackground,
            },
          },
        },
        [ApplicationLifecycleStates.applicationInBackground]: {
          on: {
            [ApplicationLifecycleEvents.applicationForegrounded]: {
              target: ApplicationLifecycleStates.applicationInForeground,
            },
          },
        },
      },
    },
    permissionChecking: {
      invoke: {
        id: 'bluetoothPermissionActor',
        src: bluetoothPermissionMachine,
      },
      on: {
        checkPermissions: {
          actions: [
            sendTo('bluetoothPermissionActor', {
              type: 'checkPermissions',
            }),
            sendTo('microphonePermissionActor', {
              type: 'checkPermissions',
            }),
          ],
        },
        permissionChecked: {
          actions: [
            assign({
              permissionStatuses: ({ context, event }) => ({
                ...context.permissionStatuses,
                [event.permission]: event.status,
              }),
            }),
          ],
        },
      },
    },
  },
  invoke: [
    {
      src: 'subscribeToApplicationLifecycleEvents',
      id: 'applicationLifecycleEventsSubscriber',
    },
    {
      id: 'microphonePermissionActor',
      src: 'microphonePermissionActor',
    },
  ],
});
