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

const forever = 2 ^ (28 - 1);
const countingMachineThatNeedsPermissionAt3 = setup({
  actors: {
    permissionReportingMachine,
  },
  types: {
    context: {} as { count: number; permissionStatus: PermissionStatus },
    events: { type: 'count.inc' },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMD2BXAdgFwJaagEFMIAFMAJwFtdZZdVNYA6NLPA5sTAQwCMANpADEbHM3zIA2gAYAuolAAHVPTyNFIAB6IA7ACYANCACeiAIwBWc8xl27AZhm6rDpw4C+H42I5ES5NS09IwsvvhQXLyCIr4SmNLmCkggKmoMmJo6CPoAHA7M1pYAbM4AnLoOLpZGpoj61sxllg7mVZbN5gYALLle3iCYqBBwmuEExGSUNHQZ8ClpuOqZKdkAtPrdzMWWuboyZeZlZd1lDsUOxmYIG1v2Mm0uus1l+vpePhg4EZOBMyFMVhfPyaRbLLL1bpXRAXZinY4nCoOMoPGTdYofEDjfxTIKzUJA9gRKL8IQQUGqJYZCEIcz6GyWXTdfQHBo7GrQnI1OEtR4daw9PoDbG-abBOaE76cCC0UmQCnpDSrRA1XLMLplYq5Rn6E7o4qchr6HmtGTWc7dbqtTEigJi-GAgAWPBIAgif3FoQVVKVoGy+gKDm6dJRuTslhkF10nIcuTVEZkbhkuU1Vt0uW6NuBPzteIBLGdrvd9vzEggQm94OVCHT23ZZv2lUeBrqCG6umKtjs+mKums7e6JUzwuzE1z-wlhfLxbzEp4yDwADcwJXqdWXMwgyHk+HI1VOS0tgm8marMdzEKvEA */
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
                target: ['disabled'],
              },
            ],
          },
        },
        disabled: {
          id: 'countingDisabled',
          on: {
            'permission.granted.bluetooth': { target: 'enabled' },
            'permission.denied.bluetooth': { target: 'bluetoothDenied' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                // @ts-expect-error TODO make this type safe
                permission: Permissions.bluetooth,
              }),
            },
          },
        },
        bluetoothDenied: {
          on: {
            'permission.granted.bluetooth': { target: 'enabled' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                // @ts-expect-error TODO make this type safe
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
                // @ts-expect-error TODO make this type safe
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
      handlingPermissions: {},
    });

    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().value).toStrictEqual({
      counting: 'disabled',
      handlingPermissions: {},
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
      handlingPermissions: {},
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

    const someFeatureMachine = setup({
      actors: {
        permissionReportingMachine,
      },
    }).createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5SwPYFswDEwEMAuArgE5gCyOAxgBYCWAdmAJIQB0ANilFPVAMQBUAbQAMAXUSgADilg08NFHQkgAHogCcANgAsLbZuHqAzAA4TAdm2GArEYA0IAJ6Ijw83vOv1AJmEBGa28THwBfEIdUDGx8YjJKWgZmFgAzFBQWWDwcIjxeKBQAFRQAdRw5HkwUIgAFMCI0GlhZRRFxJBBpWXlFZTUEb1cWdVs-XyNjYWtrP20HZwRNb3dF41MjJe9fPzCI9CxcQhJyanomVlT0gHcy+TooSpq6hqaFOl5JJ8bmuhYoIhw6HhICwAEZsAhgPBpPBUVrKTrlHrtPomIyaFjmYLCCxBdSTEx+OaIczWdH6byaSmGExubTbcIgSL7GJHeKnJIXFjXcp3B61epfV7vT4vRQsCBgOg0YFgiFQlAwuHtBHdJTIxCo9GYvE4rHWAlEhZBPSLTTmPxUqZGaw7Rl7aKHOInRLnNJcm4VKr857fXgEWB1cU0CAFHCSABC4Mh0KoACUwABHCGZb2ClpieEyRFq0B9bQmbwmizmbzGSwDayG2xGIYU7x+C3mTFmoy2pkO2LHBJnFJu2XRhVUAAikulEGFAtFPz+AKBrH78sVGeVWdVvUQM001hY3m0m2Em2tQQLhs01oxozNB806lWmjb9oOnbZLt76QXMZHUsgfoDRCDIZhpGcoxvGSZwHgqZTkqUirq864IA2fjCLWfhmJimq2OYVZGLoJLDNo1j+KMwiTA+URPqyzo9lQAIQGwPBQd8sATj6rylLAYHJnOMEdHBSK5hq6i6HuaHmn41pWPqhoEiw0y3gpdJmIE5hhAydAoBK8DtO2lFOt2zCZl08HqggAC0u6GmZ27qDSpH2Q5pHaORzKOl27KsBwXA8EZ2YIdo2FOIgUm1osvhuOo5ikcMLkdlRBmuigvlrqZllBQg2j6HodYNp41i2d4sV6e5r6cpk2R4MlJmCQgJansIugrNayEmHuwhnkVLL6R5b7ujy9xeiK3xVQJqiIFMuh+MM6w6FNSw3qe55GOYd7GFSwitgyuldSVPach+g4AOL-ICkAjTmY2IZYujLURB4FrZrWnnuLBNUsyGEZM9K7BRO0vntfZRouw6jmdK7GaNfQkShzX6iSpImNY+iLei9YUlFFK3kYaKdW5-1JLRdD0YxQ2vNpsEQxdeaBfMaGFpFRijIEpGaGhm1hEAA */
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
