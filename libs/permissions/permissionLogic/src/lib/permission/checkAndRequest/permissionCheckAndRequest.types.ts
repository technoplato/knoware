import {
  Permission,
  PermissionStatus,
  PermissionStatusMapType,
} from '../../permission.types';

export interface PermissionCheckAndRequestMachineActions {
  checkAllPermissions: () => Promise<PermissionStatusMapType>;
  requestBluetoothPermission: () => Promise<PermissionStatus>;
  requestMicrophonePermission: () => Promise<PermissionStatus>;
}

export type PermissionMachineEvents =
  | { type: 'triggerPermissionCheck' }
  | {
      type: 'triggerPermissionRequest';
      permission: Permission;
    };
