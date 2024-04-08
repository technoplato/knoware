import { setup } from 'xstate';
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
  invoke: [
    {
      systemId: ActorSystemIds.features,
      src: 'featuresMachine',
    },
    {
      systemId: ActorSystemIds.systemManagement,
      src: 'topLevelSystemStuff',
    },
  ],
});
