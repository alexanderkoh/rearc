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
import Input from '@components/Input';
import Button from '@components/Button';
import ConnectWalletButton from '@components/ConnectWalletButton';
import SwapInterface from '@components/SwapInterface';
import RecentSwaps from '@components/RecentSwaps';

export default function SwapPage() {
  return (
    <DefaultLayout>
      <Navigation
        logo={<Image src="/rearc.png" alt="REARC" width={60} height={24} style={{ height: '24px', width: 'auto', objectFit: 'contain' }} />}
        left={
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM001</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>T O K E N&nbsp;&nbsp;S W A P</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Exchange Interface - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <SwapInterface />
          <br />
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>CF-3 Back&nbsp;&nbsp;&nbsp;&nbsp;CF7-Refresh Rate&nbsp;&nbsp;&nbsp;&nbsp;CF21-Print Transaction</TableColumn>
            </TableRow>
          </Table>
        </Card>
        <br />
        <Card>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Recent Swaps</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>AMM001</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>Time</TableColumn>
              <TableColumn>From</TableColumn>
              <TableColumn>To</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>Amount</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>Status</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
          </Table>
          <RecentSwaps />
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

