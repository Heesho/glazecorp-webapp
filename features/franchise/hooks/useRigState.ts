"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";

import {
  LAUNCHPAD_ADDRESSES,
  LAUNCHPAD_MULTICALL_ABI,
} from "@/lib/blockchain/contracts";
import type { SubgraphRig } from "@/lib/api/launchpad";

// Matches the contract's RigState struct
export interface RigState {
  epochId: bigint;
  initPrice: bigint;
  epochStartTime: bigint;
  glazed: bigint;
  price: bigint;
  ups: bigint;
  nextUps: bigint;
  unitPrice: bigint;
  miner: Address;
  epochUri: string;
  rigUri: string;
  ethBalance: bigint;
  wethBalance: bigint;
  donutBalance: bigint;
  unitBalance: bigint;
}

export interface RigInfo {
  address: Address;
  unitAddress: Address;
  tokenName: string;
  tokenSymbol: string;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export function useRigState(rig?: SubgraphRig | null) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const [rigState, setRigState] = useState<RigState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const accountAddress = userAddress || ZERO_ADDRESS;
  const rigAddress = rig?.id as Address | undefined;

  const fetchRigState = useCallback(async () => {
    if (!rigAddress || !publicClient) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("[useRigState] Fetching...", {
        rigAddress,
        accountAddress,
        multicall: LAUNCHPAD_ADDRESSES.multicall,
      });

      const data = await publicClient.readContract({
        address: LAUNCHPAD_ADDRESSES.multicall as Address,
        abi: LAUNCHPAD_MULTICALL_ABI,
        functionName: "getRig",
        args: [rigAddress, accountAddress],
      });

      console.log("[useRigState] Raw response:", data);
      setRigState(data as RigState);
    } catch (err) {
      console.error("[useRigState] Error:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [rigAddress, accountAddress, publicClient]);

  // Fetch on mount and when deps change
  useEffect(() => {
    fetchRigState();
  }, [fetchRigState]);

  // Polling
  useEffect(() => {
    if (!rigAddress) return;
    const interval = setInterval(fetchRigState, 5000);
    return () => clearInterval(interval);
  }, [rigAddress, fetchRigState]);

  // Build rigInfo from subgraph data
  const rigInfo: RigInfo | null = rig ? {
    address: rigAddress!,
    unitAddress: rig.unit as Address,
    tokenName: rig.name,
    tokenSymbol: rig.symbol,
  } : null;

  return {
    rigState,
    rigInfo,
    refetch: fetchRigState,
    isLoading,
    error,
  };
}
