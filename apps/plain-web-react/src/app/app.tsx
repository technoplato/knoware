// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './app.module.css';

import NxWelcome from './nx-welcome';
import { useSkyLightMachine } from '@knoware/sky-machines';

export function App() {
  const [snapshot, send, actor] = useSkyLightMachine();
  return (
    <div>
      {/*<NxWelcome title="plain-react-app" />*/}
      {snapshot.value}
      {snapshot.nextEvents.map((event) => {
        return (
          <button onClick={() => send({ type: event })} key={event}>
            {event}
          </button>
        );
      })}
    </div>
  );
}

export default App;
