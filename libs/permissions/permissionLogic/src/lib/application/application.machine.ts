import { log, setup } from 'xstate';
import { ActorSystemIds } from '../application/actorIds';
import { featuresMachine } from '../features/features.machine';
import { systemManagementMachine } from '../systemManagement/systemManagement.machine';

export const applicationMachine = setup({
  types: {} as {
    children: {
      [ActorSystemIds.features]: 'featuresMachine';
      [ActorSystemIds.systemManagement]: 'topLevelSystemStuff';
    };
  },
  actors: {
    featuresMachine: featuresMachine,
    topLevelSystemStuff: systemManagementMachine,
  },
}).createMachine({
  entry: log('Application started'),
  id: ActorSystemIds.application,
  invoke: [
    {
      id: ActorSystemIds.features,
      systemId: ActorSystemIds.features,
      src: 'featuresMachine',
    },
    {
      id: ActorSystemIds.systemManagement,
      systemId: ActorSystemIds.systemManagement,
      src: 'topLevelSystemStuff',
    },
  ],
});
