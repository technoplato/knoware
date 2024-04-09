import {
  AnyActorRef,
  AnyEventObject,
  enqueueActions,
  log,
  sendTo,
  setup,
} from 'xstate';
import { Permission, Permissions } from '../../permission.types';
import { ActorSystemIds } from '../../application/actorIds';

export const permissionReportingMachine = setup({
  types: {
    input: {} as {
      permissions: Array<Permission>;
      parent: AnyActorRef;
    },
    context: {} as {
      permissions: Array<Permission>;
      parent: AnyActorRef;
    },
  },
  actions: {
    sendSubscriptionRequestForStatusUpdates: sendTo(
      ({ system }) => {
        const actorRef: AnyActorRef = system.get(
          ActorSystemIds.permissionMonitoring
        );
        return actorRef;
      },
      ({ self, context }) => ({
        type: 'subscribeToPermissionStatuses',
        permissions: context.permissions,
        self,
      })
    ),
    // satisfies /*TODO type these events to the receiving machine event type*/ AnyEventObject);
    checkedSendParent: enqueueActions(
      ({ context, enqueue }, event: AnyEventObject) => {
        if (!context.parent) {
          console.log(
            'WARN: an attempt to send an event to a non-existent parent'
          );
          return;
        }

        enqueue.sendTo(context.parent, event);
      }
    ),
  },
}).createMachine({
  description:
    "This actor's job is to report permission statuses to the actors that have invoked it. We abstract away this functionality so that it is reusable by any actor that needs it and so they don't need to know how permissions are checked. This keeps control centralized and easy to modify the behavior of.",
  context: ({ input }) => ({
    permissions: input.permissions,
    parent: input.parent,
  }),
  initial: 'waiting',
  states: {
    waiting: {
      after: {
        /* This is required due to the way actor systems are initialized. Without this delay, the lower level actor (us)
         * will send out the subscription request before the top level permission monitoring actor is ready to receive it.*/
        0: {
          actions: ['sendSubscriptionRequestForStatusUpdates'],
        },
      },
    },
  },
  on: {
    requestPermission: {
      actions: [
        sendTo(
          ({ system }) => {
            return system.get(ActorSystemIds.permissionCheckerAndRequester);
          },
          ({ event }) => ({
            type: 'triggerPermissionRequest',
            permission: event.permission,
          })
        ),
      ],
    },
    permissionStatusChanged: {
      description:
        'Whenever the Permission Monitoring machine reports that a permission status has changed, we receive this event and can process and share with our siblings.',
      // We eventually want to communicate this to the actors that have invoked us
      actions: [
        log(
          ({ event }) =>
            event.permission + ' status <<<changed' + ' to ' + event.status
        ),

        {
          /**
           * I tried putting this action in the actions in setup as reportPermissionRequestResult
           * as an action, but it requied
           * use of checkedSendParent and ran into this error when attempting to use that
           *
           * in onDone, but it didn't work
           *
           * error: Type '"checkedSendParent"' is not assignable to type '"triggerPermissionRequest"'.ts(2322)
           */
          type: 'checkedSendParent',
          params({ event }) {
            const { permission, status } = event;
            if (permission === Permissions.bluetooth && status === 'granted') {
              console.log('its granted yaya');
              return {
                // TODO make these type safe
                // dynamic
                type: 'permission.granted.bluetooth',
              };
            } else {
              return {
                type: 'permission.denied.bluetooth',
              };
            }
          },
        },
      ],
    },
  },
});
