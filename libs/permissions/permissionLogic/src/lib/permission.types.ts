import { AnyActorRef } from 'xstate';

export const Permissions = {
  bluetooth: 'bluetooth',
  microphone: 'microphone',
} as const;
export type Permission = (typeof Permissions)[keyof typeof Permissions];
export const PermissionStatuses = {
  unasked: 'unasked',
  granted: 'granted',
  denied: 'denied',
  revoked: 'revoked',
  blocked: 'blocked',
} as const;
export type PermissionStatus =
  (typeof PermissionStatuses)[keyof typeof PermissionStatuses];

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

export interface PermissionMachineActions {
  checkAllPermissions: () => Promise<PermissionStatusMapType>;
  requestBluetoothPermission: () => Promise<PermissionStatus>;
  requestMicrophonePermission: () => Promise<PermissionStatus>;
}

export type PermissionStatusMapType = Record<Permission, PermissionStatus>;

export const PermissionCheckingStates = {
  idle: 'idle',
  checking: 'checking',
} as const;

export type PermissionMonitoringMachineContext = {
  permissionStatuses: PermissionStatusMapType;
};

export type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    };
