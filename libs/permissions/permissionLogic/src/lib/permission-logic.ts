import { assign, createMachine } from 'xstate';

type PermissionEvent =
  | { type: 'REQUEST_PERMISSION' }
  | { type: 'PERMISSION_UPDATED'; permissionState: PermissionState };

type PermissionState = 'granted' | 'denied' | 'revoked' | undefined;

interface PermissionContext {
  permissionState: PermissionState;
}

const permissionMonitoringMachine = createMachine(
  {
    id: 'permissionMonitoring',
    initial: 'idle',
    context: {
      permissionState: undefined,
    },
    states: {
      idle: {
        on: {
          REQUEST_PERMISSION: 'checkingPermission',
        },
      },
      checkingPermission: {
        invoke: {
          src: 'checkPermission',
          onDone: [
            {
              target: 'permissionGranted',
              cond: (_, event) => event.data === 'granted',
              actions: assign({ permissionState: (_, event) => event.data }),
            },
            {
              target: 'permissionDenied',
              cond: (_, event) => event.data === 'denied',
              actions: assign({ permissionState: (_, event) => event.data }),
            },
          ],
          onError: 'permissionRevoked',
        },
      },
      permissionGranted: {},
      permissionDenied: {},
      permissionRevoked: {
        entry: assign({ permissionState: 'revoked' }),
      },
    },
    on: {
      PERMISSION_UPDATED: {
        actions: assign({
          permissionState: (_, event) => event.permissionState,
        }),
      },
    },
  },
  {
    services: {
      checkPermission: async () => {
        // Simulating the permission check
        const permissionResult: PermissionState = 'granted';
        return permissionResult;
      },
    },
  }
);

// Usage
/*
const permissionMonitoringService = createActor(permissionMonitoringMachine, {
  id: 'permissionMonitoring',
});

permissionMonitoringService.start();
permissionMonitoringService.send({ type: 'REQUEST_PERMISSION' });
*/
