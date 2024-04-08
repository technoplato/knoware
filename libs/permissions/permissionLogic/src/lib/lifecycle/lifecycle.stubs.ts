import { fromCallback } from 'xstate';
import { stubSubscribeToApplicationStateChanges } from './lifecycle.types';

export const stubApplicationLifecycleReportingActorLogic =
  // TODO figure out how to type what events this sends back
  fromCallback(({ sendBack }) => {
    /**
     * The real implementation of this actor should setup a subscription
     * to the application lifecycle events for when the application
     * is backgrounded or foregrounded and then report those messages via
     * sendBack
     *
     * Implementations should also return a function that will unsubscribe
     * any listeners
     */
    const unsubscribeApplicationStateListeners =
      stubSubscribeToApplicationStateChanges((event) => {
        console.log({ event });
        switch (event) {
          case 'applicationForegrounded':
            sendBack({ type: 'applicationForegrounded' });
            break;
          case 'applicationBackgrounded':
            sendBack({ type: 'applicationBackgrounded' });
            break;
        }
      });

    return unsubscribeApplicationStateListeners;
  });
