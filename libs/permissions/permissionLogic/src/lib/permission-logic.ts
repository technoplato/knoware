// export function permissionLogic(): string {
//   return 'permissionLogic';
// }

// permissionMonitoringMachine.ts
import { actions, createMachine, interpret } from 'xstate';

const permissionMonitoringMachine = createMachine({
  id: 'permissionMonitoring',
  initial: 'idle',
  context: {
    permissionState: undefined as 'granted' | 'denied' | 'revoked' | undefined,
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
            actions: actions.assign({ permissionState: 'granted' }),
          },
          {
            target: 'permissionDenied',
            cond: (_, event) => event.data === 'denied',
            actions: actions.assign({ permissionState: 'denied' }),
          },
        ],
        onError: 'permissionRevoked',
      },
    },
    permissionGranted: {},
    permissionDenied: {},
    permissionRevoked: {
      entry: actions.assign({ permissionState: 'revoked' }),
    },
  },
});

// Simulating the permission check
const checkPermission = async () => {
  // Simulating the permission prompt
  const permissionResult = 'granted';
  return permissionResult;
};

const permissionMonitoringService = interpret(permissionMonitoringMachine, {
  services: { checkPermission },
}).start();

export { permissionMonitoringMachine, permissionMonitoringService };
