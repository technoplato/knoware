import { assign, setup } from 'xstate';

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
};
export type PermissionStatus =
  (typeof PermissionStatuses)[keyof typeof PermissionStatuses];

type PermissionStatusMapType = Record<Permission, PermissionStatus>;
const PermissionStatusMap: PermissionStatusMapType = {
  [Permissions.bluetooth]: PermissionStatuses.unasked,
  [Permissions.microphone]: PermissionStatuses.unasked,
} as const;

const permissionMonitoringMachine = setup({
  types: {
    context: {} as { permissionStatuses: PermissionStatusMapType },
    events: {} as { type: 'inc' } | { type: 'dec' },
  },
  actions: {
    increment: assign({
      count: ({ context }) => context.count + 1,
    }),
    decrement: assign({
      count: ({ context }) => context.count - 1,
    }),
  },
  actors: {},
}).createMachine({
  context: { permissionStatuses: PermissionStatusMap },
  on: {
    inc: { actions: 'increment' },
    dec: { actions: 'decrement' },
  },
});

console.log(permissionMonitoringMachine);
