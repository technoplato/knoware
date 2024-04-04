// permissionMonitoringMachine.test.ts
import { ActorSystemIds } from './actorIds';

import { createSkyInspector } from '@statelyai/inspect';
import { WebSocket } from 'ws';
import {
  AnyActorRef,
  AnyEventObject,
  assign,
  createActor,
  enqueueActions,
  InspectionEvent,
  log,
  raise,
  sendTo,
  setup,
  waitFor,
} from 'xstate';
import {
  Permission,
  PermissionMonitoringMachineEvents,
  Permissions,
  PermissionStatus,
  PermissionStatuses,
} from './permission.types';
import { permissionCheckerAndRequesterMachine } from './permissionCheckAndRequestMachine';
import {
  EmptyPermissionSubscriberMap,
  permissionMonitoringMachine,
} from './permissionMonitor.machine';

const forever = 2 ^ (28 - 1);
const countingMachineThatNeedsPermissionAt3 = setup({
  types: {
    context: {} as { count: number; permissionStatus: PermissionStatus },
    events: { type: 'count.inc' },
  },
}).createMachine({
  type: 'parallel',
  id: 'countingAndPermissions',
  context: {
    count: 0,
    permissionStatus: PermissionStatuses.unasked,
  },
  states: {
    counting: {
      initial: 'enabled',
      states: {
        enabled: {
          on: {
            'count.inc': [
              {
                guard: ({ context }) => context.count < 3,
                actions: assign({ count: ({ context }) => context.count + 1 }),
              },

              {
                target: ['disabled', '#permissionHandler.active'],
              },
            ],
          },
        },
        disabled: { id: 'countingDisabled' },
      },
    },

    handlingPermissions: {
      description:
        'This state is a placeholder for designing' +
        'how we will allow feature machines to handle their ' +
        "permissions. Right now we're doing everything inline" +
        'but this will be extracted to something that is ' +
        'straightforward for the end developer to use and test',
      id: 'permissionHandler',
      /**
       * what should go here....
       *
       * 1) This might need to be a parallel state machine if we want to
       * have a functionality for handling revoked permissions
       *
       * - we need to handle
       * permission granted,
       * permission denied,
       * permission revoked (optional) if not you have a bug [EXCLUDE for iteration 1]
       *
       * 🤔 Thoughts:
       * This could just be an actor we invoke that communicates
       * up to the permission monitoring machine...
       *  input: [permission]
       *
       *
       */
      // invoke: {
      //   src: 'permissionReportingMAchine'
      //   input: {
      //     permissions: [Permissions.bluetooth]
      // }

      initial: 'idle',
      states: {
        idle: {},
        active: {},
      },
    },
  },
});

describe('Counting Machine That Needs Permission At 3', () => {
  it('should not increment count beyond 3, but rather ask permission', async () => {
    const countingActor = createActor(
      countingMachineThatNeedsPermissionAt3,
      {}
    ).start();

    countingActor.send({ type: 'count.inc' });
    countingActor.send({ type: 'count.inc' });
    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().context.count).toBe(3);
    expect(countingActor.getSnapshot().value).toStrictEqual({
      counting: 'enabled',
      handlingPermissions: 'idle',
    });

    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().value).toStrictEqual({
      counting: 'disabled',
      handlingPermissions: 'active',
    });
    expect(countingActor.getSnapshot().context.count).toBe(3);

    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().context.count).toBe(3);

    // await new Promise((resolve) => setTimeout(resolve, prettyMuchForever));
  }); // prettyMuchForever

  it('should start in idle state', async () => {
    const countingActor = createActor(
      countingMachineThatNeedsPermissionAt3
    ).start();
    expect(countingActor.getSnapshot().value).toStrictEqual({
      counting: 'enabled',
      handlingPermissions: 'idle',
    });
  });

  it('should increment count', async () => {
    const countingActor = createActor(
      countingMachineThatNeedsPermissionAt3
    ).start();
    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().context.count).toBe(1);
  });
});

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

export type PermissionSubscribers = Array<AnyActorRef>;
export type PermissionSubscriberMap = Record<Permission, PermissionSubscribers>;

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

    const permissionReportingMachine = setup({
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
      id: ActorSystemIds.permissionReporting,
      context: ({ input }) => ({
        permissions: input.permissions,
        parent: input.parent,
      }),
      entry: [
        'sendSubscriptionRequestForStatusUpdates',
        log('subscribe to status updates'),
      ],
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
                if (
                  permission === Permissions.bluetooth &&
                  status === 'granted'
                ) {
                  console.log('its granted yaya');
                  return {
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

    const someFeatureMachine = setup({
      actors: {
        permissionReportingMachine,
      },
    }).createMachine({
      id: 'someFeatureMachineId',
      type: 'parallel',
      states: {
        logging: {
          on: {
            '*': {
              actions: [
                ({ event }) => {
                  console.log('logging::::' + JSON.stringify(event, null, 2));
                },
              ],
            },
          },
        },
        foo: {
          initial: 'start',
          states: {
            start: {
              entry: raise({ type: 'goToWaitingForPermission' }),
              on: { goToWaitingForPermission: 'waitingForPermission' },
            },
            waitingForPermission: {
              on: {
                'permission.granted.bluetooth': { target: 'bluetoothGranted' },
                'permission.denied.bluetooth': { target: 'bluetoothDenied' },
                'user.didTapBluetoothRequestPermission': {
                  actions: raise({
                    type: 'permissionWasRequested',
                    permission: Permissions.bluetooth,
                  }),
                },
              },
            },
            bluetoothGranted: {
              type: 'final',
            },
            bluetoothDenied: {
              on: {
                'permission.granted.bluetooth': { target: 'bluetoothGranted' },
                'user.didTapBluetoothRequestPermission': {
                  actions: raise({
                    type: 'permissionWasRequested',
                    permission: Permissions.bluetooth,
                  }),
                },
              },
            },
          },
        },
        handlingPermissions: {
          on: {
            permissionWasRequested: {
              actions: [
                sendTo('permissionHandler', ({ event }) => {
                  return {
                    type: 'requestPermission',
                    permission: event.permission,
                  };
                }),
              ],
            },
          },
          invoke: {
            id: 'permissionHandler',
            src: 'permissionReportingMachine',
            input: ({ self }) => ({
              permissions: [Permissions.bluetooth],
              parent: self,
            }),
          },
        },
      },
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
        console.log({ id });
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
          logging: {},
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
          ];

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
          logging: {},
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
          logging: {},
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
    it('should immediately report back to parent if permission is already granted', async () => {});
  });
});
