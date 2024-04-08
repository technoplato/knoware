export const ActorSystemIds = {
  application: 'applicationMachineId',
  // Top level system like stuff
  systemManagement: 'systemManagementMachineId',

  // Permissions
  permissionMonitoring: 'permissionMonitoringMachineId',
  permissionReporting: 'permissionReportingMachineId',
  permissionCheckerAndRequester: 'permissionCheckerAndRequesterMachineId',

  // Lifecycle reporting
  lifecycleReporting: 'lifecycleReportingMachineId',

  // Root of features machine
  features: 'featuresMachineId',
  // Features
  counting: 'countingMachineId',
  someFeature: 'someFeatureMachineId',
} as const;
