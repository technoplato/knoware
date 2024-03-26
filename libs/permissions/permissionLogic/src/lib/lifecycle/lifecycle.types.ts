import { fromCallback } from 'xstate';

export const ApplicationLifecycleEvents = {
  applicationForegrounded: 'applicationForegrounded',
  applicationBackgrounded: 'applicationBackgrounded',
} as const;

export type ApplicationLifecycleEvent =
  (typeof ApplicationLifecycleEvents)[keyof typeof ApplicationLifecycleEvents];

export const ApplicationLifecycleStates = {
  applicationInForeground: 'application is in foreground',
  applicationInBackground: 'application is in background',
} as const;

export type ApplicationLifecycleState =
  | 'applicationForegrounded'
  | 'applicationBackgrounded';

export type ApplicationStateChangeHandler = (
  event: ApplicationLifecycleState
) => void;
export const stubSubscribeToApplicationStateChanges = (
  handleApplicationStateChange: ApplicationStateChangeHandler
) => {
  console.log('subscribed to fake handler');
  handleApplicationStateChange('applicationForegrounded');

  return () => {
    console.log('unsubscribed from fake handler');
  };
};
