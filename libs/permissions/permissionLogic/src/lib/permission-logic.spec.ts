// permissionMonitoringMachine.test.ts
const prettyMuchForever = Math.pow(2, 31) - 1;

import {
  AnyActorRef,
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

const ActorSystemIds = {
  permissionMonitoring: 'permissionMonitoringMachineId',
  permissionReporting: 'permissionReportingMachineId',
  permissionCheckerAndRequester: 'permissionCheckerAndRequesterMachineId',
} as const;

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
export type SimpleInspectorOptions = {
  onLiveInspectActive?: (url: string) => Promise<void>;
};

export function createSimpleInspector(options: SimpleInspectorOptions = {}) {
  const { onLiveInspectActive } = options;
  const liveInspectUrl = 'https://example.com/inspect/session123';

  // Simulate the WebSocket onopen event with a promise that resolves after 500ms
  const socketOpenPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log('WebSocket opened');
      resolve();
    }, 500);
  });

  // Return an object with a method to wait for the live inspect session to be active
  return {
    waitForLiveInspectActive: async () => {
      await socketOpenPromise;
      if (onLiveInspectActive) {
        await onLiveInspectActive(liveInspectUrl);
      }
    },
  };
}

// describe('createSkyInspector', () => {
//   it(
//     /* ⚠️failing attempt to debug with stately sky*/ 'should wait for the live inspect session to be active',
//     async () => {
//       const mockCallback = jest.fn();
//
//       const { waitForLiveInspectActive, inspector } = createSkyInspector({
//         onLiveInspectActive: async (url) => {
//           await new Promise((resolve) => setTimeout(resolve, 1000));
//           mockCallback(url);
//         },
//       });
//
//       // Call the waitForLiveInspectActive function without awaiting its completion
//       const waitPromise = waitForLiveInspectActive();
//
//       // Assert that the inspector object is created
//       expect(inspector).toBeDefined();
//
//       // Wait for a short time (less than the WebSocket open delay and callback delay)
//       await new Promise((resolve) => setTimeout(resolve, 300));
//
//       // Assert that the callback has not been called yet
//       expect(mockCallback).not.toHaveBeenCalled();
//
//       // Wait for the waitForLiveInspectActive promise to resolve
//       /* ✅This is properly being awaited*/ await waitPromise;
//
//       // Assert that the callback has been called with the correct URL
//       // expect(mockCallback).toHaveBeenCalledWith(
//       //   'https://stately.ai/inspect/session123'
//       // );
//
//       const countingActor = createActor(countingMachineThatNeedsPermissionAt3, {
//         inspect: inspector.inspect,
//       }).start();
//
//       /* 🤔 If I set a brekapoint here, then the inspector won't "connect" until the promise at the bottom*/ countingActor.send(
//         { type: 'count.inc' }
//       );
//       countingActor.send({ type: 'count.inc' });
//       countingActor.send({ type: 'count.inc' });
//       countingActor.send({ type: 'count.inc' });
//       expect(countingActor.getSnapshot().context.count).toBe(3);
//       expect(countingActor.getSnapshot().value).toStrictEqual({
//         counting: 'disabled',
//         handlingPermissions: 'active',
//       });
//
//       await new Promise((resolve) => setTimeout(resolve, prettyMuchForever));
//     },
//     prettyMuchForever
//   );
// });

describe('createSimpleInspector', () => {
  it('should wait for the live inspect session to be active', async () => {
    const mockCallback = jest.fn();

    const inspector = createSimpleInspector({
      onLiveInspectActive: async (url) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        mockCallback(url);
      },
    });

    // Call the waitForLiveInspectActive method without awaiting its completion
    const waitPromise = inspector.waitForLiveInspectActive();

    // Wait for a short time (less than the WebSocket open delay and callback delay)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Assert that the callback has not been called yet
    expect(mockCallback).not.toHaveBeenCalled();

    // Wait for the waitForLiveInspectActive promise to resolve
    await waitPromise;

    // Assert that the callback has been called with the correct URL
    expect(mockCallback).toHaveBeenCalledWith(
      'https://example.com/inspect/session123'
    );
  });
});

describe('Counting Machine That Needs Permission At 3', () => {
  it('should not increment count beyond 3, but rather ask permission', async () => {
    // const inspector = await createSkyInspector({
    //   onerror: (err) => console.log(err),
    //   onLiveInspectActive: async (url) => {
    //     console.log('Live inspect session is active!');
    //     console.log('URL:', url);
    //     console.log('Async operations completed!');
    //   },
    // });
    const countingActor = createActor(countingMachineThatNeedsPermissionAt3, {
      // inspect: inspector.inspect,
    }).start();

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
          children: {
            [ActorSystemIds.permissionCheckerAndRequester]: 'permissionCheckerAndRequesterMachine';
          };
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
        types: {} as { events: PermissionMonitoringMachineEvents },
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
              sendTo('someFooMachine', {
                type: 'triggerPermissionRequest',
                permission: Permissions.bluetooth,
              }),
            ],
          },
        },
        invoke: {
          id: 'someFooMachine',
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
        (state) => state.children.someFooMachine?.getSnapshot().value === 'idle'
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
        },
        context: {} as {
          permissions: Array<Permission>;
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
      },
    }).createMachine({
      description:
        "This actor's job is to report permission statuses to the actors that have invoked it. We abstract away this functionality so that it is reusable by any actor that needs it and so they don't need to know how permissions are checked. This keeps control centralized and easy to modify the behavior of.",
      id: ActorSystemIds.permissionReporting,
      context: ({ input }) => ({ permissions: input.permissions }),
      entry: [
        'sendSubscriptionRequestForStatusUpdates',
        log('subscribe to status updates'),
      ],
      on: {
        permissionStatusChanged: {
          // We eventually want to communicate this to the actors that have invoked us
          actions: [
            log(
              ({ event }) =>
                event.permission + ' status changed' + ' to ' + event.status
            ),
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
        foo: {
          initial: 'start',
          states: {
            start: {
              entry: raise({ type: 'goToWaitingForPermission' }),
              on: { goToWaitingForPermission: 'waitingForPermission' },
            },
            waitingForPermission: {
              entry: raise({ type: 'goToWaitingForPermission' }),
              on: {
                'permission.granted.bluetooth': { target: 'bluetoothGranted' },
                'permission.denied.bluetooth': { target: 'bluetoothDenied' },
              },
            },
            bluetoothGranted: {
              type: 'final',
            },
            bluetoothDenied: {
              type: 'final',
            },
          },
        },
        handlingPermissions: {
          invoke: {
            id: 'permissionHandler',
            src: 'permissionReportingMachine',
            input: { permissions: [Permissions.bluetooth] },
          },
          on: {
            permissionStatusChanged: {
              actions: [
                enqueueActions(({ context, event, enqueue }) => {
                  const { permission, status } = event;
                  console.log({ permission, status });
                  if (permission === Permissions.bluetooth) {
                    if (status === PermissionStatuses.granted) {
                      enqueue.raise({
                        type: 'permission.bluetooth.granted',
                      });
                    }
                  }
                }),
                log(
                  ({ event }) =>
                    event.permission + ' status changed' + ' to ' + event.status
                ),
              ],
            },
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
      });

      it('should notify subscribers of changes to permissions', () => {
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

        const child = Object.keys(actor.getSnapshot().children);
        console.log({ child });
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
        // @ts-expect-error
        state.children.someFooMachine?.getSnapshot().value === 'idle'
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
      // @ts-expect-error
      actorRef.getSnapshot().children.someFooMachine?.getSnapshot().value
    ).toBe('requestingPermission');

    await waitFor(actorRef, (state) => {
      // @ts-expect-error
      return state.children.someFooMachine?.getSnapshot().value === 'idle';
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
