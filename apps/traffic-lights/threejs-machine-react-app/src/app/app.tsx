import BcScene from '../scenes/bc-scene/bc-scene';
import { TjScene } from '../scenes/tj-scene';

export function App() {
  return (
    <div style={{ width: '100%' }}>
      <div>
        <h1> TJ SCENE</h1>
        <TjScene />
      </div>

      <div>
        <h1> bc SCENE</h1>
        <BcScene />
      </div>
    </div>
  );
}

export default App;
