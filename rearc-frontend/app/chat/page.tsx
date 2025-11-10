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
import ChatAgent from '@components/ChatAgent';

export default function ChatPage() {
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM005</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>A I&nbsp;&nbsp;A S S I S T A N T&nbsp;&nbsp;C H A T</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - On-Chain Data Assistant - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <Card title="CHAT INTERFACE">
            <ChatAgent />
          </Card>
          <br />
          <br />
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>CF-3 Back&nbsp;&nbsp;&nbsp;&nbsp;CF7-Clear Chat&nbsp;&nbsp;&nbsp;&nbsp;CF21-Print History</TableColumn>
            </TableRow>
          </Table>
        </Card>
        <br />
        <Card>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;AI Agent Capabilities</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>AMM005</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;• Query pool statistics and liquidity data</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;• Analyze transaction history and status</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;• Check token balances and prices</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;• Calculate swap rates and price impact</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;• Provide network and system status</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}></TableColumn>
            </TableRow>
          </Table>
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

