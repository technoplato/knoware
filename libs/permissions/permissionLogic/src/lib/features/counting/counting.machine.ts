import { assign, log, raise, sendTo, setup } from 'xstate';
import {
  Permissions,
  PermissionStatus,
  PermissionStatuses,
} from '../../permission.types';
import { permissionReportingMachine } from '../../permissionReporting/permissionReporting.machine';

export const countingMachineThatNeedsPermissionAt3 = setup({
  actors: {
    permissionReportingMachine,
  },
  types: {
    context: {} as { count: number; permissionStatus: PermissionStatus },
    events: { type: 'count.inc' },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMD2BXAdgFwJaagEFMIAFMAJwFtdZZdVNYA6NLPA5sTAQwCMANpADEbHM3zIA2gAYAuolAAHVPTyNFIAB6IA7ACYANCACeiAIwBWc8xl27AZhm6rDpw4C+H42I5ES5NS09IwsvvhQXLyCIr4SmNLmCkggKmoMmJo6CPoAHA7M1pYAbM4AnLoOLpZGpoj61sxllg7mVZbN5gYALLle3iCYqBBwmuEExGSUNHQZ8ClpuOqZKdkAtPrdzMWWuboyZeZlZd1lDsUOxmYIG1v2Mm0uus1l+vpePhg4EZOBMyFMVhfPyaRbLLL1bpXRAXZinY4nCoOMoPGTdYofEDjfxTIKzUJA9gRKL8IQQUGqJYZCEIcz6GyWXTdfQHBo7GrQnI1OEtR4daw9PoDbG-abBOaE76cCC0UmQCnpDSrRA1XLMLplYq5Rn6E7o4qchr6HmtGTWc7dbqtTEigJi-GAgAWPBIAgif3FoQVVKVoGy+gKDm6dJRuTslhkF10nIcuTVEZkbhkuU1Vt0uW6NuBPzteIBLGdrvd9vzEggQm94OVCHT23ZZv2lUeBrqCG6umKtjs+mKums7e6JUzwuzE1z-wlhfLxbzEp4yDwADcwJXqdWXMwgyHk+HI1VOS0tgm8marMdzEKvEA */
  type: 'parallel',
  id: 'countingAndPermissions',
  context: {
    count: 0,
    permissionStatus: PermissionStatuses.unasked,
  },

  entry: log('Counting machine started'),

  states: {
    counting: {
      initial: 'enabled',
      states: {
        enabled: {
          always: [
            {
              target: 'disabled',
              guard: ({ context }) => context.count >= 3,
            },
          ],
          on: {
            'count.inc': [
              {
                actions: assign({ count: ({ context }) => context.count + 1 }),
              },
            ],
          },
        },
        disabled: {
          id: 'countingDisabled',
          on: {
            'permission.granted.bluetooth': { target: 'enabled' },
            'permission.denied.bluetooth': { target: 'bluetoothDenied' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                // @ts-expect-error TODO make this type safe
                permission: Permissions.bluetooth,
              }),
            },
          },
        },
        bluetoothDenied: {
          on: {
            'permission.granted.bluetooth': { target: 'enabled' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                // @ts-expect-error TODO make this type safe
                permission: Permissions.bluetooth,
              }),
            },
          },
        },
      },
    },

    handlingPermissions: {
      on: {
        permissionWasRequested: {
          actions: [
            sendTo('permissionHandler', ({ event }) => {
              return {
                type: 'requestPermission',
                // @ts-expect-error TODO make this type safe
                permission: event.permission,
              };
            }),
          ],
        },
      },
      invoke: {
        id: 'permissionHandler',
        systemId: 'countingPermissionReporter',
        src: 'permissionReportingMachine',
        input: ({ self }) => ({
          permissions: [Permissions.bluetooth],
          parent: self,
        }),
      },
    },
  },
});
