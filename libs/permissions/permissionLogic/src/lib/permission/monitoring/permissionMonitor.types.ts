import { AnyActorRef } from 'xstate';
import {
  Permission,
  PermissionStatus,
  PermissionStatusMapType,
} from '../../permission.types';

export type PermissionMonitoringMachineEvents =
  | {
      type: 'subscribeToPermissionStatuses';
      permissions: Permission[];
      self: AnyActorRef;
    }
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

export type PermissionMonitoringMachineContext = {
  permissionStatuses: PermissionStatusMapType;
};

export type PermissionSubscribers = Array<AnyActorRef>;
export type PermissionSubscriberMap = Record<Permission, PermissionSubscribers>;
