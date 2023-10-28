import styles from './bc-scene.module.css';

/* eslint-disable-next-line */
export interface BcSceneProps {}

export function BcScene(props: BcSceneProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to BcScene!</h1>
    </div>
  );
}

export default BcScene;
