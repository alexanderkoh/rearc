import '@root/app/global.scss';

import * as React from 'react';
import { Suspense } from 'react';
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
import Button from '@components/Button';
import ConnectWalletButton from '@components/ConnectWalletButton';
import LiquidityInterface from '@components/LiquidityInterface';

export default function LiquidityPage() {
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM003</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>A D D&nbsp;&nbsp;L I Q U I D I T Y</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Provide Liquidity to Pool - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <Suspense fallback={<div>Loading...</div>}>
            <LiquidityInterface />
          </Suspense>
          <br />
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>CF-3 Add Liquidity&nbsp;&nbsp;&nbsp;&nbsp;CF7-Remove Liquidity&nbsp;&nbsp;&nbsp;&nbsp;CF21-Back to Pools</TableColumn>
            </TableRow>
          </Table>
        </Card>
        <br />
        <Card>
          <RowSpaceBetween>
            <span style={{ minWidth: `10ch` }}>INFO</span>
            <span style={{ minWidth: `10ch` }}>Details</span>
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM003</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Current Pool Reserves</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>AMM003</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Reserves update in real-time</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Check the interface above</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
          </Table>
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

