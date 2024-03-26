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

const ApplicationLifecycleEvents = {
  applicationForegrounded: 'applicationForegrounded',
  applicationBackgrounded: 'applicationBackgrounded',
} as const;

export type ApplicationLifecycleEvent =
  (typeof ApplicationLifecycleEvents)[keyof typeof ApplicationLifecycleEvents];

export interface PermissionMachineActions {
  checkAllPermissions: () => Promise<PermissionStatusMapType>;
  requestBluetoothPermission: () => Promise<PermissionStatus>;
  requestMicrophonePermission: () => Promise<PermissionStatus>;
}

export type PermissionStatusMapType = Record<Permission, PermissionStatus>;

export const ApplicationLifecycleStates = {
  applicationInForeground: 'application is in foreground',
  applicationInBackground: 'application is in background',
} as const;

export const PermissionCheckingStates = {
  idle: 'idle',
  checking: 'checking',
} as const;

export type PermissionMonitoringMachineContext = {
  permissionStatuses: PermissionStatusMapType;
};
export type PermissionMonitoringMachineEvents =
  | { type: 'checkPermissions' }
  | {
      type: 'permissionChecked';
      permission: Permission;
      status: PermissionStatus;
    }
  | {
      type: 'triggerPermissionCheck';
      permission: Permission;
    }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    }
  | { type: 'applicationForegrounded' }
  | { type: 'applicationBackgrounded' };

export type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    };
