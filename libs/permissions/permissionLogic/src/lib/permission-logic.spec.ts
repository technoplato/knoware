// permissionMonitoringMachine.test.ts

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

import { unimplementedPermissionMachineActions } from './permission.actions';
import {
  InitialPermissionStatusMap,
  Permission,
  PermissionMachineEvents,
  PermissionStatus,
  PermissionStatusMapType,
  PermissionStatuses,
  Permissions,
} from './permission.types';

describe('permission requester and checker machine', () => {
  it('should check permission when triggered', async () => {
    const bluetoothPermissionActor = createActor(
      permissionCheckerAndRequesterMachine,
      { input: { parent: undefined } }
    ).start();

    bluetoothPermissionActor.send({ type: 'triggerPermissionCheck' });

    await waitFor(bluetoothPermissionActor, (state) => state.value === 'idle');

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
      (state) => state.children.someFooMachine?.getSnapshot().value === 'idle'
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
        (state) => state.children.someFooMachine?.getSnapshot().value === 'idle'
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

export type ParentEvent =
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

    savePermissionRequestOutput: assign({
      statuses: ({ context, event }) => {
        console.log(JSON.stringify(event, null, 2));
        return {
          ...context.statuses,
          // @ts-expect-error TODO how do I type these actions?
          [event.output.permission]: event.output.status,
        };
      },
    }),

    savePermissionCheckResult: assign({
      // @ts-expect-error TODO how do I type these actions?
      statuses: ({ event }) => event.output,
    }),

    /**
     * I tried putting reportPermissionRequestResult as an action, but it requied
     * use of checkedSendParent and ran into this error when attempting to use that
     *
     * in onDone, but it didn't work
     *
     * error: Type '"checkedSendParent"' is not assignable to type '"triggerPermissionRequest"'.ts(2322)
     */
    // reportPermissionRequestResult: raise({
    //   type: 'checkedSendParent',
    //   params({ event }) {
    //     console.log(JSON.stringify(event, null, 2));

    //     return {
    //       type: 'permissionRequested',
    //       status: event.output.status,
    //       permission: event.output.permission,
    //     };
    //   },
    // }),
  },

  actors: {
    checkAllPermissions: fromPromise(async () => {
      const result =
        // TODO how can i make this implementation more injectable and still ergnomic
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
              // TODO how can i make this implementation more injectable and still ergnomic
              await unimplementedPermissionMachineActions.requestBluetoothPermission();

          case Permissions.microphone:
            status =
              // TODO how can i make this implementation more injectable and still ergnomic
              await unimplementedPermissionMachineActions.requestMicrophonePermission();
        }

        console.log(JSON.stringify({ permission, status }, null, 2));

        return { status, permission };
      }
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAFwCdcoZ6AFMe1XWWXAe3wBhbGEwBrANoAGALqJQABz69a-fPJAAPRAFoArAHYAjCUNSDANgN6AzBYAsB+3oA0IAJ66jtkvaM2pAA5gwKMLfzsAX0i3NCw8QlJyKjpGZg52Tm5eAQAlMABHAFc4Wmk5JBAlFTUNbQR9A0CSACYDG0CAThbbBydXD0QbTpIwqRsmzoNu8dto2IwcAmISekKS2FV8KEyuHjVqCAEwMnwANz4xE7ilxNX10oIdjj2c-AQCC8x0VQFy8o01Vwv3UlXqOmaRns9kCUiMRikLUCAU68LcngQ8IsJCClk6egsyKRensnXmIBuCRWOFEYieu2yalgh2OpwuVxIlOWpBp4npL0ZAlgH3OfG+IP+skBymBtTBXhsJE6wT0tksTkRnU66N0SMV3QMswsxocUgs0RiIHwfAgcA0XMS0pqAjqugsLWxbQ63V6jmcOoatmaiPsFiCQW8bXNlodK2SYCdspd8sDcJINj08IMPUcE0CAwx+ns6ZaRimnURZo9NnJsdIa2Kj22DP2ycUMpBroapZIxqk9g9JsCFhsRha9gDARaJGRpMz4T8nXstcWVJ5Ij5zYFrfw8EqQM7KZ0bVM-aM0xso-sGdLAZ0zikpnHYdhoT0UYtkSAA */
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
            'savePermissionRequestOutput',
            {
              /**
               * I tried putting this action in the actions in setup as reportPermissionRequestResult
               * as an action, but it requied
               * use of checkedSendParent and ran into this error when attempting to use that
               *
               * in onDone, but it didn't work
               *
               * error: Type '"checkedSendParent"' is not assignable to type '"triggerPermissionRequest"'.ts(2322)
               */
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
            'savePermissionCheckResult',

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
