import {
  PermissionStatuses,
  PermissionStatusMapType,
  Permissions,
} from './permission.types';

export const InitialPermissionStatusMap: PermissionStatusMapType = {
  [Permissions.bluetooth]: PermissionStatuses.unasked,
  [Permissions.microphone]: PermissionStatuses.unasked,
} as const;
