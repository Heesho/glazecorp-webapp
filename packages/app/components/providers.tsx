"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { WagmiProvider, useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sdk } from "@farcaster/miniapp-sdk";
import { wagmiConfig } from "@/lib/wagmi";
import { DEFAULT_CHAIN_ID } from "@/lib/constants";
import { FARCASTER_AUTO_CONNECT_KEY, getFarcasterConnector } from "@/lib/farcaster-wallet";

type ProvidersProps = {
  children: ReactNode;
};

function NetworkGuard({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (isConnected && chainId !== DEFAULT_CHAIN_ID) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p style={{ marginBottom: "12px", fontSize: "16px" }}>
          Please switch to Base to use this app.
        </p>
        <button
          onClick={() => switchChain({ chainId: DEFAULT_CHAIN_ID })}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            background: "#0052FF",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Switch to Base
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

function AutoConnect() {
  const readyRef = useRef(false);
  const [isInFrame, setIsInFrame] = useState<boolean | null>(null);
  const { isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();
  const farcasterConnector = getFarcasterConnector(connectors);

  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      sdk.actions.ready().catch(() => {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const detectMiniApp = async () => {
      // sdk.context can hang indefinitely inside hosts that no longer respond
      // to Farcaster mini-app SDK methods (notably Base App after April 2026).
      // Race it against a 1.5s timeout so we don't sit on null isInFrame forever.
      try {
        const ctxPromise = (sdk as unknown as {
          context: Promise<{ user?: { fid?: number } }>;
        }).context;
        const ctx = await Promise.race([
          ctxPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ]);

        if (!cancelled) {
          setIsInFrame(!!ctx?.user?.fid);
        }
      } catch {
        if (!cancelled) {
          setIsInFrame(false);
        }
      }
    };

    detectMiniApp();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isInFrame !== true || isConnected || isConnecting || !farcasterConnector) {
      return;
    }

    const alreadyAttempted =
      typeof window !== "undefined" && sessionStorage.getItem(FARCASTER_AUTO_CONNECT_KEY);
    if (alreadyAttempted) return;

    if (typeof window !== "undefined") {
      sessionStorage.setItem(FARCASTER_AUTO_CONNECT_KEY, "true");
    }

    connectAsync({
      connector: farcasterConnector,
      chainId: DEFAULT_CHAIN_ID,
    }).catch(() => {});
  }, [connectAsync, farcasterConnector, isConnected, isConnecting, isInFrame]);

  return null;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoConnect />
        <NetworkGuard>{children}</NetworkGuard>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
