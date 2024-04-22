import { assign, not, sendTo, setup } from 'xstate';
import {
  Permission,
  PermissionStatus,
  PermissionStatuses,
  Permissions,
} from '../../permission.types';
import { permissionReportingMachine } from '../../permission/reporting/permissionReporting.machine';

export const countingMachineThatNeedsPermissionAt3 = setup({
  actors: {
    permissionReportingMachine,
  },

  actions: {
    incrementCount: assign({ count: ({ context }) => context.count + 1 }),
    assignBluetoothStatusGranted: assign({ permissionStatus: 'granted' }),

    triggerBluetoothPermissionRequest: sendTo('permissionReportingCounting', {
      type: 'requestPermission',
      permission: Permissions.bluetooth,
    }),
  },

  guards: {
    isPermissionRequiredToContinue: ({ context }) =>
      context.count >= 3 &&
      context.permissionStatus !== PermissionStatuses.granted,
    isCountingCompleted: ({ context }) => context.count >= 5,
  },

  types: {
    context: {} as { count: number; permissionStatus: PermissionStatus },
    events: {} as  // TODO pull these out into their own discrete types and do a union here
      | { type: 'count.inc' }
      | { type: 'permissions.bluetooth.revoked' }
      | { type: 'permissions.bluetooth.granted' }
      | { type: 'permissions.bluetooth.denied' }
      | {
          type: 'user.didTapBluetoothRequestPermission';
          permission: Permission;
        },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAYgAcwAnVXWWXAe31gDoAjAGwFcwAXBhr2wtKYAG4MA1pADaABgC6iUGQb1ejfMpAAPRAFoAjADYArCwAshgJwAmABwBmC6YDst03YA0IAJ6JHQzlLazkrR1tHOUjHVwBfOJ80LDxCIhYwfHROSBJMBi58XhYCTHklJBBVdU1tPQR7IJZHY3tTW1tDQwtHa1NTH38EDosWe3s5Q1dJ02Mw21d4xJBknAJiDKyciBJy7WrcDSY6xGtrexZDRrlo+wtbMPvBxAXDFmiruVMJszlxhKSGDWaU22Q4uRkhgqKjUh1qlXqZwuVyCt3uj1szwQzmCrnsxiseIJ1kcpgBKyBqQ22HQ+AgHAIUAAClQaHRNLByKzaPQmCwoJRabxIOxuHwBEI9pUDkctAjEEFDOZ+u4LCS7v0OliOm8bMYHN97rYLHJnOTVlT0jS6Qz8MzueymJyKNQeZoWBBMrgRZwePxBNgpTCasd5QhumdmmZQk5rMZrPcLNr+s17LZ44Z0+FFubKet0r7xQGACJe3Iutm8-D8wVFH1i-2SxT7WGyk7htXWKOeP69eOJrGolh40kefGTOTGbq5lL50V+iXYUv4b07LiwKge3AQAAq6DIACEG4uAEpgACOPFgvBZrsd+CDVVb8NA9Sm7jGcjOU46E08Sb8BU3GHVxPBsNNHFiCwLCWQFZxBQtG2wM8JGkHYKzdPkBSFesFwDR8ZRfXREFMFoWDsaD4wcCI8VcLFAlcYdHHxRZwlMcCLBnYENkQ09xCkXJ103CBtz3Q9jwDM9LzgG8HSrAjn1DV8FScFhbHOQxmMmB4E2sbUphYYxAlCTx3FA4xjC4y15yLIQUIEtcN0oLdd33AA5dAxFwKB0GFHcGAAZT4DQ7VgBSQzlZThgM9w7msTTmNCLpjEHDpmjcExpjOVwpgJBJlnwBhPXgSoLXzFsIvbfROkcSwbGolx3E8TFAIQfR2ijKdzkCdSVVcTjljKkFMjBSAKrhJTiIaZj3jjWJnEg1pWnojxLlMNUv2iGMpisudrXpRlb0rDlxrbMNMwTd5JiiHVZnjbUIkuUlQm6rTJ1gil4J4iShGXVdTqIt98TeexznY6YLHGfU6Nasd3lMSdvnjAlNJcXaEJ+5D+LQgHJvqdNjDGIJ2i-eMvlCAChgY8jJwJSHGr6SzBrzEEADMCFobAxulRTIqmi7RhuTTok6O69NayDGJcTt02+frAjJfKgA */
  context: {
    count: 0,
    permissionStatus: PermissionStatuses.unasked,
  },

  invoke: {
    id: 'permissionReportingCounting',
    systemId: 'permissionReportingCounting',
    src: 'permissionReportingMachine',
    input: ({ self }) => ({
      permissions: [Permissions.bluetooth],
      parent: self,
    }),
  },
  on: {
    'permissions.bluetooth.revoked': {
      target: '.bluetoothRevoked',
      guard: not('isPermissionRequiredToContinue'),
    },
  },

  initial: 'enabled',

  states: {
    enabled: {
      always: [
        {
          guard: 'isPermissionRequiredToContinue',
          target: 'handlingPermissions',
        },
        {
          guard: 'isCountingCompleted',
          target: 'finished',
        },
      ],
      on: {
        'count.inc': {
          actions: 'incrementCount',
        },
      },
    },

    handlingPermissions: {
      on: {
        'user.didTapBluetoothRequestPermission': {
          actions: 'triggerBluetoothPermissionRequest',
        },

        'permissions.bluetooth.granted': {
          target: 'enabled',
          actions: ['assignBluetoothStatusGranted'],
        },
        'permissions.bluetooth.denied': { target: 'bluetoothDenied' },
      },
    },

    bluetoothDenied: {
      on: {
        'permissions.bluetooth.granted': {
          target: 'enabled',
          actions: ['assignBluetoothStatusGranted'],
        },
        'user.didTapBluetoothRequestPermission': {
          actions: 'triggerBluetoothPermissionRequest',
        },
      },
    },

    bluetoothRevoked: {
      on: {
        'permissions.bluetooth.granted': { target: 'enabled' },
        'user.didTapBluetoothRequestPermission': {
          actions: 'triggerBluetoothPermissionRequest',
        },
        'user.didTapNavigateToSettings': {
          actions: 'triggerNavigateToSettings',
        },
      },
    },

    finished: {
      type: 'final',
    },
  },
});
