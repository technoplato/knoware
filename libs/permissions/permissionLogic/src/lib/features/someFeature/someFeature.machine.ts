import { raise, sendTo, setup } from 'xstate';
import { permissionReportingMachine } from '../../permissionReporting/permissionReporting.machine';
import { Permissions } from '../../permission.types';

export const someFeatureMachine = setup({
  actors: {
    permissionReportingMachine,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwPYFswDEwEMAuArgE5gCyOAxgBYCWAdmAJIQB0ANilFPVAMQBUAbQAMAXUSgADilg08NFHQkgAHogCcANgAsLbZuHqAzAA4TAdm2GArEYA0IAJ6Ijw83vOv1AJmEBGa28THwBfEIdUDGx8YjJKWgZmFgAzFBQWWDwcIjxeKBQAFRQAdRw5HkwUIgAFMCI0GlhZRRFxJBBpWXlFZTUEb1cWdVs-XyNjYWtrP20HZwRNb3dF41MjJe9fPzCI9CxcQhJyanomVlT0gHcy+TooSpq6hqaFOl5JJ8bmuhYoIhw6HhICwAEZsAhgPBpPBUVrKTrlHrtPomIyaFjmYLCCxBdSTEx+OaIczWdH6byaSmGExubTbcIgSL7GJHeKnJIXFjXcp3B61epfV7vT4vRQsCBgOg0YFgiFQlAwuHtBHdJTIxCo9GYvE4rHWAlEhZBPSLTTmPxUqZGaw7Rl7aKHOInRLnNJcm4VKr857fXgEWB1cU0CAFHCSABC4Mh0KoACUwABHCGZb2ClpieEyRFq0B9bQmbwmizmbzGSwDayG2xGIYU7x+C3mTFmoy2pkO2LHBJnFJu2XRhVUAAikulEGFAtFPz+AKBrH78sVGeVWdVvUQM001hY3m0m2Em2tQQLhs01oxozNB806lWmjb9oOnbZLt76QXMZHUsgfoDRCDIZhpGcoxvGSZwHgqZTkqUirq864IA2fjCLWfhmJimq2OYVZGLoJLDNo1j+KMwiTA+URPqyzo9lQAIQGwPBQd8sATj6rylLAYHJnOMEdHBSK5hq6i6HuaHmn41pWPqhoEiw0y3gpdJmIE5hhAydAoBK8DtO2lFOt2zCZl08HqggAC0u6GmZ27qDSpH2Q5pHaORzKOl27KsBwXA8EZ2YIdo2FOIgUm1osvhuOo5ikcMLkdlRBmuigvlrqZllBQg2j6HodYNp41i2d4sV6e5r6cpk2R4MlJmCQgJansIugrNayEmHuwhnkVLL6R5b7ujy9xeiK3xVQJqiIFMuh+MM6w6FNSw3qe55GOYd7GFSwitgyuldSVPach+g4AOL-ICkAjTmY2IZYujLURB4FrZrWnnuLBNUsyGEZM9K7BRO0vntfZRouw6jmdK7GaNfQkShzX6iSpImNY+iLei9YUlFFK3kYaKdW5-1JLRdD0YxQ2vNpsEQxdeaBfMaGFpFRijIEpGaGhm1hEAA */
  id: 'someFeatureMachineId',
  type: 'parallel',
  states: {
    foo: {
      initial: 'start',
      states: {
        start: {
          entry: raise({ type: 'goToWaitingForPermission' }),
          on: { goToWaitingForPermission: 'waitingForPermission' },
        },
        waitingForPermission: {
          on: {
            'permission.granted.bluetooth': { target: 'bluetoothGranted' },
            'permission.denied.bluetooth': { target: 'bluetoothDenied' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                permission: Permissions.bluetooth,
              }),
            },
          },
        },
        bluetoothGranted: {
          type: 'final',
        },
        bluetoothDenied: {
          on: {
            'permission.granted.bluetooth': { target: 'bluetoothGranted' },
            'user.didTapBluetoothRequestPermission': {
              actions: raise({
                type: 'permissionWasRequested',
                permission: Permissions.bluetooth,
              }),
            },
          },
        },
      },
    },
    handlingPermissions: {
      on: {
        permissionWasRequested: {
          actions: [
            sendTo('permissionHandler', ({ event }) => {
              return {
                type: 'requestPermission',
                permission: event.permission,
              };
            }),
          ],
        },
      },
      invoke: {
        id: 'permissionHandler',
        src: 'permissionReportingMachine',
        input: ({ self }) => ({
          permissions: [Permissions.bluetooth],
          parent: self,
        }),
      },
    },
  },
});
