import { useStatelyActor } from '@statelyai/sky-react';
import { skyConfig } from './lights.sky';

const skyurl = 'https://sky.stately.ai/5hIBJk';
const sessionKey = 'shared';

export const useSkyLightMachine = () => {
  const [snapshot, send, actor] = useStatelyActor(
    {
      apiKey: 'sta_d96b998f-86f5-42a3-bcc0-c7b364814644',
      url: skyurl,
      sessionId: sessionKey,
    },
    skyConfig
  );

  // const [state, setState] = React.useState(0);

  // return [state, setState];

  return [snapshot, send, actor];
};
