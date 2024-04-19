import { createSkyInspector } from '@statelyai/inspect';
import WebSocket from 'ws';
import { ActorSystem, createActor, waitFor } from 'xstate';
import { ActorSystemIds } from '../../application/actorIds';
import { applicationMachine } from '../../application/application.machine';
import { PermissionStatuses, Permissions } from '../../permission.types';
import {
  PermissionMonitorActorRef,
  PermissionMonitoringSnapshot,
} from '../../permission/monitoring/permissionMonitor.machine';
import { countingMachineThatNeedsPermissionAt3 } from './counting.machine';

const vLongTime = 1000000000;
type JESActorSystem = ActorSystem<{
  actors: {
    [ActorSystemIds.permissionMonitoring]: PermissionMonitorActorRef;
    // [ActorSystemIds.countingPermissionReporter]: PermissionReportingActorRef;
  };
}>;

describe('Counting Machine That Needs Permission At 3', () => {
  describe('Actor system tests', () => {
    it(
      'should increment count to 3, ask for permission, and continue counting to 5 when permission is granted',
      async () => {
        const applicationActor = createActor(applicationMachine, {
          systemId: ActorSystemIds.application,
          inspect: createSkyInspector({
            // @ts-expect-error
            WebSocket: WebSocket,
            inspectorType: 'node',
            autoStart: true,
          }).inspect,
        });
        applicationActor.start();
        const actorSystem: JESActorSystem = applicationActor.system;

        const permissionMonitorActor = actorSystem.get(
          ActorSystemIds.permissionMonitoring
        )!;

        const countingPermissionReporter = applicationActor.system.get(
          'permissionReportingCounting'
        );

        // @ts-expect-error this means the actor system type is working as expected
        permissionMonitorActor.getSnapshot().value === 'foo';
        permissionMonitorActor?.getSnapshot().value.applicationLifecycle ===
          'applicationInBackground';

        // @ts-expect-error this means the actor system type is working as expected
        permissionMonitorActor.getSnapshot().context === 'foo';

        expect(permissionMonitorActor).toBeDefined();
        expect(countingPermissionReporter).toBeDefined();

        /* Required due to a bug in the initialization of actor systems*/ await new Promise(
          (resolve) => setTimeout(resolve, 0)
        );

        const state: PermissionMonitoringSnapshot =
          permissionMonitorActor?.getSnapshot();

        console.log({
          v: state.context.permissionSubscribers[Permissions.bluetooth].map(
            (s) => s.id
          ),
        });

        expect(
          state.context.permissionSubscribers[Permissions.bluetooth]?.length
        ).toEqual(2);

        const countingActor = applicationActor.system.get(
          ActorSystemIds.counting
        );

        expect(countingActor?.getSnapshot().value).toStrictEqual({
          counting: 'enabled',
          handlingPermissions: {},
        });

        countingActor.send({ type: 'count.inc' });
        countingActor.send({ type: 'count.inc' });
        countingActor.send({ type: 'count.inc' });
        expect(countingActor.getSnapshot().context.count).toBe(3);
        expect(countingActor.getSnapshot().value).toStrictEqual({
          counting: 'disabled',
          handlingPermissions: {},
        });

        countingActor.send({ type: 'count.inc' });
        expect(countingActor.getSnapshot().context.count).toBe(3);
        expect(countingActor.getSnapshot().value).toStrictEqual({
          counting: 'disabled',
          handlingPermissions: {},
        });

        // Configure the permission actor to grant permission
        const permissionCheckerActor = applicationActor.system.get(
          ActorSystemIds.permissionCheckerAndRequester
        );

        countingActor.send({ type: 'user.didTapBluetoothRequestPermission' });

        await waitFor(
          permissionCheckerActor,
          (state) => state.value === 'idle'
        );

        expect(countingActor.getSnapshot().value).toStrictEqual({
          counting: 'enabled',
          handlingPermissions: {},
        });

        expect(countingActor.getSnapshot().context.permissionStatus).toBe(
          PermissionStatuses.granted
        );

        // Send 'count.inc' events to increment the count to 5
        countingActor.send({ type: 'count.inc' });
        countingActor.send({ type: 'count.inc' });

        expect(countingActor.getSnapshot().context.count).toBe(5);
        expect(countingActor.getSnapshot().value.counting).toStrictEqual(
          'finished'
        );
        ///* Required for debugging with stately inspector */ await new Promise((resolve) => setTimeout(resolve, vLongTime));
      },
      vLongTime
    );
  });

  describe('Actor unit tests', () => {
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
});
