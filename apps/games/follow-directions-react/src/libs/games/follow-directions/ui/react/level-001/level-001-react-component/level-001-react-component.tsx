import styles from './level-001-react-component.module.css';

/* eslint-disable-next-line */
export interface Level001ReactComponentProps {}

export function Level001ReactComponent(props: Level001ReactComponentProps) {
  return (
    <div className={styles['container']}>
      <h1>Welcome to Level001ReactComponent!</h1>
    </div>
  );
}

export default Level001ReactComponent;
