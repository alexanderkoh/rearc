import styles from '@components/Message.module.scss';

export default function Message(props: { children: React.ReactNode }) {
  return (
    <div className={styles.message}>
      <div className={styles.left}>
        <figure className={styles.triangle} />
      </div>
      <div className={styles.right}>
        <div className={styles.bubble}>{props.children}</div>
      </div>
    </div>
  );
}

