"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress, type Address } from "viem";

import {
  LSG_ADDRESSES,
  LSG_MULTICALL_ABI,
  GOVERNANCE_TOKEN_ABI,
  ERC20_ABI,
  TOKEN_ADDRESSES,
} from "@/lib/blockchain/contracts";
import { POLLING_INTERVAL_MS, EPOCH_DURATION_SECONDS } from "@/config/constants";

// Types
export type VoterData = {
  governanceToken: Address;
  revenueToken: Address;
  treasury: Address;
  underlyingToken: Address;
  underlyingTokenDecimals: number;
  totalWeight: bigint;
  strategyCount: bigint;
  governanceTokenTotalSupply: bigint;
  accountGovernanceTokenBalance: bigint;
  accountUnderlyingTokenBalance: bigint;
  accountUsedWeights: bigint;
  accountLastVoted: bigint;
};

export type BribeData = {
  strategy: Address;
  bribe: Address;
  isAlive: boolean;
  rewardTokens: Address[];
  rewardTokenDecimals: number[];
  rewardsPerToken: bigint[];
  accountRewardsEarned: bigint[];
  rewardsLeft: bigint[];
  voteWeight: bigint;
  votePercent: bigint;
  totalSupply: bigint;
  accountVote: bigint;
};

export type StrategyData = {
  strategy: Address;
  bribe: Address;
  bribeRouter: Address;
  paymentToken: Address;
  paymentReceiver: Address;
  isAlive: boolean;
  paymentTokenDecimals: number;
  strategyWeight: bigint;
  votePercent: bigint;
  claimable: bigint;
  pendingRevenue: bigint;
  routerRevenue: bigint;
  totalPotentialRevenue: bigint;
  epochPeriod: bigint;
  priceMultiplier: bigint;
  minInitPrice: bigint;
  epochId: bigint;
  initPrice: bigint;
  startTime: bigint;
  currentPrice: bigint;
  revenueBalance: bigint;
  accountVotes: bigint;
  accountPaymentTokenBalance: bigint;
};

// Utility functions
export const canVoteThisEpoch = (lastVoted: bigint): boolean => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const epochStart = (now / BigInt(EPOCH_DURATION_SECONDS)) * BigInt(EPOCH_DURATION_SECONDS);
  return lastVoted < epochStart;
};

export const formatTimeUntilNextEpoch = (lastVoted: bigint): string => {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const epochStart = (now / BigInt(EPOCH_DURATION_SECONDS)) * BigInt(EPOCH_DURATION_SECONDS);
  const nextEpoch = epochStart + BigInt(EPOCH_DURATION_SECONDS);

  if (lastVoted < epochStart) {
    return "Ready";
  }

  const remaining = Number(nextEpoch - now);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export function useGovernData(userAddress?: Address) {
  // Fetch voter data
  const { data: rawVoterData, refetch: refetchVoterData } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getVoterData",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const voterData = useMemo(() => {
    if (!rawVoterData) return null;
    return rawVoterData as unknown as VoterData;
  }, [rawVoterData]);

  // Fetch all bribes data
  const { data: rawBribesData, refetch: refetchBribesData } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getAllBribesData",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const bribesData = useMemo(() => {
    if (!rawBribesData) return [];
    return (rawBribesData as unknown as BribeData[]).filter((b) => b.isAlive);
  }, [rawBribesData]);

  // Fetch all strategies data
  const { data: rawStrategiesData, refetch: refetchStrategiesData } = useReadContract({
    address: LSG_ADDRESSES.lsgMulticall as Address,
    abi: LSG_MULTICALL_ABI,
    functionName: "getAllStrategiesData",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const strategiesData = useMemo(() => {
    if (!rawStrategiesData) return [];
    return (rawStrategiesData as unknown as StrategyData[]).filter((s) => s.isAlive);
  }, [rawStrategiesData]);

  // Create strategy data map
  const strategyDataMap = useMemo(() => {
    const map = new Map<string, StrategyData>();
    strategiesData.forEach((s) => {
      map.set(s.strategy.toLowerCase(), s);
    });
    return map;
  }, [strategiesData]);

  // Check DONUT allowance for governance token
  const { data: donutAllowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESSES.donut as Address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress ?? zeroAddress, LSG_ADDRESSES.governanceToken as Address],
    chainId: base.id,
    query: { enabled: !!userAddress },
  });

  // Get current delegate
  const { data: currentDelegate, refetch: refetchDelegate } = useReadContract({
    address: LSG_ADDRESSES.governanceToken as Address,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: "delegates",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { enabled: !!userAddress },
  });

  // Get voting power
  const { data: votingPower } = useReadContract({
    address: LSG_ADDRESSES.governanceToken as Address,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: "getVotes",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { enabled: !!userAddress },
  });

  // Derived values
  const hasVotingPower = voterData && voterData.accountGovernanceTokenBalance > 0n;
  const hasActiveVotes = voterData && voterData.accountUsedWeights > 0n;
  const canVote = voterData && canVoteThisEpoch(voterData.accountLastVoted);
  const canUnstake = voterData && voterData.accountUsedWeights === 0n;

  // Calculate total pending rewards
  const totalPendingRewards = useMemo(() => {
    if (!bribesData.length) return [];
    const rewardMap = new Map<string, { token: Address; decimals: number; amount: bigint }>();

    bribesData.forEach((bribe) => {
      bribe.rewardTokens.forEach((token, i) => {
        const earned = bribe.accountRewardsEarned[i] ?? 0n;
        if (earned > 0n) {
          const key = token.toLowerCase();
          const existing = rewardMap.get(key);
          if (existing) {
            existing.amount += earned;
          } else {
            rewardMap.set(key, {
              token,
              decimals: bribe.rewardTokenDecimals[i] ?? 18,
              amount: earned,
            });
          }
        }
      });
    });

    return Array.from(rewardMap.values());
  }, [bribesData]);

  const allBribeAddresses = useMemo(() => {
    return bribesData.map((b) => b.bribe);
  }, [bribesData]);

  const refetchAll = () => {
    refetchVoterData();
    refetchBribesData();
    refetchStrategiesData();
    refetchAllowance();
    refetchDelegate();
  };

  return {
    voterData,
    bribesData,
    strategiesData,
    strategyDataMap,
    donutAllowance: donutAllowance as bigint | undefined,
    currentDelegate: currentDelegate as Address | undefined,
    votingPower: votingPower as bigint | undefined,
    hasVotingPower,
    hasActiveVotes,
    canVote,
    canUnstake,
    totalPendingRewards,
    allBribeAddresses,
    refetchAll,
    refetchVoterData,
    refetchBribesData,
    refetchAllowance,
    refetchDelegate,
  };
}
