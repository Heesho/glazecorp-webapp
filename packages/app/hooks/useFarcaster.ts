"use client";

import { useCallback, useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { base } from "wagmi/chains";
import { getFarcasterConnector } from "@/lib/farcaster-wallet";

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
  const injectedConnector = connectors.find((c) => c.id === "injected");
  const primaryConnector = isInFrame ? farcasterConnector : injectedConnector;

  // Fetch Farcaster context and detect frame environment
  useEffect(() => {
    let cancelled = false;
    const hydrateContext = async () => {
      try {
        const ctx = (await (sdk as unknown as {
          context: Promise<FarcasterContext> | FarcasterContext;
        }).context) as FarcasterContext;
        if (!cancelled) {
          // Only consider us "in frame" if context has a real user with a fid
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

    if (!primaryConnector) {
      throw new Error("Wallet connector not available");
    }

    try {
      const result = await connectAsync({
        connector: primaryConnector,
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

        if (typeof primaryConnector.getAccounts === "function") {
          const accounts = await primaryConnector.getAccounts().catch(() => []);
          if (accounts[0]) {
            return accounts[0];
          }
        }

        return undefined;
      }
      throw error;
    }
  }, [address, connectAsync, primaryConnector]);

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
