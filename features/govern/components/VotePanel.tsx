"use client";

import React, { useMemo } from "react";
import { formatUnits, type Address } from "viem";
import { Vote as VoteIcon, RotateCcw } from "lucide-react";

import { Card, StrategyIcon } from "@/components/ui";
import { PAYMENT_TOKEN_SYMBOLS, TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
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
  ethPrice: number;
  donutPriceInEth: bigint;
  lpPriceUsd: number;
  onSuccess: () => void;
}

// Pie chart colors - exported for consistency
export const CHART_COLORS = [
  "#ec4899", // pink (brand)
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
];

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
  } = useVoting(userAddress, onSuccess);

  return (
    <div className="flex flex-col gap-3">
      {/* Strategies List */}
      <div>
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
          Strategies
        </div>
        <div className="space-y-2">
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
      </div>

      {/* Total Footer */}
      {canVote && (
        <div className="px-3 py-2 bg-corp-900 border border-corp-700 rounded">
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

      {/* Vote Button */}
      <div className="space-y-2">
        <button
          onClick={handleVote}
          disabled={!hasVotingPower || !canVote || isBusy || totalVoteWeight === 0 || totalVoteWeight > 100}
          className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            hasVotingPower && canVote && totalVoteWeight > 0 && totalVoteWeight <= 100 && !isBusy
              ? "bg-glaze-500 text-white hover:bg-glaze-400"
              : "bg-glaze-500/30 text-glaze-300/60 cursor-not-allowed"
          }`}
        >
          <VoteIcon size={14} />
          {txResult === "success" ? "SUCCESS!" :
           txResult === "failure" ? "FAILED" :
           txStep === "voting" ? "VOTING..." :
           !hasVotingPower ? "STAKE TO VOTE" :
           !canVote ? `VOTED • NEXT ${voterData ? formatTimeUntilNextEpoch(voterData.accountLastVoted) : ""}` :
           totalVoteWeight === 0 ? "ENTER % TO VOTE" :
           totalVoteWeight > 100 ? "TOTAL EXCEEDS 100%" :
           totalVoteWeight < 100 ? `VOTE (${totalVoteWeight}%)` : "VOTE"}
        </button>
        {hasActiveVotes && canVote && (
          <button
            onClick={handleReset}
            disabled={isBusy}
            className="w-full py-2 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-2 bg-corp-800 text-corp-400 hover:text-corp-50 border border-corp-700"
          >
            <RotateCcw size={12} />
            {txStep === "resetting" ? "RESETTING..." : "RESET VOTES"}
          </button>
        )}
      </div>
    </div>
  );
}
