// permissionMonitoringMachine.test.ts

import {
  ActorRef,
  InspectionEvent,
  Snapshot,
  assertEvent,
  assign,
  createActor,
  enqueueActions,
  fromCallback,
  fromPromise,
  log,
  raise,
  sendTo,
  setup,
  waitFor,
} from 'xstate';

import { unimplementedPermissionMachineActions } from './permission.actions';
import {
  InitialPermissionStatusMap,
  Permission,
  PermissionMachineEvents,
  PermissionStatus,
  PermissionStatusMapType,
  PermissionStatuses,
  Permissions,
} from './permission.types';

export type ParentEvent =
  | {
      type: 'allPermissionsChecked';
      statuses: PermissionStatusMapType;
    }
  | { type: 'triggerPermissionRequest'; permission: Permission }
  | {
      type: 'permissionRequestCompleted';
      status: PermissionStatus;
      permission: Permission;
    }
  | { type: 'triggerPermissionCheck' }
  | { type: 'applicationForegrounded' }
  | { type: 'applicationBackgrounded' };

type ApplicationLifecycleState =
  | 'applicationForegrounded'
  | 'applicationBackgrounded';
type ApplicationStateChangeHandler = (event: ApplicationLifecycleState) => void;
const stubSubscribeToApplicationStateChanges = (
  handleApplicationStateChange: ApplicationStateChangeHandler
) => {
  console.log('subscribed to fake handler');
  handleApplicationStateChange('applicationForegrounded');

  return () => {
    console.log('unsubscribed from fake handler');
  };
};

const stubApplicationLifecycleReportingActorLogic =
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
        types: {} as { events: ParentEvent },
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
        types: {} as { events: ParentEvent },
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

describe('Permission Monitoring Machine', () => {
  it('handle the happy path of being invoked, checking permission initially and then handle a permission request', async () => {
    const permissionMonitoringMachine = setup({
      types: {} as {
        events: ParentEvent;
        context: { permissionsStatuses: PermissionStatusMapType };
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
        sendPermissionRequest: sendTo(
          'someFooMachine',
          ({ context, event }) => {
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
      id: 'bigKahuna',
      type: 'parallel',

      context: {
        permissionsStatuses: InitialPermissionStatusMap,
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
            allPermissionsChecked: {
              actions: 'assignPermissionCheckResultsToContext',
            },
            triggerPermissionCheck: {
              actions: [log('permission trigger check'), 'sendPermissionCheck'],
            },
            triggerPermissionRequest: {
              actions: [
                log('triggering permission request'),
                'sendPermissionRequest',
              ],
            },

            permissionRequestCompleted: {
              actions: 'assignPermissionRequestResultToContext',
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

    expect(actorRef.getSnapshot().context).toStrictEqual({
      permissionsStatuses: {
        [Permissions.bluetooth]: PermissionStatuses.unasked,
        [permission]: PermissionStatuses.unasked,
      },
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

    expect(actorRef.getSnapshot().context).toStrictEqual({
      permissionsStatuses: {
        [Permissions.bluetooth]: PermissionStatuses.denied,
        [permission]: PermissionStatuses.denied,
      },
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

    expect(actorRef.getSnapshot().context).toStrictEqual({
      permissionsStatuses: {
        [Permissions.bluetooth]: PermissionStatuses.denied,
        [permission]: PermissionStatuses.granted,
      },
    });
  });

  it('should immediately report back to parent if permission is already granted', async () => {});
  describe('Blocked Permission', () => {
    it('should immediately report back to parent if permission is already granted', async () => {});
  });
});

const permissionCheckerAndRequesterMachine = setup({
  types: {
    context: {} as {
      parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
      statuses: PermissionStatusMapType;
    },
    events: {} as PermissionMachineEvents,
    input: {} as {
      parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
    },
  },

  actions: {
    checkedSendParent: enqueueActions(
      ({ context, enqueue }, event: ParentEvent) => {
        if (!context.parent) {
          console.log(
            'WARN: an attempt to send an event to a non-existent parent'
          );
          return;
        }

        enqueue.sendTo(context.parent, event);
      }
    ),

    savePermissionRequestOutput: assign({
      statuses: ({ context, event }) => {
        return {
          ...context.statuses,
          // @ts-expect-error TODO how do I type these actions?
          [event.output.permission]: event.output.status,
        };
      },
    }),

    savePermissionCheckResult: assign({
      // @ts-expect-error TODO how do I type these actions?
      statuses: ({ event }) => event.output,
    }),

    /**
     * I tried putting reportPermissionRequestResult as an action, but it requied
     * use of checkedSendParent and ran into this error when attempting to use that
     *
     * in onDone, but it didn't work
     *
     * error: Type '"checkedSendParent"' is not assignable to type '"triggerPermissionRequest"'.ts(2322)
     */
    // reportPermissionRequestResult: raise({
    //   type: 'checkedSendParent',
    //   params({ event }) {
    //     console.log(JSON.stringify(event, null, 2));

    //     return {
    //       type: 'permissionRequestCompleted',
    //       status: event.output.status,
    //       permission: event.output.permission,
    //     };
    //   },
    // }),
  },

  actors: {
    checkAllPermissions: fromPromise(async () => {
      const result =
        // TODO how can i make this implementation more injectable and still ergnomic
        await unimplementedPermissionMachineActions.checkAllPermissions();

      return result;
    }),

    requestPermission: fromPromise(
      async ({
        input: { permission },
      }: {
        input: { permission: Permission };
      }): Promise<{
        permission: Permission;
        status: PermissionStatus;
      }> => {
        let status: undefined | PermissionStatus = undefined;

        switch (permission) {
          case Permissions.bluetooth:
            status =
              // TODO how can i make this implementation more injectable and still ergnomic
              await unimplementedPermissionMachineActions.requestBluetoothPermission();
            break;

          case Permissions.microphone:
            status =
              // TODO how can i make this implementation more injectable and still ergnomic
              await unimplementedPermissionMachineActions.requestMicrophonePermission();
            break;
        }

        return { status, permission };
      }
    ),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAFwCdcoZ6AFMe1XWWXAe3wBhbGEwBrANoAGALqJQABz69a-fPJAAPRAFoArAHYAjCUNSDANgN6AzBYAsB+3oA0IAJ66jtkvaM2pAA5gwKMLfzsAX0i3NCw8QlJyKjpGZg52Tm5eAQAlMABHAFc4Wmk5JBAlFTUNbQR9A0CSACYDG0CAThbbBydXD0QbTpIwqRsmzoNu8dto2IwcAmISekKS2FV8KEyuHjVqCAEwMnwANz4xE7ilxNX10oIdjj2c-AQCC8x0VQFy8o01Vwv3UlXqOmaRns9kCUiMRikLUCAU68LcngQ8IsJCClk6egsyKRensnXmIBuCRWOFEYieu2yalgh2OpwuVxIlOWpBp4npL0ZAlgH3OfG+IP+skBymBtTBXhsJE6wT0tksTkRnU66N0SMV3QMswsxocUgs0RiIHwfAgcA0XMS0pqAjqugsLWxbQ63V6jmcOoatmaiPsFiCQW8bXNlodK2SYCdspd8sDcJINj08IMPUcE0CAwx+ns6ZaRimnURZo9NnJsdIa2Kj22DP2ycUMpBroapZIxqk9g9JsCFhsRha9gDARaJGRpMz4T8nXstcWVJ5Ij5zYFrfw8EqQM7KZ0bVM-aM0xso-sGdLAZ0zikpnHYdhoT0UYtkSAA */
  context: ({ input }) => ({
    parent: input.parent,
    statuses: InitialPermissionStatusMap,
  }),

  initial: 'idle',

  states: {
    idle: {
      on: {
        triggerPermissionCheck: {
          target: 'checkingPermissions',
          actions: [log('child triggerPermissionCheck')],
        },
        triggerPermissionRequest: { target: 'requestingPermission' },
      },
    },

    requestingPermission: {
      invoke: {
        src: 'requestPermission',
        // @ts-expect-error TODO how do I get this type?
        input: ({ context, event }) => ({ permission: event.permission }),
        onDone: {
          target: 'idle',
          actions: [
            'savePermissionRequestOutput',
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
                return {
                  type: 'permissionRequestCompleted',
                  status: event.output.status,
                  permission: event.output.permission,
                };
              },
            },
          ],
        },
      },
    },

    checkingPermissions: {
      invoke: {
        src: 'checkAllPermissions',
        onDone: {
          target: 'idle',
          actions: [
            log('child on done checkingPermissions'),
            'savePermissionCheckResult',

            {
              type: 'checkedSendParent',
              params({ event }) {
                return {
                  type: 'allPermissionsChecked',
                  statuses: event.output,
                };
              },
            },
          ],
        },
      },
    },
  },
});
