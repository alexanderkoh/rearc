import '@root/app/global.scss';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

import ActionButton from '@components/ActionButton';
import ActionListItem from '@components/ActionListItem';
import Card from '@components/Card';
import DefaultLayout from '@components/page/DefaultLayout';
import Grid from '@components/Grid';
import Navigation from '@components/Navigation';
import RowSpaceBetween from '@components/RowSpaceBetween';
import Table from '@components/Table';
import TableRow from '@components/TableRow';
import TableColumn from '@components/TableColumn';
import ConnectWalletButton from '@components/ConnectWalletButton';
import SwapInterface from '@components/SwapInterface';
import BalanceDisplay from '@components/BalanceDisplay';
import ChatAgent from '@components/ChatAgent';

export default function Page() {
  return (
    <DefaultLayout>
      <Navigation
        logo={<Image src="/rearc.png" alt="REARC" width={60} height={24} style={{ height: '24px', width: 'auto' }} />}
        left={
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <ActionButton>EXIT</ActionButton>
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM000</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>R E A R C&nbsp;&nbsp;X Y Z</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Automated Market Maker - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>
                <Link href="/swap" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="1.">Swap Tokens</ActionListItem>
                </Link>
              </TableColumn>
              <TableColumn>
                <Link href="/pools" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="4.">View Pools</ActionListItem>
                </Link>
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>
                <Link href="/balances" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="2.">Check Balances</ActionListItem>
                </Link>
              </TableColumn>
              <TableColumn>
                <Link href="/chat" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="5.">AI Assistant</ActionListItem>
                </Link>
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>
                <Link href="/liquidity" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="3.">Add Liquidity</ActionListItem>
                </Link>
              </TableColumn>
              <TableColumn>
                <Link href="/status" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <ActionListItem icon="6.">System Status</ActionListItem>
                </Link>
              </TableColumn>
            </TableRow>
          </Table>
          <br />
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>
                CF-3 Swap&nbsp;&nbsp;&nbsp;&nbsp;CF7-Balances&nbsp;&nbsp;&nbsp;&nbsp;CF21-AI Chat
              </TableColumn>
            </TableRow>
          </Table>
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>
                Ready for option number or command
                <span style={{ color: 'var(--theme-focused-foreground)' }}>_</span>
              </TableColumn>
            </TableRow>
          </Table>
        </Card>
        <br />
        <Card>
          <RowSpaceBetween>
            <span style={{ minWidth: `10ch` }}>SYSTEM</span>
            <span style={{ minWidth: `10ch` }}>Info</span>
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM000</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Network: Arc Testnet</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Chain ID: 5042002</TableColumn>
              <TableColumn></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;RPC: rpc.testnet.arc.network</TableColumn>
              <TableColumn></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Explorer: testnet.arcscan.app</TableColumn>
              <TableColumn></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Fee: 0.3%</TableColumn>
              <TableColumn></TableColumn>
            </TableRow>
          </Table>
        </Card>
      </Grid>
    </DefaultLayout>
  );
}
