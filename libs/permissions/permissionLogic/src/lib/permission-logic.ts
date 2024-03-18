import { fromCallback, raise, setup } from 'xstate';

export const Permissions = {
  bluetooth: 'bluetooth',
  microphone: 'microphone',
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];
export const PermissionStatuses = {
  unasked: 'unasked',
  granted: 'granted',
  denied: 'denied',
  blocked: 'blocked',
} as const;
export type PermissionStatus =
  (typeof PermissionStatuses)[keyof typeof PermissionStatuses];

type PermissionStatusMapType = Record<Permission, PermissionStatus>;
const PermissionStatusMap: PermissionStatusMapType = {
  [Permissions.bluetooth]: PermissionStatuses.unasked,
  [Permissions.microphone]: PermissionStatuses.unasked,
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
    // decrement: assign({
    //   count: ({ context }) => context.count - 1,
    // }),
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

        receive(async (event) => {
          if (event.type === 'checkPermissions') {
            const result = await checkPermission();
            sendBack({
              type: 'permissionChecked',
              permission: Permissions.bluetooth,
              status: result,
            });
          } else if (event.type === 'requestPermission') {
            const result = await requestPermission();
            sendBack({
              type: 'permissionChecked',
              permission: Permissions.bluetooth,
              status: result,
            });
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
  invoke: {
    src: 'subscribeToApplicationLifecycleEvents',
    id: 'applicationLifecycleEventsSubscriber',
    input: ({ context }) => input.subscribeToApplicationLifecycleEvents,
  },
  context: { permissionStatuses: PermissionStatusMap },
  on: {
    applicationForegrounded: { actions: 'triggerPermissionCheck' },
    applicationBackgrounded: {},
  },
});
