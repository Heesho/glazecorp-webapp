"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import type { Address } from "viem";

import { LSG_ADDRESSES, LSG_MULTICALL_ABI } from "@/lib/blockchain/contracts";
import { POLLING_INTERVAL_MS } from "@/config/constants";

// Types
export type SystemOverview = {
  revenueRouter: Address;
  revenueRouterWethBalance: bigint;
  voterAddress: Address;
  voterTotalClaimable: bigint;
  totalWeight: bigint;
  bribeSplit: bigint;
  governanceToken: Address;
  governanceTokenTotalSupply: bigint;
  underlyingToken: Address;
  underlyingTokenDecimals: number;
  underlyingTokenSymbol: string;
  currentEpochStart: bigint;
  nextEpochStart: bigint;
  timeUntilNextEpoch: bigint;
  epochDuration: bigint;
  strategyCount: bigint;
};

export type StrategyOverview = {
  strategy: Address;
  bribe: Address;
  bribeRouter: Address;
  paymentToken: Address;
  paymentTokenSymbol: string;
  paymentTokenDecimals: number;
  isAlive: boolean;
  strategyWethBalance: bigint;
  strategyClaimable: bigint;
  strategyPendingRevenue: bigint;
  strategyTotalPotentialWeth: bigint;
  bribeRouterTokenBalance: bigint;
  bribeTokensLeft: bigint;
  bribeTotalSupply: bigint;
  strategyWeight: bigint;
  votePercent: bigint;
  epochId: bigint;
  epochPeriod: bigint;
  startTime: bigint;
  initPrice: bigint;
  currentPrice: bigint;
  timeUntilAuctionEnd: bigint;
};

export function useSystemData() {
  // Fetch system overview
  const { data: rawSystemOverview, refetch: refetchSystem, error: systemError } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getSystemOverview",
    args: [],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  // Fetch all strategy overviews
  const { data: rawStrategies, refetch: refetchStrategies, error: strategiesError } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getAllStrategyOverviews",
    args: [],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  // Log errors for debugging
  if (systemError) {
    console.error("System overview error:", systemError);
  }
  if (strategiesError) {
    console.error("Strategies error:", strategiesError);
  }

  const systemOverview = useMemo(() => {
    if (!rawSystemOverview) return null;
    return rawSystemOverview as unknown as SystemOverview;
  }, [rawSystemOverview]);

  const strategies = useMemo(() => {
    if (!rawStrategies) return [];
    return (rawStrategies as unknown as StrategyOverview[]).filter((s) => s.isAlive);
  }, [rawStrategies]);

  // Aggregate totals for visualization
  const aggregates = useMemo(() => {
    const totalStrategyWeth = strategies.reduce(
      (sum, s) => sum + s.strategyWethBalance,
      0n
    );
    const totalPending = strategies.reduce(
      (sum, s) => sum + s.strategyPendingRevenue,
      0n
    );
    const totalClaimable = strategies.reduce(
      (sum, s) => sum + s.strategyClaimable,
      0n
    );
    const totalBribeTokens = strategies.reduce(
      (sum, s) => sum + s.bribeTokensLeft,
      0n
    );
    const totalPotential = strategies.reduce(
      (sum, s) => sum + s.strategyTotalPotentialWeth,
      0n
    );

    return {
      totalStrategyWeth,
      totalPending,
      totalClaimable,
      totalBribeTokens,
      totalPotential,
    };
  }, [strategies]);

  const refetchAll = () => {
    refetchSystem();
    refetchStrategies();
  };

  const isLoading = !rawSystemOverview && !systemError;
  const hasError = !!systemError || !!strategiesError;

  return {
    systemOverview,
    strategies,
    aggregates,
    refetchAll,
    isLoading,
    hasError,
    error: systemError || strategiesError,
  };
}
