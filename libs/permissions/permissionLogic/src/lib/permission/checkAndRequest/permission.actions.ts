import { PermissionStatuses, Permissions } from '../../permission.types';
import { PermissionCheckAndRequestMachineActions } from './permissionCheckAndRequest.types';

export const unimplementedPermissionCheckAndRequestActions: PermissionCheckAndRequestMachineActions =
  {
    checkAllPermissions: () => {
      return new Promise((resolve) =>
        resolve({
          [Permissions.bluetooth]: PermissionStatuses.denied,
          [Permissions.microphone]: PermissionStatuses.denied,
        })
      );
    },
    requestBluetoothPermission: () => {
      return new Promise((resolve) => resolve(PermissionStatuses.granted));
    },
    requestMicrophonePermission: () => {
      return new Promise((resolve) => resolve(PermissionStatuses.granted));
    },
  } as const;
