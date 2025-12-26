"use client";

import React, { useMemo } from "react";
import { formatUnits, type Address } from "viem";
import { Vote as VoteIcon, RotateCcw, Check } from "lucide-react";

import { Card, Button, GDonutLogo, StrategyIcon } from "@/components/ui";
import { PAYMENT_TOKEN_SYMBOLS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";
import { useVoting } from "../hooks/useVoting";
import {
  formatTimeUntilNextEpoch,
  type VoterData,
  type BribeData,
  type StrategyData,
} from "../hooks/useGovernData";

interface VotePanelProps {
  userAddress?: Address;
  voterData: VoterData | null;
  bribesData: BribeData[];
  strategyDataMap: Map<string, StrategyData>;
  hasVotingPower: boolean;
  canVote: boolean;
  hasActiveVotes: boolean;
  totalPendingRewards: { token: Address; decimals: number; amount: bigint }[];
  allBribeAddresses: Address[];
  ethPrice: number;
  donutPriceInEth: bigint;
  lpPriceUsd: number;
  onSuccess: () => void;
}

const formatTokenAmount = (value: bigint, decimals: number, maxFractionDigits = 2) => {
  if (value === 0n) return "0";
  const asNumber = Number(formatUnits(value, decimals));
  if (!Number.isFinite(asNumber)) return formatUnits(value, decimals);
  return asNumber.toLocaleString(undefined, { maximumFractionDigits: maxFractionDigits });
};

const getPaymentTokenSymbol = (address: Address): string => {
  return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] || "TOKEN";
};

const getStrategyInfo = (paymentToken: Address): { action: string; destination: string } => {
  const symbol = getPaymentTokenSymbol(paymentToken);
  return {
    action: symbol,
    destination: "DAO",
  };
};

// Pie chart colors
const CHART_COLORS = [
  "#ec4899", // pink (brand)
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
];

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 30;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = circumference * 0.25; // Start from top

  const segments = total > 0
    ? data
        .filter((d) => (d.value / total) * 100 >= 0.5)
        .map((d, i) => {
          const segmentLength = (d.value / total) * circumference;
          const dashArray = `${segmentLength} ${circumference - segmentLength}`;
          const dashOffset = currentOffset;
          currentOffset -= segmentLength;

          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              className="transition-all duration-300"
            />
          );
        })
    : null;

  return (
    <div className="w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#18181b" strokeWidth={strokeWidth} />
        {segments}
      </svg>
    </div>
  );
}

// Get USD price for a token
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

export function VotePanel({
  userAddress,
  voterData,
  bribesData,
  strategyDataMap,
  hasVotingPower,
  canVote,
  hasActiveVotes,
  totalPendingRewards,
  allBribeAddresses,
  ethPrice,
  donutPriceInEth,
  lpPriceUsd,
  onSuccess,
}: VotePanelProps) {
  // Calculate DONUT price in USD
  const donutPriceUsd = useMemo(() => {
    if (donutPriceInEth === 0n || ethPrice === 0) return 0;
    return Number(formatUnits(donutPriceInEth, 18)) * ethPrice;
  }, [donutPriceInEth, ethPrice]);
  const {
    txStep,
    txResult,
    isBusy,
    voteWeights,
    setVoteWeights,
    totalVoteWeight,
    handleVote,
    handleReset,
    handleClaimBribes,
  } = useVoting(userAddress, onSuccess);

  const hasPendingRewards = totalPendingRewards.length > 0;

  // Prepare pie chart data from current vote distribution
  const pieChartData = useMemo(() => {
    return bribesData.map((bribe, i) => {
      const strategyData = strategyDataMap.get(bribe.strategy.toLowerCase());
      const info = strategyData ? getStrategyInfo(strategyData.paymentToken) : { action: "Unknown" };
      const votePercent = Number(bribe.votePercent) / 1e18;

      return {
        label: info.action,
        value: votePercent,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [bribesData, strategyDataMap]);

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Vote Distribution, Voting Power & Rewards Row */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {/* Vote Distribution */}
        <Card noPadding>
          <div className="p-3 flex flex-col items-center justify-center h-full">
            <DonutChart data={pieChartData} />
          </div>
        </Card>

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
                ${totalPendingRewards.reduce((sum, r) => {
                  const amount = Number(formatUnits(r.amount, r.decimals));
                  const price = getTokenUsdPrice(r.token, ethPrice, donutPriceUsd, lpPriceUsd);
                  return sum + amount * price;
                }, 0).toFixed(2)}
              </span>
              {hasPendingRewards && (
                <button
                  onClick={() => handleClaimBribes(allBribeAddresses)}
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

      {/* Strategies List */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
          Strategies
        </div>
        <div className="h-[calc(100%-20px)] overflow-y-auto custom-scrollbar space-y-2 pr-1">
          {bribesData.length === 0 ? (
            <div className="flex items-center justify-center h-20">
              <div className="text-zinc-600 text-xs font-mono">Loading...</div>
            </div>
          ) : (
            bribesData.map((bribe, i) => {
              const strategyData = strategyDataMap.get(bribe.strategy.toLowerCase());
              const strategyInfo = strategyData
                ? getStrategyInfo(strategyData.paymentToken)
                : { action: `Strategy ${bribe.strategy.slice(0, 8)}...`, destination: "?" };
              const votePercent = Number(bribe.votePercent) / 1e18;
              const currentWeight = voteWeights[bribe.strategy] ?? 0;

              // Get user's earned rewards
              const paymentTokenIndex = strategyData
                ? bribe.rewardTokens.findIndex(
                    (t) => t.toLowerCase() === strategyData.paymentToken.toLowerCase()
                  )
                : -1;
              const userEarned = paymentTokenIndex >= 0 ? bribe.accountRewardsEarned[paymentTokenIndex] : 0n;
              const earnedDecimals = paymentTokenIndex >= 0 ? bribe.rewardTokenDecimals[paymentTokenIndex] : 18;

              // Calculate APR using rewardsPerToken and USD prices (like miniapp)
              let rewardsPerVoteUsd = 0;
              bribe.rewardTokens.forEach((token, idx) => {
                const rewardsPerToken = bribe.rewardsPerToken[idx] ?? 0n;
                const decimals = bribe.rewardTokenDecimals[idx] ?? 18;
                const tokenAmount = Number(formatUnits(rewardsPerToken, decimals));
                const tokenPrice = getTokenUsdPrice(token, ethPrice, donutPriceUsd, lpPriceUsd);
                rewardsPerVoteUsd += tokenAmount * tokenPrice;
              });
              const apr = donutPriceUsd > 0 ? (rewardsPerVoteUsd / donutPriceUsd) * 52 * 100 : 0;

              // User's vote as percentage
              const userVotePercent =
                voterData && voterData.accountGovernanceTokenBalance > 0n
                  ? (Number(bribe.accountVote) / Number(voterData.accountGovernanceTokenBalance)) * 100
                  : 0;

              const paymentSymbol = strategyData ? getPaymentTokenSymbol(strategyData.paymentToken) : "TOKEN";

              return (
                <Card key={bribe.strategy} noPadding>
                  <div className="p-2">
                    <div className="flex items-center gap-3">
                      {/* Color indicator matching donut chart */}
                      <div
                        className="w-1.5 h-10 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />

                      {/* Strategy Icon - fixed width container for alignment */}
                      <div className="w-10 h-8 flex items-center justify-center shrink-0">
                        {strategyData && (
                          <StrategyIcon
                            paymentToken={strategyData.paymentToken}
                            size={32}
                          />
                        )}
                        {!strategyData && (
                          <div
                            className="w-8 h-8 rounded-full bg-corp-700"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "40" }}
                          />
                        )}
                      </div>

                      {/* Strategy Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold font-mono text-white truncate">
                            {strategyInfo.action}
                          </span>
                          <span className="text-sm font-bold font-mono text-glaze-400">
                            {votePercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                          <span>
                            APR: <span className="text-zinc-300">{apr > 0 ? `${apr.toFixed(0)}%` : "-"}</span>
                          </span>
                          <span>
                            Earned:{" "}
                            <span className="text-white">
                              {userEarned > 0n ? formatTokenAmount(userEarned, earnedDecimals, 2) : "0"} {paymentSymbol}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Current Vote Badge + Input */}
                      <div className="shrink-0 flex items-center gap-2">
                        {bribe.accountVote > 0n && (
                          <div className="bg-glaze-500/20 text-glaze-400 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                            {userVotePercent.toFixed(0)}%
                          </div>
                        )}
                        {canVote && (
                          <div className="flex items-center bg-corp-800 border border-corp-700 rounded">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={currentWeight || ""}
                              onChange={(e) => {
                                const newWeight = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                setVoteWeights((prev) => ({
                                  ...prev,
                                  [bribe.strategy]: newWeight,
                                }));
                              }}
                              placeholder="0"
                              className="w-10 bg-transparent px-1 py-1 text-[10px] font-mono text-white text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[9px] text-zinc-500 pr-1.5">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Total Footer */}
        {canVote && (
          <div className="mt-2 px-3 py-2 bg-corp-900 border border-corp-700 rounded">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Total</span>
              <span className={`text-sm font-bold font-mono ${
                totalVoteWeight === 0 ? "text-zinc-500" :
                totalVoteWeight === 100 ? "text-emerald-400" :
                totalVoteWeight > 100 ? "text-red-400" : "text-glaze-400"
              }`}>
                {totalVoteWeight}%
                {totalVoteWeight > 0 && totalVoteWeight !== 100 && (
                  <span className="text-[9px] font-normal text-zinc-500 ml-1">
                    ({totalVoteWeight < 100 ? `${100 - totalVoteWeight}% left` : "exceeds 100%"})
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 shrink-0">
        {!hasVotingPower ? (
          <div className="bg-zinc-900 rounded p-3 text-center">
            <div className="text-[10px] font-mono text-zinc-500">
              Stake DONUT to get gDONUT voting power
            </div>
          </div>
        ) : !canVote ? (
          <Button
            variant="secondary"
            fullWidth
            disabled
            className="!py-3 !bg-yellow-500/10 !border-yellow-500/30"
          >
            <span className="text-yellow-400 text-xs font-mono">
              Voted • Next in {voterData ? formatTimeUntilNextEpoch(voterData.accountLastVoted) : ""}
            </span>
          </Button>
        ) : (
          <>
            <Button
              variant="primary"
              fullWidth
              onClick={handleVote}
              disabled={isBusy || totalVoteWeight === 0 || totalVoteWeight > 100}
              className="!py-3"
            >
              <VoteIcon size={14} className="mr-2" />
              {txResult === "success" ? "SUCCESS!" :
               txResult === "failure" ? "FAILED" :
               txStep === "voting" ? "VOTING..." :
               totalVoteWeight === 0 ? "ENTER % TO VOTE" :
               totalVoteWeight > 100 ? "TOTAL EXCEEDS 100%" :
               totalVoteWeight < 100 ? `VOTE (${totalVoteWeight}%)` : "VOTE"}
            </Button>
            {hasActiveVotes && (
              <Button
                variant="secondary"
                fullWidth
                onClick={handleReset}
                disabled={isBusy}
                className="!py-2"
              >
                <RotateCcw size={12} className="mr-2" />
                {txStep === "resetting" ? "RESETTING..." : "RESET VOTES"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
