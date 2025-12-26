"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import { zeroAddress } from "viem";

import { Separator } from "@/components/ui";
import { useGovernData, StakePanel, VotePanel } from "@/features/govern";
import { MULTICALL_ABI, MULTICALL_ADDRESS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { fetchEthPrice } from "@/lib/api/price";
import { getLpTokenPriceUsd } from "@/lib/api/uniswapV2";
import { POLLING_INTERVAL_MS } from "@/config/constants";
import type { Address } from "viem";

export default function GovernPage() {
  const { address: userAddress } = useAccount();
  const governData = useGovernData(userAddress);
  const [ethPrice, setEthPrice] = useState(0);
  const [lpPriceUsd, setLpPriceUsd] = useState(0);

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

  // Fetch ETH price and LP price
  useEffect(() => {
    const fetchPrices = async () => {
      const ethPriceValue = await fetchEthPrice();
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

  return (
    <div className="pt-2">
      <div className="max-w-5xl mx-auto">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Left Column: Stake */}
          <div className="lg:w-80 shrink-0 flex flex-col gap-5">
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
              totalPendingRewards={totalPendingRewards}
              allBribeAddresses={allBribeAddresses}
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
