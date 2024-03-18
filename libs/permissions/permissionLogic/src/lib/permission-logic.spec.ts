// permissionMonitoringMachine.test.ts

describe('Permission Monitoring Machine', () => {
  it('should start in application foregrounded state', () => {
    const permissionMonitoringActor = createActor(permissionMonitoringMachine);
    permissionMonitoringActor.start();

    expect(permissionMonitoringActor.getSnapshot().value).toBe(
      'application is in foreground'
    );
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
      // console.log({ state });
      console.log(state.context.permissionStatuses);
      return (
        state.context.permissionStatuses.bluetooth === 'granted' &&
        state.context.permissionStatuses.microphone === 'granted'
      );
    });

    expect(
      permissionMonitoringActor.getSnapshot().context.permissionStatuses
        .microphone
    ).toBe('granted');
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

const PermissionMonitoringMachineStates = {
  applicationInForeground: 'application is in foreground',
  applicationInBackground: 'application is in background',
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

// type PermissionMonitoringMachineInput = {
//   subscribeToApplicationLifecycleEvents: (
//     event: ApplicationLifecycleEvent
//   ) => void;
//   checkBluetoothPermission: () => Promise<PermissionStatus>;
//   checkMicrophonePermission: () => Promise<PermissionStatus>;
//   requestBluetoothPermission: () => Promise<PermissionStatus>;
//   requestMicrophonePermission: () => Promise<PermissionStatus>;
// };

const permissionMonitoringMachine = setup({
  types: {
    // input: {} as PermissionMonitoringMachineInput,
    context: {} as PermissionMonitoringMachineContext,
    events: {} as PermissionMonitoringMachineEvents,
  },
  actions: {
    triggerPermissionCheck: raise({ type: 'checkPermissions' }),
  },
  actors: {
    subscribeToApplicationLifecycleEvents: fromCallback(
      ({ input, sendBack, receive, self, system }) => {
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
    bluetoothPermissionActor: fromCallback(
      ({ input, sendBack, receive, self, system }) => {
        const checkPermission = (): Promise<PermissionStatus> => {
          return Promise.resolve(PermissionStatuses.granted);
        };

        const requestPermission = (): Promise<PermissionStatus> => {
          return Promise.resolve(PermissionStatuses.granted);
        };

        console.log('1');
        receive((event) => {
          console.log({ event });
          if (event.type === 'checkPermissions') {
            // const result = await ();
            checkPermission().then((result) => {
              console.log({ result });

              sendBack({
                type: 'permissionChecked',
                permission: Permissions.bluetooth,
                status: result,
              });
            });
            // sendBack({
            //   type: 'permissionChecked',
            //   permission: Permissions.bluetooth,
            //   status: result
            // });
          } else if (event.type === 'requestPermission') {
            // const result = await requestPermission();
            // sendBack({
            //   type: 'permissionChecked',
            //   permission: Permissions.bluetooth,
            //   status: result
            // });
          }
        });
        // ...
        // needs to listen for 'checkPermissions' and 'requestPermission' events and then
        // return results back to parent actor
        // also needs to ensure mapping of library type -> permission status type that we recognize and respond to
      }
    ),
    microphonePermissionActor: fromCallback(
      ({ input, sendBack, receive, self, system }) => {
        const checkPermission = (): Promise<PermissionStatus> => {
          return Promise.resolve(PermissionStatuses.granted);
        };

        const requestPermission = (): Promise<PermissionStatus> => {
          return Promise.resolve(PermissionStatuses.granted);
        };

        console.log('1');
        receive((event) => {
          console.log({ event });
          if (event.type === 'checkPermissions') {
            checkPermission().then((result) => {
              sendBack({
                type: 'permissionChecked',
                permission: Permissions.microphone,
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
        // ...
        // needs to listen for 'checkPermissions' and 'requestPermission' events and then
        // return results back to parent actor
        // also needs to ensure mapping of library type -> permission status type that we recognize and respond to
      }
    ),
  },
}).createMachine({
  initial: PermissionMonitoringMachineStates.applicationInForeground,
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
  context: { permissionStatuses: PermissionStatusMap },
  on: {
    applicationForegrounded: {
      target: '.' + PermissionMonitoringMachineStates.applicationInForeground,
    },
    applicationBackgrounded: {
      target: '.' + PermissionMonitoringMachineStates.applicationInBackground,
    },
    permissionChecked: {
      actions: [
        () => {
          console.log('hi');
        },
        assign({
          permissionStatuses: ({ context, event }) => {
            console.log({ event });
            return {
              ...context.permissionStatuses,
              [event.permission]: event.status,
            };
          },
        }),
      ],
    },
  },
  states: {
    [PermissionMonitoringMachineStates.applicationInForeground]: {
      entry: [
        'triggerPermissionCheck',
        sendTo('bluetoothPermissionActor', { type: 'checkPermissions' }),
        sendTo('microphonePermissionActor', { type: 'checkPermissions' }),
      ],
    },
    [PermissionMonitoringMachineStates.applicationInBackground]: {},
  },
});
