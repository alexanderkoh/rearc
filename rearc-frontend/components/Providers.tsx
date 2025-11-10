"use client";

import { MetaMaskProvider } from "@metamask/sdk-react";

export default function Providers({ children }: { children: React.ReactNode }) {
  const sdkOptions = {
    dappMetadata: {
      name: "REARC.XYZ",
      url: typeof window !== "undefined" ? window.location.origin : "https://rearc.xyz",
    },
  };

  return <MetaMaskProvider sdkOptions={sdkOptions}>{children}</MetaMaskProvider>;
}

