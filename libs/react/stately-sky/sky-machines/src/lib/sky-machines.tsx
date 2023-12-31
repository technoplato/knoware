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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore TODO upgrade to stately sky whatever latest and fix
    skyConfig
  );

  return [snapshot, send, actor];
};
