"use client";

import { useSDK } from "@metamask/sdk-react";
import { useEffect, useState } from "react";
import { ARC_NETWORK } from "@/lib/constants";
import ActionButton from "@components/ActionButton";

export default function ConnectWalletButton() {
  const { sdk, connected, connecting, account, chainId } = useSDK();
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  useEffect(() => {
    if (chainId) {
      setIsCorrectNetwork(parseInt(chainId, 16) === 5042002);
    }
  }, [chainId]);

  const connect = async () => {
    try {
      await sdk?.connect();
    } catch (err) {
      console.error("Wallet connect failed", err);
    }
  };

  const disconnect = () => {
    sdk?.terminate();
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum?.request({
        method: "wallet_addEthereumChain",
        params: [ARC_NETWORK],
      });
    } catch (err) {
      console.error("Failed to switch network", err);
    }
  };

  if (connected && account) {
    const shortAddr = `${account.substring(0, 6)}...${account.slice(-4)}`;
    return (
      <>
        {!isCorrectNetwork && (
          <ActionButton onClick={switchNetwork}>SWITCH TO ARC</ActionButton>
        )}
        <ActionButton onClick={disconnect}>DISCONNECT</ActionButton>
      </>
    );
  }

  return (
    <ActionButton onClick={connecting ? undefined : connect}>
      {connecting ? "CONNECTING..." : "CONNECT WALLET"}
    </ActionButton>
  );
}

