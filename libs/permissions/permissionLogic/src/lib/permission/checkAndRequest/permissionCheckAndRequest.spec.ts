import { ActorSystem, createActor, sendTo, setup, waitFor } from 'xstate';
import { ActorSystemIds } from '../../application/actorIds';
import {
  Permission,
  PermissionStatuses,
  Permissions,
} from '../../permission.types';
import { permissionCheckerAndRequesterMachine } from '../checkAndRequest/permissionCheckAndRequestMachine';
import { PermissionMonitorActorRef } from '../monitoring/permissionMonitor.machine';
import { PermissionMonitoringMachineEvents } from '../monitoring/permissionMonitor.types';

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
      expect(bluetoothPermissionActor.getSnapshot().context.statuses).toEqual({
        [Permissions.bluetooth]: PermissionStatuses.unasked,
        [Permissions.microphone]: PermissionStatuses.unasked,
      });

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
