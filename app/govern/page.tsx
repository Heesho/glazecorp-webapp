"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress } from "viem";

import { useGovernData, useVoting, StakePanel, VotePanel, GlobalStatsPanel, UserStatsCard } from "@/features/govern";
import { MULTICALL_ABI, MULTICALL_ADDRESS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { fetchEthPrice } from "@/lib/api/price";
import { fetchRevenueEstimate, type RevenueEstimate } from "@/lib/api/graph";
import { getLpTokenPriceUsd } from "@/lib/api/uniswapV2";
import { POLLING_INTERVAL_MS } from "@/config/constants";
import type { Address } from "viem";

export default function GovernPage() {
  const { address: userAddress } = useAccount();
  const governData = useGovernData(userAddress);
  const [ethPrice, setEthPrice] = useState(0);
  const [lpPriceUsd, setLpPriceUsd] = useState(0);
  // Initialize with fallback values so UI renders immediately
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate>({
    latestGlazeSpent: 0.1,
    revenuePerGlaze: 0.015,
    dailyRevenue: 0.72,
    weeklyRevenue: 5.04,
  });

  // Fetch miner state to get donutPrice
  const { data: minerState } = useReadContract({
    address: MULTICALL_ADDRESS,
    abi: MULTICALL_ABI,
    functionName: "getMiner",
    args: [userAddress ?? zeroAddress],
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  const donutPriceInEth = (minerState as { donutPrice?: bigint } | undefined)?.donutPrice ?? 0n;

  // Fetch DONUT total supply
  const { data: donutTotalSupply } = useReadContract({
    address: TOKEN_ADDRESSES.donut as Address,
    abi: [{ name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }],
    functionName: "totalSupply",
    chainId: base.id,
    query: { refetchInterval: POLLING_INTERVAL_MS },
  });

  // Fetch ETH price, LP price, and revenue estimate
  useEffect(() => {
    const fetchPrices = async () => {
      const [ethPriceValue, revenueData] = await Promise.all([
        fetchEthPrice(),
        fetchRevenueEstimate(),
      ]);

      if (revenueData) {
        setRevenueEstimate(revenueData);
      }

      if (ethPriceValue > 0) {
        setEthPrice(ethPriceValue);

        // Calculate donut price in USD for LP price calculation
        if (donutPriceInEth > 0n) {
          const donutPriceUsd = Number(donutPriceInEth) / 1e18 * ethPriceValue;
          const lpPrice = await getLpTokenPriceUsd(
            TOKEN_ADDRESSES.donutEthLp as Address,
            ethPriceValue,
            donutPriceUsd
          );
          if (lpPrice > 0) setLpPriceUsd(lpPrice);
        }
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [donutPriceInEth]);

  const {
    voterData,
    bribesData,
    strategiesData,
    strategyDataMap,
    donutAllowance,
    hasVotingPower,
    hasActiveVotes,
    canVote,
    canUnstake,
    totalPendingRewards,
    allBribeAddresses,
    refetchAll,
  } = governData;

  // Voting hook for claim functionality
  const {
    txStep: votingTxStep,
    isBusy: votingIsBusy,
    handleClaimBribes,
  } = useVoting(userAddress, refetchAll);

  return (
    <div className="pt-2">
      <div className="max-w-5xl mx-auto">
        {/* Global Stats Panel */}
        <GlobalStatsPanel
          voterData={voterData}
          bribesData={bribesData}
          strategyDataMap={strategyDataMap}
          ethPrice={ethPrice}
          donutTotalSupply={(donutTotalSupply as bigint) ?? 0n}
          revenueEstimate={revenueEstimate}
        />

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Column: Stake Section */}
          <div className="lg:w-80 shrink-0 flex flex-col">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
              Stake
            </div>
            <UserStatsCard
              voterData={voterData}
              totalPendingRewards={totalPendingRewards}
              ethPrice={ethPrice}
              donutPriceInEth={donutPriceInEth}
              lpPriceUsd={lpPriceUsd}
              isBusy={votingIsBusy}
              txStep={votingTxStep}
              onClaimBribes={handleClaimBribes}
              allBribeAddresses={allBribeAddresses}
            />
            <StakePanel
              userAddress={userAddress}
              voterData={voterData}
              donutAllowance={donutAllowance}
              hasActiveVotes={hasActiveVotes ?? false}
              canUnstake={canUnstake ?? true}
              onSuccess={refetchAll}
            />
          </div>

          {/* Right Column: Vote */}
          <div className="flex-1 min-w-0">
            <VotePanel
              userAddress={userAddress}
              voterData={voterData}
              bribesData={bribesData}
              strategyDataMap={strategyDataMap}
              hasVotingPower={hasVotingPower ?? false}
              canVote={canVote ?? false}
              hasActiveVotes={hasActiveVotes ?? false}
              ethPrice={ethPrice}
              donutPriceInEth={donutPriceInEth}
              lpPriceUsd={lpPriceUsd}
              onSuccess={refetchAll}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
