// permissionMonitoringMachine.test.ts

import {
  AnyActorRef,
  assign,
  createActor,
  InspectionEvent,
  log,
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
import {
  EmptyPermissionSubscriberMap,
  permissionMonitoringMachine,
} from './permissionMonitor.machine';
import { permissionCheckerAndRequesterMachine } from './permissionCheckAndRequestMachine';

const createPermissionHandlerActor = {
  permissions: [],
  permissionHandlerMap: {
    bluetooth: {
      granted: {
        action: '',
        target: '',
      },
      rvoked: {},
    },
  },
};

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
        'how we will allow feature machines to handle thier ' +
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
    const countingActor = createActor(countingMachineThatNeedsPermissionAt3, {
      // inspect: createSkyInspector({
      //   onerror: (err) => console.log(err),
      // }).inspect,
    }).start();
    countingActor.send({ type: 'count.inc' });
    countingActor.send({ type: 'count.inc' });
    countingActor.send({ type: 'count.inc' });
    countingActor.send({ type: 'count.inc' });
    expect(countingActor.getSnapshot().context.count).toBe(3);
    expect(countingActor.getSnapshot().value).toStrictEqual({
      counting: 'disabled',
      handlingPermissions: 'active',
    });
  });

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
        types: {} as { events: PermissionMonitoringMachineEvents },
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
              sendTo('someFooMachine', {
                type: 'triggerPermissionCheck',
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
      actorRef.send({ type: 'triggerPermissionCheck' });

      await waitFor(
        actorRef,
        (state) => state.children.someFooMachine?.getSnapshot().value === 'idle'
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
    describe('Single Subscriber', () => {
      const dummyFeatureMachine = setup({
        actions: {
          sendSubscriptionRequestForStatusUpdates:
            //TODO this is not sending figure out whhy
            sendTo(
              ({ system }) => {
                const actorRef: AnyActorRef = system.get('bigKahuna');
                console.log({ actorRef });
                return actorRef;
              },
              {
                type: 'subscribeToPermissionStatuses',
                // permissions: [Permissions.bluetooth],
              }
            ),
          // satisfies /*TODO type these events to the receiving machine event type*/ AnyEventObject);
        },
      }).createMachine({
        id: 'dummyFeatureId',
        entry: [
          'sendSubscriptionRequestForStatusUpdates',
          log('subscribe to status updates'),
        ],
      });
      it('should allow subscriptions from a subscriber to any permissions', () => {
        const actor = createActor(permissionMonitoringMachine, {
          parent: undefined,
          systemId: 'bigKahuna',
        }).start();

        const dummyFeatureActor = createActor(dummyFeatureMachine).start();

        const state = actor.getSnapshot();
        expect(
          state.context.permissionSubscribers?.[Permissions.bluetooth]
            ?.length ?? 0
        ).toEqual(1);
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
