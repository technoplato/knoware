import { machines } from '@knoware/machines';
export function otherLib(): string {
  const whatAreMachines = machines();
  return 'I depend on machines and they are: ' + whatAreMachines;
}
