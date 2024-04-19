// permissionMonitoringMachine.test.ts
import { ActorSystemIds } from './application/actorIds';

import { createSkyInspector } from '@statelyai/inspect';
import { WebSocket } from 'ws';
import { ActorSystem, createActor, waitFor } from 'xstate';
import { PermissionStatuses, Permissions } from './permission.types';
import { PermissionMonitorActorRef } from './permission/monitoring/permissionMonitor.machine';

const vLongTime = 1000000000;
type JESActorSystem = ActorSystem<{
  actors: {
    [ActorSystemIds.permissionMonitoring]: PermissionMonitorActorRef;
    // [ActorSystemIds.countingPermissionReporter]: PermissionReportingActorRef;
  };
}>;

describe('Permission Requester and Checker Machine', () => {
  describe('Checking Permissions', () => {
    it('should check permission when triggered', async () => {
      const bluetoothPermissionActor = createActor(
        permissionCheckerAndRequesterMachine,
        { input: { parent: undefined } }
      ).start();

      bluetoothPermissionActor.send({ type: 'triggerPermissionCheck' });

      await waitFor(
        bluetoothPermissionActor,
        (state) => state.value === 'idle'
      );

      expect(bluetoothPermissionActor.getSnapshot().value).toBe('idle');
      expect(bluetoothPermissionActor.getSnapshot().context.statuses).toEqual({
        [Permissions.bluetooth]: PermissionStatuses.denied,
        [Permissions.microphone]: PermissionStatuses.denied,
      });
    });

    it('should report permission to parent after a check', async () => {
      let result: any;
      const spy = (
        something: /* TODO: change type to whatever an event is in xstate*/ any
      ) => {
        result = something;
      };

      const parentMachine = setup({
        types: {} as {
          events: PermissionMonitoringMachineEvents;
          children: {};
        },

        actors: {
          permissionCheckerAndRequesterMachine,
        },
      }).createMachine({
        on: {
          allPermissionsChecked: {
            actions: spy,
          },
          triggerPermissionCheck: {
            actions: [
              sendTo(ActorSystemIds.permissionCheckerAndRequester, {
                type: 'triggerPermissionCheck',
              }),
            ],
          },
        },
        invoke: {
          id: ActorSystemIds.permissionCheckerAndRequester,
          systemId: ActorSystemIds.permissionCheckerAndRequester,
          src: 'permissionCheckerAndRequesterMachine',
          input: ({ self }) => ({ parent: self }),
        },
      });

      const actorRef = createActor(parentMachine).start();
      actorRef.send({ type: 'triggerPermissionCheck' });

      await waitFor(
        actorRef,
        (state) =>
          state.children.permissionCheckerAndRequesterMachineId!.getSnapshot()
            .value === 'idle'
      );

      expect(result).not.toBeNull();
      expect(result.event).toStrictEqual({
        type: 'allPermissionsChecked',
        statuses: {
          [Permissions.bluetooth]: PermissionStatuses.denied,
          [Permissions.microphone]: PermissionStatuses.denied,
        },
      });
    });
  });

  describe('Requesting Permissions', () => {
    it('should request permission when triggered', async () => {
      const permissionActor = createActor(
        permissionCheckerAndRequesterMachine,
        { input: { parent: undefined } }
      ).start();
      const permission: Permission = Permissions.bluetooth;

      expect(permissionActor.getSnapshot().context.statuses[permission]).toBe(
        PermissionStatuses.unasked
      );

      permissionActor.send({
        type: 'triggerPermissionRequest',
        permission,
      });

      await waitFor(permissionActor, (state) => state.value === 'idle');

      expect(permissionActor.getSnapshot().value).toBe('idle');
      expect(permissionActor.getSnapshot().context.statuses[permission]).toBe(
        PermissionStatuses.granted
      );
    });

    it('should report permission to parent after a request', async () => {
      let result: any;
      const spy = (
        something: /* TODO: change type to whatever an event is in xstate*/ any
      ) => {
        result = something;
      };

      const parentMachine = setup({
        types: {} as {
          events: PermissionMonitoringMachineEvents;
          children: {
            [ActorSystemIds.permissionCheckerAndRequester]: 'permissionCheckerAndRequesterMachine';
          };
        },
        actors: {
          permissionCheckerAndRequesterMachine,
        },
      }).createMachine({
        on: {
          permissionRequestCompleted: {
            actions: spy,
          },
          triggerPermissionRequest: {
            actions: [
              sendTo(ActorSystemIds.permissionCheckerAndRequester, {
                type: 'triggerPermissionRequest',
                permission: Permissions.bluetooth,
              }),
            ],
          },
        },
        invoke: {
          id: ActorSystemIds.permissionCheckerAndRequester,
          src: 'permissionCheckerAndRequesterMachine',
          input: ({ self }) => ({ parent: self }),
        },
      });

      const actorRef = createActor(parentMachine).start();
      actorRef.send({
        type: 'triggerPermissionRequest',
        permission: Permissions.bluetooth,
      });

      await waitFor(
        actorRef,
        (state) =>
          state.children[
            ActorSystemIds.permissionCheckerAndRequester
          ]!.getSnapshot().value === 'idle'
      );

      expect(result).not.toBeNull();
      expect(result.event).toStrictEqual({
        type: 'permissionRequestCompleted',
        status: PermissionStatuses.granted,
        permission: Permissions.bluetooth,
      });
    });
  });
});

/**
 *  A map of that looks like this to start:
 *  {
 *    bluetooth: [],
 *    microphone: [],
 *  }
 */

describe('Permission Monitoring Machine', () => {
  describe('Subscriptions', () => {
    it('should initialize with no subscriptions', () => {
      const actor = createActor(permissionMonitoringMachine, {
        parent: undefined,
      }).start();
      const state = actor.getSnapshot();
      expect(state.context.permissionSubscribers).toEqual(
        EmptyPermissionSubscriberMap
      );
    });

    describe('Single Subscriber', () => {
      it('should allow subscriptions from a subscriber to a single permission', () => {
        const actor = createActor(
          permissionMonitoringMachine.provide({
            actors: {
              features: someFeatureMachine,
            },
          }),
          {
            parent: undefined,
            systemId: ActorSystemIds.permissionMonitoring,
          }
        ).start();

        const state = actor.getSnapshot();
        expect(
          state.context.permissionSubscribers[Permissions.bluetooth].length
        ).toEqual(1);

        const id =
          state.context.permissionSubscribers[Permissions.bluetooth][0].id;
        expect(id).toBe('permissionHandler');
      });

      it('should notify subscribers of changes to permissions', async () => {
        const permissionMonitorActor = createActor(
          permissionMonitoringMachine.provide({
            actors: {
              features: someFeatureMachine,
            },
          }),
          {
            systemId: ActorSystemIds.permissionMonitoring,
            inspect: createSkyInspector(
              // @ts-expect-error
              { inspectorType: 'node', WebSocket: WebSocket, autoStart: true }
            ).inspect,
          }
        ).start();

        const state = permissionMonitorActor.getSnapshot();
        expect(
          state.context.permissionSubscribers[Permissions.bluetooth].length
        ).toEqual(1);

        const featureMachineActor =
          permissionMonitorActor.getSnapshot().children.featuresMachineId;
        expect(featureMachineActor?.getSnapshot().value).toStrictEqual({
          foo: 'waitingForPermission',
          handlingPermissions: {},
        });

        expect(permissionMonitorActor.getSnapshot().value).toStrictEqual({
          applicationLifecycle: 'applicationIsInForeground',
          permissions: {},
        });
        expect(
          permissionMonitorActor.getSnapshot().context.permissionsStatuses
        ).toStrictEqual({
          bluetooth: 'unasked',
          microphone: 'unasked',
        });

        const permissionCheckerActor =
          permissionMonitorActor.getSnapshot().children[
            ActorSystemIds.permissionCheckerAndRequester
          ]!;

        expect(permissionCheckerActor?.getSnapshot().value).toBe(
          'checkingPermissions'
        );

        await waitFor(permissionCheckerActor, (state) => {
          return state.value === 'idle';
        });
        expect(
          permissionMonitorActor.getSnapshot().context.permissionsStatuses[
            Permissions.bluetooth
          ]
        ).toBe('denied');

        expect(permissionCheckerActor?.getSnapshot().value).toBe('idle');
        expect(featureMachineActor?.getSnapshot().value).toStrictEqual({
          foo: 'bluetoothDenied',
          handlingPermissions: {},
        });

        // await waitFor(featureMachineActor, (state) => {
        //   return state.value === 'bluetoothDenied';
        // });

        featureMachineActor?.send({
          type: 'user.didTapBluetoothRequestPermission',
          permission: Permissions.bluetooth,
        });

        expect(permissionCheckerActor?.getSnapshot().value).toBe(
          'requestingPermission'
        );

        await waitFor(permissionCheckerActor, (state) => {
          return state.value === 'idle';
        });
        expect(featureMachineActor?.getSnapshot().value).toStrictEqual({
          foo: 'bluetoothGranted',
          handlingPermissions: {},
        });
        // await new Promise((resolve) => setTimeout(resolve, forever));
      });

      describe('Edge Cases', () => {
        it('should not add a subscriber if the subscriber is already subscribed', () => {
          /*FIXME: I don't like having to create another test actor for this
         how do I access the actor
         or trigger the subscription request again
         or configure different starting context via input
         */
          const dummyFeatureMachineThatSubscribesTwice = setup({
            actions: {
              sendSubscriptionRequestForStatusUpdates: sendTo(
                ({ system }) => {
                  const actorRef: AnyActorRef = system.get(
                    ActorSystemIds.permissionMonitoring
                  );
                  return actorRef;
                },
                ({ self }) => ({
                  type: 'subscribeToPermissionStatuses',
                  permissions: [Permissions.bluetooth],
                  self,
                })
              ),
              // satisfies /*TODO type these events to the receiving machine event type*/ AnyEventObject);
            },
          }).createMachine({
            id: 'dummyFeatureId',
            entry: [
              'sendSubscriptionRequestForStatusUpdates',
              /*Second subscription should have no effect*/ 'sendSubscriptionRequestForStatusUpdates',
              log('subscribe to status updates'),
            ],
          });

          const actor = createActor(
            permissionMonitoringMachine.provide({
              actors: {
                features: dummyFeatureMachineThatSubscribesTwice,
              },
            }),
            {
              parent: undefined,
              systemId: ActorSystemIds.permissionMonitoring,
            }
          ).start();

          expect(
            actor.getSnapshot().context.permissionSubscribers[
              Permissions.bluetooth
            ].length
          ).toEqual(1);
        });
      });
    });
  });

  it('handle the happy path of being invoked, checking permission initially and then handle a permission request', async () => {
    const permission: Permission = Permissions.microphone;

    const actorRef = createActor(permissionMonitoringMachine, {
      inspect: {
        next: (event: InspectionEvent) => {},
        error: (error) => {
          console.log(error);
        },
        complete: () => {
          console.log('complete');
        },
      },
    }).start();

    expect(actorRef.getSnapshot().context.permissionsStatuses).toStrictEqual({
      [Permissions.bluetooth]: PermissionStatuses.unasked,
      [permission]: PermissionStatuses.unasked,
    });

    expect(actorRef.getSnapshot().value).toStrictEqual({
      applicationLifecycle: 'applicationIsInForeground',
      permissions: {},
    });

    await waitFor(actorRef, (state) => {
      return (
        state.children.permissionCheckerAndRequesterMachineId!.getSnapshot()
          .value === 'idle'
      );
    });

    expect(actorRef.getSnapshot().context.permissionsStatuses).toStrictEqual({
      [Permissions.bluetooth]: PermissionStatuses.denied,
      [permission]: PermissionStatuses.denied,
    });

    actorRef.send({
      type: 'triggerPermissionRequest',
      permission: permission,
    });

    expect(
      actorRef
        .getSnapshot()
        .children.permissionCheckerAndRequesterMachineId!.getSnapshot().value
    ).toBe('requestingPermission');

    await waitFor(actorRef, (state) => {
      return (
        state.children.permissionCheckerAndRequesterMachineId!.getSnapshot()
          .value === 'idle'
      );
    });

    expect(actorRef.getSnapshot().context.permissionsStatuses).toStrictEqual({
      [Permissions.bluetooth]: PermissionStatuses.denied,
      [permission]: PermissionStatuses.granted,
    });
  });

  it('should immediately report back to parent if permission is already granted', async () => {});
  describe('Blocked Permission', () => {
    it('should immediately report back to parent if permission is blocked', async () => {});
  });
});
