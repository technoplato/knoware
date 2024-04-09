import { PermissionSubscriberMap } from './permissionMonitor.types';
import { Permissions, PermissionStatusMapType } from '../../permission.types';

export const EmptyPermissionSubscriberMap: PermissionSubscriberMap =
  Object.values(Permissions).reduce(
    (acc, permission) => ({
      ...acc,
    }),
    {} as PermissionSubscriberMap
  );
export type PermissionsMonitoringMachineContext = {
  permissionsStatuses: PermissionStatusMapType;
  permissionSubscribers: PermissionSubscriberMap;
};
