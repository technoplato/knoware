import {
  PermissionMonitoringMachineEvents,
  Permissions,
  PermissionStatusMapType,
} from './permission.types';
import { assertEvent, assign, log, raise, sendTo, setup } from 'xstate';
import { stubApplicationLifecycleReportingActorLogic } from './lifecycle/lifecycle.stubs';
import { InitialPermissionStatusMap } from './permission.fixtures';
import { PermissionSubscriberMap } from './permission-logic.spec';
import { permissionCheckerAndRequesterMachine } from './permissionCheckAndRequestMachine';

export const EmptyPermissionSubscriberMap: PermissionSubscriberMap =
  Object.values(Permissions).reduce(
    (acc, permission) => ({
      ...acc,
    }),
    {} as PermissionSubscriberMap
  );
export type PermissionsMonitoringMachineContext = {
  permissionsStatuses: PermissionStatusMapType;
  permissionSubscribers: PermissionSubscriberMap;
};

export const permissionMonitoringMachine = setup({
  types: {} as {
    events: PermissionMonitoringMachineEvents;
    context: PermissionsMonitoringMachineContext;
  },
  actors: {
    applicationLifecycleReportingMachine:
      stubApplicationLifecycleReportingActorLogic,
    permissionCheckerAndRequesterMachine,
  },

  actions: {
    assignPermissionCheckResultsToContext: assign({
      permissionsStatuses: ({ event }) => {
        assertEvent(event, 'allPermissionsChecked');
        return event.statuses;
      },
    }),
    assignPermissionRequestResultToContext: assign({
      permissionsStatuses: ({ event, context }) => {
        assertEvent(event, 'permissionRequestCompleted');
        return {
          ...context.permissionsStatuses,
          [event.permission]: event.status,
        };
      },
    }),
    raisePermissionCheck: raise({ type: 'triggerPermissionCheck' }),
    sendPermissionCheck: sendTo('someFooMachine', {
      type: 'triggerPermissionCheck',
    }),
    sendPermissionRequest: sendTo('someFooMachine', ({ context, event }) => {
      assertEvent(event, 'triggerPermissionRequest');

      return {
        type: 'triggerPermissionRequest',
        permission: event.permission,
      };
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCMCWUDSBDAFgVwDssA6LABzIBtUBjLAF1QHsCAZVAMzBoE8bKwAYnJVaDZgQBiTAE5goMpoQiQA2gAYAuolBkmsVIxY6QAD0QBaABwBmdcQCcANicAWKwFY7D165tWAGhAeSwBGf2JQgHYbf3U7J38PACYogF80oLRMXEISEWo6IzZObj4BYQpC8RYAISwaAGsFJQIVCA1tJBA9A2KTcwQLVxjHZISoqz9bcI8gkKHwq0iYmydk9Sso9VdQq2SMrPRsfCJiMjAZAFtUWAMWWGFKSgAFS5u7iVgAYRxuRrUWhMvUMEgGiBsrmSxB2ySsVjcoS8O3Uc2CYSs9lCiSi218DiiHnU6gOmRA2ROeXO71u9wIj3oMnQMBkb2utIkv3+nWB+lBxm6gwsyVCjiRoQcW3iNiivj88zCDhsxBGoXUUQlMQRDg8VkO5OOuTOF3ZnwegkZzMubI+dIASmAAI54OD0HndEH9QWIZLQ4lOKwEgOBqa+tELSHQmW48bhX1rJz6ilGkgm21fQRpjksB3O13fJhXKhgeiArq6Ple0CDGzJVwq2sI6KeDzrcMQjz1zzYkVOGJKvsZMkEJgqeDdZOnLC8vpg71DBzJBwq1K+qFOTa2QLooY2DzLtwIpdwgPJAOJsmTqkFMTFdhcXj8MAz-kEcFDeGiqFRNdnzf+BUhlXYhaw8H8JR2WJXFRJNDSnUgqlvCR7zKJ8ENEIoJAASVgLCpFkeRFGUF8qzMSxbGVb9fw3eEAJ3CwPC-KIlQcJEbFCeN4lgnJ4JvTCWBQx8BHQ6pijw+omhaYiPUrOdq0sVwnGXH8NWJBwHGJCVXEA4VlnUNwnC8RcYy3C8jh4qkszNekSLksiEH2GF-E8fZ3GxSNAJlYhWysCDwkhXZ9yHNIgA */
  id: 'bigKahuna',
  type: 'parallel',

  context: {
    permissionsStatuses: InitialPermissionStatusMap,
    permissionSubscribers: EmptyPermissionSubscriberMap,
  },
  on: {
    subscribeToPermissionStatuses: {
      actions: [log('received permission subscription'), log('or did we')],
    },
  },
  // entry: raise({ type: 'subscribeToPermissionStatuses', permissions: [] }),
  states: {
    applicationLifecycle: {
      on: {
        applicationForegrounded: {
          target: '.applicationIsInForeground',
        },

        applicationBackgrounded: {
          target: '.applicationInBackground',
        },
      },
      initial: 'applicationIsInForeground',
      invoke: {
        src: 'applicationLifecycleReportingMachine',
      },

      states: {
        applicationIsInForeground: {
          entry: 'raisePermissionCheck',
        },
        applicationInBackground: {},
      },
    },

    permissions: {
      on: {
        triggerPermissionCheck: {
          actions: [log('permission trigger check'), 'sendPermissionCheck'],
        },

        allPermissionsChecked: {
          actions: [
            'assignPermissionCheckResultsToContext',
            // TODO 'broadcastPermissionsToListeners',
          ],
        },

        triggerPermissionRequest: {
          actions: [
            log('triggering permission request'),
            'sendPermissionRequest',
          ],
        },
        permissionRequestCompleted: {
          actions: 'assignPermissionRequestResultToContext',
          // TODO 'broadcastPermissionsToListeners',
        },
      },
      invoke: {
        id: 'someFooMachine',
        src: 'permissionCheckerAndRequesterMachine',
        input: ({ self }) => ({ parent: self }),
      },
    },
  },
});
