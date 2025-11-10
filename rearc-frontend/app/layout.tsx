import type { Metadata } from "next";
import "@root/app/global.scss";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "REARC.XYZ - The First Agentic Exchange on Arc Blockchain",
  description: "The first agentic exchange on Arc blockchain. The operating system of the new economy. AI-powered AMM with intelligent liquidity management.",
  icons: {
    icon: '/rearc.ico',
  },
  openGraph: {
    title: "REARC.XYZ - The First Agentic Exchange on Arc Blockchain",
    description: "The first agentic exchange on Arc blockchain. The operating system of the new economy. AI-powered AMM with intelligent liquidity management.",
    images: [
      {
        url: '/rearc_opengraph.png',
        width: 1200,
        height: 630,
        alt: 'REARC - Agentic AMM',
      },
    ],
    type: 'website',
    siteName: 'REARC.XYZ',
  },
  twitter: {
    card: 'summary_large_image',
    title: "REARC.XYZ - The First Agentic Exchange on Arc Blockchain",
    description: "The first agentic exchange on Arc blockchain. The operating system of the new economy.",
    images: ['/rearc_opengraph.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="theme-dark font-use-departure-mono">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
