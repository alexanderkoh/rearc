'use client';

import styles from '@components/Table.module.scss';

import * as React from 'react';

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  children?: React.ReactNode;
};

const Table: React.FC<TableProps> = ({ children, ...rest }) => {
  return (
    <table className={styles.root} {...rest}>
      <tbody className={styles.body}>{children}</tbody>
    </table>
  );
};

Table.displayName = 'Table';

export default Table;
