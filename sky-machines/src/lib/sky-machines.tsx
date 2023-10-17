import { useStatelyActor } from '@statelyai/sky-react';
import { skyConfig } from './lights.sky';

const skyurl = 'https://sky.stately.ai/5hIBJk';
const sessionKey = 'shared';

export const useFoo = () => {
  const [snapshot, send, actor] = useStatelyActor(
    {
      apiKey: 'sta_e922f7a4-809c-4eb0-8311-0a1142dd3c57',
      url: skyurl,
      sessionId: sessionKey,
    },
    skyConfig
  );

  // const [state, setState] = React.useState(0);

  // return [state, setState];

  return [snapshot, send, actor];
};
