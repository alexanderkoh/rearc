'use client';

import styles from '@components/TableColumn.module.scss';

import * as React from 'react';

type TableColumnProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  children?: React.ReactNode;
};

const TableColumn: React.FC<TableColumnProps> = ({ children, ...rest }) => {
  return (
    <td className={styles.root} {...rest}>
      {children}
    </td>
  );
};

TableColumn.displayName = 'TableColumn';

export default TableColumn;
