"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { base } from "wagmi/chains";
import {
  getBrowserWalletConnectors,
  getFarcasterConnector,
  shouldTryNextConnector,
} from "@/lib/farcaster-wallet";

export type FarcasterUser = {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
};

export type FarcasterContext = {
  user?: FarcasterUser;
};

/**
 * Hook to manage Farcaster Mini App context and wallet connection helpers
 */
export function useFarcaster() {
  const [context, setContext] = useState<FarcasterContext | null>(null);
  const [isInFrame, setIsInFrame] = useState<boolean | null>(null); // null = still detecting

  const { address, isConnected } = useAccount();
  const { connectors, connectAsync, isPending: isConnecting } = useConnect();

  // Find connectors by type
  const farcasterConnector = getFarcasterConnector(connectors);
  const browserConnectors = useMemo(() => getBrowserWalletConnectors(connectors), [connectors]);
  const primaryConnector = isInFrame ? farcasterConnector : browserConnectors[0];

  // Fetch Farcaster context and detect frame environment. Times out at 1.5s
  // because some hosts (Base App) no longer respond to Farcaster mini-app SDK
  // methods, and sdk.context would otherwise hang forever leaving isInFrame
  // stuck at null — which blocks every downstream connect/UI decision.
  useEffect(() => {
    let cancelled = false;
    const hydrateContext = async () => {
      try {
        const ctxPromise = (sdk as unknown as {
          context: Promise<FarcasterContext> | FarcasterContext;
        }).context as Promise<FarcasterContext>;
        const ctx = (await Promise.race([
          ctxPromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
        ])) as FarcasterContext | null;
        if (!cancelled) {
          const hasUser = !!(ctx?.user?.fid);
          setContext(hasUser ? ctx : null);
          setIsInFrame(hasUser);
        }
      } catch {
        if (!cancelled) {
          setContext(null);
          setIsInFrame(false);
        }
      }
    };
    hydrateContext();
    return () => {
      cancelled = true;
    };
  }, []);

  // Connect wallet manually
  const connect = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (address) {
      return address;
    }

    const connectorAttempts = isInFrame ? (farcasterConnector ? [farcasterConnector] : []) : browserConnectors;

    if (connectorAttempts.length === 0) {
      throw new Error("Wallet connector not available");
    }

    let lastError: unknown;

    for (const connector of connectorAttempts) {
      try {
        const result = await connectAsync({
          connector,
          chainId: base.id,
        });
        return result.accounts[0];
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === "ConnectorAlreadyConnectedError"
        ) {
          if (address) {
            return address;
          }

          if (typeof connector.getAccounts === "function") {
            const accounts = await connector.getAccounts().catch(() => []);
            if (accounts[0]) {
              return accounts[0];
            }
          }

          return undefined;
        }

        lastError = error;
        if (!shouldTryNextConnector(connector, error)) {
          break;
        }
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error("Wallet connection failed");
  }, [address, browserConnectors, connectAsync, farcasterConnector, isInFrame]);

  return {
    context,
    user: context?.user ?? null,
    address,
    isConnected,
    isConnecting,
    isInFrame,
    connect,
    primaryConnector,
  };
}

/**
 * Get user display name from Farcaster context
 */
export function getUserDisplayName(user: FarcasterUser | null | undefined): string {
  return user?.displayName ?? user?.username ?? "Farcaster user";
}

/**
 * Get user handle (@username or fid) from Farcaster context
 */
export function getUserHandle(user: FarcasterUser | null | undefined): string {
  if (user?.username) return `@${user.username}`;
  if (user?.fid) return `fid ${user.fid}`;
  return "";
}

/**
 * Get initials from a label (for avatar fallback)
 */
export function initialsFrom(label?: string): string {
  if (!label) return "";
  const stripped = label.replace(/[^a-zA-Z0-9]/g, "");
  if (!stripped) return label.slice(0, 2).toUpperCase();
  return stripped.slice(0, 2).toUpperCase();
}

/**
 * Compose and share a cast to Farcaster
 * Opens the native Farcaster compose UI with pre-filled text
 */
export async function composeCast(options: {
  text: string;
  embeds?: string[];
}): Promise<boolean> {
  try {
    // SDK expects embeds as a tuple of 0-2 URLs: [] | [string] | [string, string]
    const embedUrls = options.embeds?.slice(0, 2) as [] | [string] | [string, string] | undefined;
    await sdk.actions.composeCast({
      text: options.text,
      embeds: embedUrls,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Share a mining achievement to Farcaster
 */
export async function shareMiningAchievement(options: {
  tokenSymbol: string;
  tokenName: string;
  amountMined: string;
  rigUrl: string;
  message?: string;
}): Promise<boolean> {
  const { tokenSymbol, tokenName, amountMined, rigUrl, message } = options;

  let text = `⛏️ Just mined ${amountMined} $${tokenSymbol} on ${tokenName}!`;

  if (message) {
    text += `\n\n"${message}"`;
  }

  text += `\n\nMine with me 👇`;

  return composeCast({
    text,
    embeds: [rigUrl],
  });
}

/**
 * Share a new token launch to Farcaster
 */
export async function shareLaunch(options: {
  tokenSymbol: string;
  tokenName: string;
  appUrl: string;
}): Promise<boolean> {
  const { tokenSymbol, tokenName, appUrl } = options;

  const text = `🎉 Just opened a franchise!\n\n$${tokenSymbol} (${tokenName}) is now live.\n\nCome mine with me 👇`;

  return composeCast({
    text,
    embeds: [appUrl],
  });
}

/**
 * View a Farcaster user's profile
 * Opens the native Farcaster profile view
 */
export async function viewProfile(fid: number): Promise<boolean> {
  try {
    await sdk.actions.viewProfile({ fid });
    return true;
  } catch {
    return false;
  }
}
