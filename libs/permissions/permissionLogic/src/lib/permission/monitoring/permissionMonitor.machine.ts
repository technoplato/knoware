import {
  ActorRefFrom,
  AnyActorRef,
  assertEvent,
  assign,
  enqueueActions,
  log,
  raise,
  sendTo,
  setup,
  SnapshotFrom,
} from 'xstate';
import { ActorSystemIds } from '../../application/actorIds';
import { stubApplicationLifecycleReportingActorLogic } from '../../lifecycle/lifecycle.stubs';
import { InitialPermissionStatusMap } from '../../permission.fixtures';
import { Permission } from '../../permission.types';
import { permissionCheckerAndRequesterMachine } from '../checkAndRequest/permissionCheckAndRequestMachine';
import {
  EmptyPermissionSubscriberMap,
  PermissionsMonitoringMachineContext,
} from './permissionMonitor.fixtures';
import {
  PermissionMonitoringMachineEvents,
  PermissionSubscriberMap,
} from './permissionMonitor.types';

export const permissionMonitoringMachine = setup({
  types: {} as {
    events: PermissionMonitoringMachineEvents;
    context: PermissionsMonitoringMachineContext;
    children: {
      [ActorSystemIds.permissionCheckerAndRequester]: 'permissionCheckerAndRequesterMachine';
      [ActorSystemIds.lifecycleReporting]: 'applicationLifecycleReportingMachine';
    };
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
    addSubscriberToSubscribersMap: assign(({ context, event }) => {
      assertEvent(event, 'subscribeToPermissionStatuses');
      const { permissions, self: subscriber } = event;
      const { permissionSubscribers } = context;

      // Create a new permissionSubscribers object to avoid mutating the original
      const updatedPermissionSubscribers: PermissionSubscriberMap = {
        ...permissionSubscribers,
      };

      // Iterate over each permission in the event's permissions array
      permissions.forEach((permission: Permission) => {
        // If the permission doesn't exist in the permissionSubscribers map, initialize it as an empty array
        if (!updatedPermissionSubscribers[permission]) {
          updatedPermissionSubscribers[permission] = [];
        }

        // Add the actor to the subscribers list for the permission, ensuring not to add duplicates
        const actorAlreadySubscribed = updatedPermissionSubscribers[
          permission
        ].some((actor) => actor.id === subscriber.id);

        if (!actorAlreadySubscribed) {
          updatedPermissionSubscribers[permission].push(subscriber);
        }
      });

      return {
        permissionSubscribers: updatedPermissionSubscribers,
      };
    }),
    broadcastPermissionsToListeners: enqueueActions(
      ({ context, event, enqueue }) => {
        // TODO this should only send permission updates for the recently modified permissions
        // and is currently sending updates to all permissions to everyone
        Object.keys(context.permissionSubscribers).forEach((permission) => {
          context.permissionSubscribers[permission].forEach(
            (actorRef: AnyActorRef) => {
              enqueue.sendTo(actorRef, {
                type: 'permissionStatusChanged',
                permission,
                status: context.permissionsStatuses[permission],
              });
            }
          );
        });
      }
    ),
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
    sendPermissionCheck: sendTo(ActorSystemIds.permissionCheckerAndRequester, {
      type: 'triggerPermissionCheck',
    }),
    sendPermissionRequest: sendTo(
      ActorSystemIds.permissionCheckerAndRequester,
      ({ event }) => {
        assertEvent(event, 'triggerPermissionRequest');

        return {
          type: 'triggerPermissionRequest',
          permission: event.permission,
        };
      }
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCMCWUDSBDAFgVwDssA6LABzIBtUBjLAF1QHsCAZVAMzBoE8bKwAYnJVaDZgQBiTAE5goMpoQiQA2gAYAuolBkmsVIxY6QAD0QBaABwBmdcQCcANicAWKwFY7D165tWAGhAeSwBGf2JQgHYbf3U7J38PACYogF80oLRMXEISEWo6IzZObj4BYQpC8RYAISwaAGsFJQIVCA1tJBA9A2KTcwQLVxjHZISoqz9bcI8gkKHwq0iYmydk9Sso9VdQq2SMrPRsfCJiMjAZAFtUWAMWWGFKSgAFS5u7iVgAYRxuRrUWhMvUMEgGiBsrmSxB2ySsVjcoS8O3Uc2CYSs9lCiSi218DiiHnU6gOmRA2ROeXO71u9wIj3oMnQMBkb2utIkv3+nWB+lBxm6gwsyVCjiRoQcW3iNiivj88zCDhsxBGoXUUQlMQRDg8VkO5OOuTOF3ZnwegkZzMubI+dIASmAAI54OD0HndEH9QWIZLQ4lOKwEgOBqa+tELSHQmW48bhX1rJz6ilGkgm21fQRpjksB3O13fJhXKhgeiArq6Ple0CDGzJVwq2sI6KeDzrcMQjz1zzYkVOGJKvsZMkEJgqeDdZOnLC8vpg71DBzJBwq1K+qFOTa2QLooY2DzLtwIpdwgPJAOJsmTqkFMTFdhcXj8MAz-kEcFDeGiqFRNdnzf+BUhlXYhaw8H8JR2WJXFRJNDSnUgqlvCR7zKJ8ENEIoJAASVgLCpFkeRFGUF8qzMSxbGVb9fw3eEAJ3CwPC-KIlQcJEbFCeN4lgnJ4JvTCWBQx8BHQ6pijw+omhaYiPUrOdq0sVwnGXH8NWJBwHGJCVXEA4VlnUNwnC8RcYy3C8jh4qkszNekSLksiEH2GF-E8fZ3GxSNAJlYhWysCDwkhXZ9yHNIgA */
  id: ActorSystemIds.permissionMonitoring,
  type: 'parallel',
  entry: log('monitoring started'),

  context: {
    permissionsStatuses: InitialPermissionStatusMap,
    permissionSubscribers: EmptyPermissionSubscriberMap,
  },
  on: {
    subscribeToPermissionStatuses: {
      actions: 'addSubscriberToSubscribersMap',
    },
  },
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
        id: ActorSystemIds.lifecycleReporting,
        systemId: ActorSystemIds.lifecycleReporting,
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
          actions: ['sendPermissionCheck'],
        },

        allPermissionsChecked: {
          actions: [
            'assignPermissionCheckResultsToContext',
            'broadcastPermissionsToListeners',
          ],
        },

        triggerPermissionRequest: {
          actions: ['sendPermissionRequest'],
        },
        permissionRequestCompleted: {
          actions: [
            'assignPermissionRequestResultToContext',
            'broadcastPermissionsToListeners',
          ],
        },
      },
      invoke: {
        id: ActorSystemIds.permissionCheckerAndRequester,
        systemId: ActorSystemIds.permissionCheckerAndRequester,
        src: 'permissionCheckerAndRequesterMachine',
        input: ({ self }) => ({ parent: self }),
      },
    },
  },
});

export type PermissionMonitorMachine = typeof permissionMonitoringMachine;
export type PermissionMonitorActorRef = ActorRefFrom<
  typeof permissionMonitoringMachine
>;
export type PermissionMonitoringSnapshot = SnapshotFrom<
  typeof permissionMonitoringMachine
>;
