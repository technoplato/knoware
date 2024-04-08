import { setup } from 'xstate';
import { ActorSystemIds } from '../application/actorIds';
import { permissionMonitoringMachine } from '../permissionMonitor.machine';

export const systemManagementMachine = setup({
  types: {} as {
    children: {
      [ActorSystemIds.permissionMonitoring]: 'permissionMonitoringMachine';
    };
  },
  actors: {
    permissionMonitoringMachine: permissionMonitoringMachine,
  },
}).createMachine({
  invoke: [
    {
      systemId: ActorSystemIds.permissionMonitoring,
      src: 'permissionMonitoringMachine',
    },
  ],
});
