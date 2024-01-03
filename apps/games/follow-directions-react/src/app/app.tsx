// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from './app.module.css';

import NxWelcome from './nx-welcome';
import Level001ReactComponent
  from "../libs/games/follow-directions/ui/react/level-001/level-001-react-component/level-001-react-component";

export function App() {
  return (
    <div>
      <Level001ReactComponent/>
    </div>
  );
}

export default App;
