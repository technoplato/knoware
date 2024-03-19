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

  it('should check permissions once invoked', async () => {
    const permissionMonitoringActor = createActor(permissionMonitoringMachine);
    const initialPermissionMap: PermissionStatusMapType = {
      bluetooth: 'unasked',
      microphone: 'unasked',
    };
    const expectedFinalPermissionMap: PermissionStatusMapType = {
      bluetooth: 'granted',
      microphone: 'granted',
    };

    expect(permissionMonitoringActor.getSnapshot().context).toStrictEqual({
      permissionStatuses: initialPermissionMap,
    });

    permissionMonitoringActor.start();

    await waitFor(permissionMonitoringActor, (state) => {
      return (
        state.context.permissionStatuses.bluetooth === 'granted' &&
        state.context.permissionStatuses.microphone === 'granted'
      );
    });

    permissionMonitoringActor.getSnapshot().context;

    expect(permissionMonitoringActor.getSnapshot().context).toStrictEqual({
      permissionStatuses: expectedFinalPermissionMap,
    });
  });
});

import {
  assign,
  createActor,
  fromCallback,
  raise,
  sendTo,
  setup,
  waitFor,
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
};
type PermissionMonitoringMachineEvents =
  | { type: 'checkPermissions' }
  | {
      type: 'permissionChecked';
      permission: Permission;
      status: PermissionStatus;
    }
  | { type: 'applicationForegrounded' }
  | { type: 'applicationBackgrounded' };

const ApplicationLifecycleEvents = {
  applicationForegrounded: 'applicationForegrounded',
  applicationBackgrounded: 'applicationBackgrounded',
} as const;

type ApplicationLifecycleEvent =
  (typeof ApplicationLifecycleEvents)[keyof typeof ApplicationLifecycleEvents];

const permissionMonitoringMachine = setup({
  types: {
    context: {} as PermissionMonitoringMachineContext,
    events: {} as PermissionMonitoringMachineEvents,
  },
  actions: {
    triggerPermissionCheck: raise({ type: 'checkPermissions' }),
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
    bluetoothPermissionActor: fromCallback(({ sendBack, receive }) => {
      const checkPermission = (): Promise<PermissionStatus> => {
        return Promise.resolve(PermissionStatuses.granted);
      };

      const requestPermission = (): Promise<PermissionStatus> => {
        return Promise.resolve(PermissionStatuses.granted);
      };

      receive((event) => {
        if (event.type === 'checkPermissions') {
          checkPermission().then((result) => {
            sendBack({
              type: 'permissionChecked',
              permission: Permissions.bluetooth,
              status: result,
            });
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
          entry: ['triggerPermissionCheck'],
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
      id: 'bluetoothPermissionActor',
      src: 'bluetoothPermissionActor',
    },
    {
      id: 'microphonePermissionActor',
      src: 'microphonePermissionActor',
    },
  ],
});
