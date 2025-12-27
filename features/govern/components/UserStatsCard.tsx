"use client";

import React, { useMemo } from "react";
import { formatUnits, type Address } from "viem";

import { Card, GDonutLogo } from "@/components/ui";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";
import type { VoterData } from "../hooks/useGovernData";

interface UserStatsCardProps {
  voterData: VoterData | null;
  totalPendingRewards: { token: Address; decimals: number; amount: bigint }[];
  ethPrice: number;
  donutPriceInEth: bigint;
  lpPriceUsd: number;
  isBusy: boolean;
  txStep: string;
  onClaimBribes: (addresses: Address[]) => void;
  allBribeAddresses: Address[];
}

const formatTokenAmount = (value: bigint, decimals: number, maxFractionDigits = 2) => {
  if (value === 0n) return "0";
  const asNumber = Number(formatUnits(value, decimals));
  if (!Number.isFinite(asNumber)) return formatUnits(value, decimals);
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
};

const getTokenUsdPrice = (
  token: Address,
  ethPrice: number,
  donutPriceUsd: number,
  lpPriceUsd: number
): number => {
  const tokenLower = token.toLowerCase();
  if (tokenLower === TOKEN_ADDRESSES.weth.toLowerCase()) return ethPrice;
  if (tokenLower === TOKEN_ADDRESSES.usdc.toLowerCase()) return 1;
  if (tokenLower === TOKEN_ADDRESSES.donut.toLowerCase()) return donutPriceUsd;
  if (tokenLower === TOKEN_ADDRESSES.donutEthLp.toLowerCase()) return lpPriceUsd;
  return 0;
};

export function UserStatsCard({
  voterData,
  totalPendingRewards,
  ethPrice,
  donutPriceInEth,
  lpPriceUsd,
  isBusy,
  txStep,
  onClaimBribes,
  allBribeAddresses,
}: UserStatsCardProps) {
  const donutPriceUsd = useMemo(() => {
    if (donutPriceInEth === 0n || ethPrice === 0) return 0;
    return Number(formatUnits(donutPriceInEth, 18)) * ethPrice;
  }, [donutPriceInEth, ethPrice]);

  const hasPendingRewards = totalPendingRewards.length > 0;

  const totalRewardsUsd = useMemo(() => {
    return totalPendingRewards.reduce((sum, r) => {
      const amount = Number(formatUnits(r.amount, r.decimals));
      const price = getTokenUsdPrice(r.token, ethPrice, donutPriceUsd, lpPriceUsd);
      return sum + amount * price;
    }, 0);
  }, [totalPendingRewards, ethPrice, donutPriceUsd, lpPriceUsd]);

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {/* Voting Power */}
      <Card noPadding>
        <div className="p-3">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Voting Power
          </div>
          <div className="flex items-center gap-2">
            <GDonutLogo className="w-5 h-5" />
            <span className="text-xl font-bold font-mono text-glaze-400">
              {voterData
                ? formatTokenAmount(voterData.accountGovernanceTokenBalance, DONUT_DECIMALS)
                : "-"}
            </span>
          </div>
        </div>
      </Card>

      {/* Pending Rewards */}
      <Card noPadding>
        <div className="p-3">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
            Rewards
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-white">
              ${totalRewardsUsd.toFixed(2)}
            </span>
            {hasPendingRewards && (
              <button
                onClick={() => onClaimBribes(allBribeAddresses)}
                disabled={isBusy}
                className="px-2 py-0.5 text-[9px] font-mono font-bold bg-glaze-500 hover:bg-glaze-600 disabled:opacity-50 text-white rounded"
              >
                {txStep === "claiming" ? "..." : "CLAIM"}
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
