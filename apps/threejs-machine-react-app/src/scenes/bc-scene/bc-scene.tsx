import styles from './bc-scene.module.css';
import { BubbleScene } from './from-examples/Examples';

/* eslint-disable-next-line */
export interface BcSceneProps {}

export function BcScene(props: BcSceneProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to BcScene!</h1>
      <BubbleScene />
    </div>
  );
}

export default BcScene;
