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
  /*not working atm*/ // countingPermissionReporter: 'countingPermissionReporterMachineId',
  someFeature: 'someFeatureMachineId',
} as const;
