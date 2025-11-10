import '@root/app/global.scss';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import ActionButton from '@components/ActionButton';
import Card from '@components/Card';
import DefaultLayout from '@components/page/DefaultLayout';
import Grid from '@components/Grid';
import Navigation from '@components/Navigation';
import RowSpaceBetween from '@components/RowSpaceBetween';
import Table from '@components/Table';
import TableRow from '@components/TableRow';
import TableColumn from '@components/TableColumn';
import ConnectWalletButton from '@components/ConnectWalletButton';
import CreatePoolInterface from '@components/CreatePoolInterface';

export default function CreatePoolPage() {
  return (
    <DefaultLayout>
      <Navigation
        logo={<Image src="/rearc.png" alt="REARC" width={60} height={24} style={{ height: '24px', width: 'auto' }} />}
        left={
          <Link href="/pools" style={{ textDecoration: 'none', color: 'inherit' }}>
            <ActionButton>BACK</ActionButton>
          </Link>
        }
        right={<ConnectWalletButton />}
      />
      <br />
      <Grid>
        <Card>
          <RowSpaceBetween>
            <span style={{ minWidth: `10ch` }}>COMMAND</span>
            <span style={{ minWidth: `10ch` }}>Menu : ⌃+T</span>
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM007</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>C R E A T E&nbsp;&nbsp;N E W&nbsp;&nbsp;P O O L</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Pool Creation - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <CreatePoolInterface />
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

