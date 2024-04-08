import { createMachine, setup } from 'xstate';
import { ActorSystemIds } from '../application/actorIds';
import { permissionMonitoringMachine } from '../permissionMonitor.machine';
import { types } from 'node:util';

export const systemManagementMachine = setup({
  types: {} as {
    children: {
      [ActorSystemIds.permissionMonitoring]: 'permissionMonitoringMachine';
      // eventually get the lifecycle monitoring in here...
    };
  },
  actors: {
    permissionMonitoringMachine: permissionMonitoringMachine,
    // eventually get the lifecycle monitoring in here...
  },
}).createMachine({
  invoke: [
    {
      id: ActorSystemIds.permissionMonitoring,
      systemId: ActorSystemIds.permissionMonitoring,
      src: 'permissionMonitoringMachine',
    },
    // eventually get the lifecycle monitoring in here...
  ],
  entry: () => console.log('systemManagement started'),
});
