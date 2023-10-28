import styles from './bc-scene.module.css';
import { BcCopyTjScene } from './copy-tj/bc-copy-tj-scene';

/* eslint-disable-next-line */
export interface BcSceneProps {}

export function BcScene(props: BcSceneProps) {
  return (
    <div className={styles['container']}>
      <BcCopyTjScene />
    </div>
  );
}

export default BcScene;
