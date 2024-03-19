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

    await waitFor(
      permissionMonitoringActor,
      (state) => {
        return (
          state.context.permissionStatuses.bluetooth === 'granted' &&
          state.context.permissionStatuses.microphone === 'granted'
        );
      },
      { timeout: 1 }
    );

    permissionMonitoringActor.getSnapshot().context;

    expect(permissionMonitoringActor.getSnapshot().context).toStrictEqual({
      permissionStatuses: expectedFinalPermissionMap,
    });
  });

  it('should request permission when asked to do so', async () => {
    const permissionMonitorWithInitialFailingMachine =
      permissionMonitoringMachine.provide({
        actors: {
          /**
           * I need a failing implementation of the permissions actors...
           * I want to find an ergonomic and simple way to do this...
           */
        },
      });
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

/**
 * Invoking actors with input
 *
   * import { createActor, setup } from 'xstate';

const feedbackMachine = setup({
  actors: {
    liveFeedback: fromPromise(({ input }: { input: { domain: string } }) => {
      return fetch(`https://${input.domain}/feedback`).then((res) =>
        res.json(),
      );
    }),
  }
}).createMachine({
  invoke: {
    src: 'liveFeedback',
    input: {
      domain: 'stately.ai',
    },
  },
});
   */
interface PermissionMachineActions {
  checkPermission: () => Promise<PermissionStatus>;
  requestPermission: () => Promise<PermissionStatus>;
}

const unimplementedPermissionMachineActions: PermissionMachineActions = {
  checkPermission: () => {
    console.log('checkPermission');
    return new Promise((resolve) => resolve(PermissionStatuses.granted));

    throw new Error('unimplemented');
  },
  requestPermission: () => {
    return new Promise((resolve) => resolve(PermissionStatuses.granted));
    throw new Error('unimplemented');
  },
} as const;

type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | { type: 'triggerPermissionRequest'; permission: Permission };

const permissionMachine = setup({
  types: {
    input: {} as { permission: Permission },
    events: {} as PermissionMachineEvents,
  },
  actions: {
    checkPermission: unimplementedPermissionMachineActions.checkPermission,
    requestPermission: unimplementedPermissionMachineActions.requestPermission,
  },
}).createMachine({
  id: 'permission',

  on: {
    triggerPermissionCheck: {
      actions: 'checkPermission',
    },
    triggerPermissionRequest: {
      actions: 'requestPermission',
    },
  },
});

const permissionMonitoringMachine = setup({
  types: {
    context: {} as PermissionMonitoringMachineContext,
    events: {} as PermissionMonitoringMachineEvents,
  },
  actions: {
    // triggerPermissionCheck: raise({ type: 'checkPermissions' }),
    // triggerPermissionRequest: sendTo('permissionRequestActor', {
    //   type: 'requestPermission',
    // }),
    triggerPermissionRequest: (_, params: { permission: Permission }) =>
      sendTo('permissionRequestActor', {
        type: 'requestPermission',
        permission: params.permission,
      }),
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
    bluetoothPermissionActor: permissionMachine,
    // bluetoothPermissionActor: fromCallback(({ sendBack, receive }) => {
    //   const checkPermission = (): Promise<PermissionStatus> => {
    //     return Promise.resolve(PermissionStatuses.granted);
    //   };

    //   const requestPermission = (
    //     permission: Permission
    //   ): Promise<PermissionStatus> => {
    //     return Promise.resolve(PermissionStatuses.granted);
    //   };

    //   receive(async (event) => {
    //     if (event.type === 'checkPermissions') {
    //       const result = await checkPermission();
    //       sendBack({
    //         type: 'permissionChecked',
    //         permission: Permissions.bluetooth,
    //         status: result,
    //       });
    //     } else if (event.type === 'requestPermission') {
    //       // const result = await requestPermission(event?.params?.permission);
    //       // sendBack({
    //       //   type: 'permissionChecked',
    //       //   permission: Permissions.bluetooth,
    //       //   status: result,
    //       // });
    //     }
    //   });
    // }),
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
          // entry: ['triggerPermissionCheck'],
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
