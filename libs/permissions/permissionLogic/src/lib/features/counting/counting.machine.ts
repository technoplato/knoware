import { assign, raise, sendTo, setup } from 'xstate';
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
    triggerBluetoothPermissionRequest: raise({
      type: 'permissionWasRequested',
      permission: Permissions.bluetooth,
    }),
  },

  guards: {
    requiresPermission: ({ context }) =>
      context.count >= 3 &&
      context.permissionStatus !== PermissionStatuses.granted,
    countingCompleted: ({ context }) => context.count >= 5,
  },

  types: {
    context: {} as { count: number; permissionStatus: PermissionStatus },
    events: {} as
      | { type: 'count.inc' }
      | { type: 'permissionWasRequested'; permission: Permission }
      | {
          type: 'user.didTapBluetoothRequestPermission';
          permission: Permission;
        },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOkwHsBXfAFwKhLH3QCMAbSAYguppIMwBtAAwBdRKAAO5WLjrl8EkAA9EAWgCMATgDMJACw6ArMOE6AbACZLRnVoDs+gDQgAnuq1aSN+wA4Hlhr6hlr6RgC+4S5oWHiEpDy09IzM7Fwi4kgg0rLyilmqCIEaJDoaRhrCGlbGxtUu7kX6JbYVRlYRUSAxOATEZFRJ+AxMrBwQnIIamVIycrgKSoXFpeWV1Za1FeYNiJZaviS+Rkb65r72ndEYvfEDvMkQuLBjXJJgAE6oz7IKJFAfdC0SAkdiUMA0cjkGjYDJKHLzRYFPblEimcwmPz2Lb1NyIYzmEgaS5+DQ2SLXWJ9BKDOjDEhPF5pCbvL4-Bb4BlMXAgsEQqEwuFZBF5JYooxo4QY4RYnE7PEIfRaYSrcldHpxfqJOkMRmvCaUWCfBm4CAAFXQkgAQmxwZDodgAEpgACO4NgNAACp9vrBfvghbNchyxUVUejMRc5bsECdLESdL4qlp2sTzPZzBTujdNTSHvS+faYQARblvH3sv4AoE0Xm2-kOwPZOai5FFbEGYlac6XGMYry2cxhexStMZrMa6n3IYMQsC7Cl-A8g1Gj4m82Wm12+fOt1wL0Vv0cpsikNtywd5r2bsXIwx+yBUrmbQZmqtSwTnNT7BAiBsejemyR4KLAnCsr6-oAOroLAu7urWEAni2Z6gIUSp6OY6LaCcxxBMIzgKloliEhoGxmBmyq+FRkRdPg5AQHASiTvE8LIUiqHqJY-gGMYpgWNYtgOARjRqBeejKjoD7aL46aeCmn5Unc2r0KxwbsSonHNDxJhmFYNh2I4MaaDJJBGEmSbdlhDgKbcWq0skozMqpiL5BxCCaERpRGAcMoOL4F7+L4MaJgYJwWNUxymMRMk2bm046iaTLjM5rZucIMb6NYBj+GZlijhm47ql+Sn2QW9ZFguZYQClKEaQg6UKichIOFo1TNJs76xVOyn0gAZgQzzYJANXqYUDWNOYrUGD2ZwaMcOjCBeXV3D++B-gBh7+vAwpsa5dWaJU3jYoY5TmGU6zCYg-jxqYSpJnYQTeRoNHhEAA */
  type: 'parallel',
  context: {
    count: 0,
    permissionStatus: PermissionStatuses.unasked,
  },

  states: {
    counting: {
      initial: 'enabled',
      states: {
        enabled: {
          always: [
            {
              target: 'disabled',
              guard: 'requiresPermission',
            },
            {
              target: 'finished',
              guard: 'countingCompleted',
            },
          ],
          on: {
            'count.inc': {
              actions: 'incrementCount',
            },
          },
        },
        disabled: {
          id: 'countingDisabled',
          on: {
            'permission.granted.bluetooth': {
              target: 'enabled',
              actions: 'assignBluetoothStatusGranted',
            },
            'permission.denied.bluetooth': { target: 'bluetoothDenied' },
            'user.didTapBluetoothRequestPermission': {
              actions: 'triggerBluetoothPermissionRequest',
            },
          },
        },
        bluetoothDenied: {
          on: {
            'permission.granted.bluetooth': { target: 'enabled' },
            'user.didTapBluetoothRequestPermission': {
              actions: 'triggerBluetoothPermissionRequest',
            },
          },
        },
        finished: {
          type: 'final',
        },
      },
    },

    handlingPermissions: {
      on: {
        permissionWasRequested: {
          actions: [
            sendTo('permissionReportingCounting', ({ event }) => {
              return {
                type: 'requestPermission',
                permission: event.permission,
              };
            }),
          ],
        },
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
    },
  },
});
