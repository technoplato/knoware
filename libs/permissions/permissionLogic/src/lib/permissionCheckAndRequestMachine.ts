import {
  ActorRef,
  assign,
  enqueueActions,
  fromPromise,
  log,
  setup,
  Snapshot,
} from 'xstate';
import { unimplementedPermissionMachineActions } from './permission.actions';
import { InitialPermissionStatusMap } from './permission.fixtures';
import {
  Permission,
  PermissionMachineEvents,
  PermissionMonitoringMachineEvents,
  Permissions,
  PermissionStatus,
  PermissionStatusMapType,
} from './permission.types';

export const permissionCheckerAndRequesterMachine = setup({
  types: {
    context: {} as {
      parent?: ActorRef<Snapshot<unknown>, PermissionMonitoringMachineEvents>;
      statuses: PermissionStatusMapType;
    },
    events: {} as PermissionMachineEvents,
    input: {} as {
      parent?: ActorRef<Snapshot<unknown>, PermissionMonitoringMachineEvents>;
    },
  },

  actions: {
    checkedSendParent: enqueueActions(
      ({ context, enqueue }, event: PermissionMonitoringMachineEvents) => {
        if (!context.parent) {
          console.log(
            'WARN: an attempt to send an event to a non-existent parent'
          );
          return;
        }

        enqueue.sendTo(context.parent, event);
      }
    ),

    savePermissionRequestOutput: assign({
      statuses: ({ context, event }) => {
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
  },

  actors: {
    checkAllPermissions: fromPromise(async ({ input, self, system }) => {
      const result =
        // TODO how can i make this implementation more injectable and still ergnomic
        await unimplementedPermissionMachineActions.checkAllPermissions();
      console.log({ result });

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
            break;

          case Permissions.microphone:
            status =
              // TODO how can i make this implementation more injectable and still ergnomic
              await unimplementedPermissionMachineActions.requestMicrophonePermission();
            break;
        }

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
        triggerPermissionCheck: {
          target: 'checkingPermissions',
          actions: [log('child triggerPermissionCheck')],
        },
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
                return {
                  type: 'permissionRequestCompleted',
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
        onError: {
          actions: log('an error occurred checking permissions'),
        },
        onDone: {
          target: 'idle',
          actions: [
            log('child on done checkingPermissions'),
            'savePermissionCheckResult',

            // This is causing the typescript erro in onDone, but not sure why
            {
              type: 'checkedSendParent',
              params({ event }) {
                return {
                  type: 'allPermissionsChecked',
                  statuses: event.output as PermissionStatusMapType,
                };
              },
            },
          ],
        },
      },
    },
  },
});
