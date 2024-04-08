import { setup } from 'xstate';
import { ActorSystemIds } from '../application/actorIds';
import { countingMachineThatNeedsPermissionAt3 } from './counting/counting.machine';
import { someFeatureMachine } from './someFeature/someFeature.machine';

export const featuresMachine = setup({
  types: {} as {
    children: {
      [ActorSystemIds.counting]: 'countingMachine';
      [ActorSystemIds.someFeature]: 'someFeatureMachine';
    };
  },
  actors: {
    countingMachine: countingMachineThatNeedsPermissionAt3,
    someFeatureMachine: someFeatureMachine,
  },
}).createMachine({
  invoke: [
    {
      systemId: ActorSystemIds.counting,
      src: 'countingMachine',
    },
    {
      systemId: ActorSystemIds.someFeature,
      src: 'someFeatureMachine',
    },
  ],
});
