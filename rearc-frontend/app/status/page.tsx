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
import SystemMetrics from '@components/SystemMetrics';

export default function StatusPage() {
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
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM006</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>S Y S T E M&nbsp;&nbsp;S T A T U S</TableColumn>
            </TableRow>
            <TableRow style={{ textAlign: 'center' }}>
              <TableColumn>- - Platform Metrics - -</TableColumn>
            </TableRow>
          </Table>
          <br />
          <SystemMetrics />
        </Card>
        <br />
        <Card>
          <RowSpaceBetween>
            <span style={{ minWidth: `10ch` }}>INFO</span>
            <span style={{ minWidth: `10ch` }}>About</span>
            <span style={{ minWidth: `10ch`, textAlign: 'right' }}>AMM006</span>
          </RowSpaceBetween>
          <Table style={{ minWidth: '71ch' }}>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Platform Information</TableColumn>
              <TableColumn style={{ textAlign: 'right' }}>AMM006</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Project: REARC.XYZ</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Type: Automated Market Maker (AMM)</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Model: Uniswap V2 Constant Product (x*y=k)</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Network: Arc Testnet (Chain ID: 5042002)</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Fee Structure: 0.3% per swap</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Features:</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Dynamic pool discovery</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Multi-token swaps</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Liquidity provision & removal</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• AI-powered chat assistant</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;• Real-time pool monitoring</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Built by: 
                <a 
                  href="https://x.com/bastiankoh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    textDecoration: 'none', 
                    color: 'var(--theme-focused-foreground)',
                    marginLeft: '0.5ch'
                  }}
                >
                  Bastian Koh (x.com/bastiankoh)
                </a>
              </TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;Repository: github.com/alexanderkoh/rearc</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;</TableColumn>
            </TableRow>
            <TableRow>
              <TableColumn>&nbsp;&nbsp;&nbsp;&nbsp;License: MIT</TableColumn>
            </TableRow>
          </Table>
        </Card>
      </Grid>
    </DefaultLayout>
  );
}

