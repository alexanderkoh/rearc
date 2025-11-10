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
import Button from '@components/Button';
import ConnectWalletButton from '@components/ConnectWalletButton';
import PoolsDisplay from '@components/PoolsDisplay';

export default function PoolsPage() {
  return (
    <DefaultLayout>
      <Navigation
        logo={<Image src="/rearc.png" alt="REARC" width={60} height={24} style={{ height: '24px', width: 'auto' }} />}
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM004</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>L I Q U I D I T Y&nbsp;&nbsp;P O O L S</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Pool Management - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>
                <Link href="/create-pool" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Button>CREATE NEW POOL</Button>
                </Link>
              </TableColumn>
              <TableColumn>
                <Link href="/liquidity" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <Button theme="SECONDARY">ADD LIQUIDITY</Button>
                </Link>
              </TableColumn>
            </TableRow>
          </Table>
          <br />
          <PoolsDisplay />
        </Card>
        <br />
        <Card>
          <RowSpaceBetween>
            <span style={{ minWidth: `10ch` }}>STATS</span>
            <span style={{ minWidth: `10ch` }}>Info</span>
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM004</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Pool Statistics</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>AMM004</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Total Pools: 3</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Total TVL: See pools above</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;24h Volume: $0.00</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Total Fees (24h): $0.00</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
          </Table>
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

