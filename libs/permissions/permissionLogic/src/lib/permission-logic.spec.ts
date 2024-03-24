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
  requestBluetoothPermission: () => Promise<PermissionStatus>;
  requestMicrophonePermission: () => Promise<PermissionStatus>;
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
  requestBluetoothPermission: () => {
    return new Promise((resolve) => resolve(PermissionStatuses.granted));
  },
  requestMicrophonePermission: () => {
    return new Promise((resolve) => resolve(PermissionStatuses.granted));
  },
} as const;

type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    };

describe('permission requester and checker machine', () => {
  it('should check permission when triggered', async () => {
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
    let result: any;
    const spy = (
      something: /* TODO: change type to whatever an event is in xstate*/ any
    ) => {
      result = something;
    };

    const parentMachine = setup({
      types: {} as { events: ParentEvent },
      actors: {
        permissionCheckerAndRequesterMachine,
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
        src: 'permissionCheckerAndRequesterMachine',
        input: ({ self }) => ({ parent: self }),
      },
    });

    const actorRef = createActor(parentMachine).start();
    actorRef.send({ type: 'triggerPermissionCheck' });

    await waitFor(
      actorRef,
      (state) => state.children.someFooMachine?.getSnapshot().value === 'idle',
      { timeout: 0 }
    );

    expect(result).not.toBeNull();
    expect(result.event).toStrictEqual({
      type: 'allPermissionsChecked',
      statuses: {
        [Permissions.bluetooth]: PermissionStatuses.denied,
        [Permissions.microphone]: PermissionStatuses.denied,
      },
    });
  });

  describe('requesting permissions', () => {
    it('should request permission when triggered', async () => {
      const permissionActor = createActor(
        permissionCheckerAndRequesterMachine,
        { input: { parent: undefined } }
      ).start();
      const permission: Permission = Permissions.bluetooth;

      expect(permissionActor.getSnapshot().context.statuses[permission]).toBe(
        PermissionStatuses.unasked
      );

      permissionActor.send({
        type: 'triggerPermissionRequest',
        permission,
      });

      await waitFor(permissionActor, (state) => state.value === 'idle');

      expect(permissionActor.getSnapshot().value).toBe('idle');
      expect(permissionActor.getSnapshot().context.statuses[permission]).toBe(
        PermissionStatuses.granted
      );
    });

    it('should report permission to parent after a request', async () => {
      let result: any;
      const spy = (
        something: /* TODO: change type to whatever an event is in xstate*/ any
      ) => {
        result = something;
      };

      const parentMachine = setup({
        types: {} as { events: ParentEvent },
        actors: {
          permissionCheckerAndRequesterMachine,
        },
      }).createMachine({
        on: {
          permissionRequested: {
            actions: spy,
          },
          triggerPermissionRequest: {
            actions: [
              sendTo('someFooMachine', {
                type: 'triggerPermissionRequest',
                permission: Permissions.bluetooth,
              }),
            ],
          },
        },
        invoke: {
          id: 'someFooMachine',
          src: 'permissionCheckerAndRequesterMachine',
          input: ({ self }) => ({ parent: self }),
        },
      });

      const actorRef = createActor(parentMachine).start();
      actorRef.send({
        type: 'triggerPermissionRequest',
        permission: Permissions.bluetooth,
      });

      await waitFor(
        actorRef,
        (state) =>
          state.children.someFooMachine?.getSnapshot().value === 'idle',
        { timeout: 0 }
      );

      expect(result).not.toBeNull();
      expect(result.event).toStrictEqual({
        type: 'permissionRequested',
        status: PermissionStatuses.granted,
        permission: Permissions.bluetooth,
      });
    });
  });
});

type ParentEvent =
  | {
      type: 'allPermissionsChecked';
      statuses: PermissionStatusMapType;
    }
  | { type: 'triggerPermissionRequest'; permission: Permission }
  | {
      type: 'permissionRequested';
      status: PermissionStatus;
      permission: Permission;
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

      return result;
    }),

    requestPermission: fromPromise(
      async ({
        input: { permission },
      }: {
        input: { permission: Permission };
      }): Promise<{
        permission: Permission;
        status: PermissionStatus;
      }> => {
        let status: undefined | PermissionStatus = undefined;

        switch (permission) {
          case Permissions.bluetooth:
            status =
              await unimplementedPermissionMachineActions.requestBluetoothPermission();

          case Permissions.microphone:
            status =
              await unimplementedPermissionMachineActions.requestMicrophonePermission();
        }

        console.log(JSON.stringify({ permission, status }, null, 2));

        return { status, permission };
      }
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAFwCdcoZ6AFMe1XWWXAe3wBhbGEwBrANoAGALqJQABz69a-fPJAAPRAFoArAHYAjCUNSDFgEx6AzDYAsRowBoQAT102DATlOXL9gBsNgAcIUaBRnaBAL4xrmhYeISk5FR0jMwc7JzcvAIASmAAjgCucLTSckggSipqGtoI+gYhJJYGod7WNoH2BvZ6rh4Ilt6BJFL9Ut5W3VI2tnEJGDgExCT0JeWwqvhQOVw8atQQAmBk+ABufGIXiWspm9sVBAccR-n4CAQ3mOiqARVKoaOq4QHqGpNHRtIz2ewhKROKSWEI2GZOYaIJwTKQhAyBbx6QJo1F6ezeZYgB7JDY4URiN6HPJqWCnc6XG53Eg09akeniJkfFkCWA-a58f4Q4GyUHKcENKG6KIkbxhPS2AkDFHebxY5qomyqjoLYmBc32KSxKn4PgQOAaXkpOX1ASNXSBSwTDpdHp9AZDdy6WxtFFBMa2NWhSxUp0bNJgF0Kt1K5p6JEkRZOAzWfpeEKBkb6eyZyxGWbeFFWr02WOrWmkLZlV77ZnHFOKeUQ90GkzmqZe80k4JGAL69GWEhoil6CJw8v2OtJPkkAWM1vC9v4eA1MHd1M6DqmKZGHx2OGLMv6nSDKR+IJ4vFGPQda1xIA */
  context: ({ input }) => ({
    parent: input.parent,
    statuses: InitialPermissionStatusMap,
  }),

  initial: 'idle',

  states: {
    idle: {
      on: {
        triggerPermissionCheck: { target: 'checkingPermissions' },
        triggerPermissionRequest: { target: 'requestingPermission' },
      },
    },

    requestingPermission: {
      invoke: {
        src: 'requestPermission',
        // @ts-expect-error TODO how do I get this type?
        input: ({ context, event }) => ({ permission: event.permission }),
        onDone: {
          target: 'idle',
          actions: [
            assign({
              statuses: ({ context, event }) => {
                console.log(JSON.stringify(event, null, 2));
                return {
                  ...context.statuses,
                  [event.output.permission]: event.output.status,
                };
              },
            }),

            {
              type: 'checkedSendParent',
              params({ event }) {
                console.log(JSON.stringify(event, null, 2));

                return {
                  type: 'permissionRequested',
                  status: event.output.status,
                  permission: event.output.permission,
                };
              },
            },
          ],
        },
      },
    },

    checkingPermissions: {
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
