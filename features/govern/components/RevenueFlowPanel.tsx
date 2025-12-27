"use client";

import React, { useMemo } from "react";
import { type Address } from "viem";

import { StrategyIcon } from "@/components/ui";
import { PAYMENT_TOKEN_SYMBOLS } from "@/lib/blockchain/contracts";
import type { RevenueEstimate } from "@/lib/api/graph";
import type { BribeData, StrategyData } from "../hooks/useGovernData";

interface RevenueFlowPanelProps {
  revenueEstimate: RevenueEstimate | null;
  bribesData: BribeData[];
  strategyDataMap: Map<string, StrategyData>;
  ethPrice: number;
}

// Chart colors matching pie chart
const CHART_COLORS = [
  "#ec4899", // pink (brand)
  "#8b5cf6", // purple
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
];

const getPaymentTokenSymbol = (address: Address): string => {
  return PAYMENT_TOKEN_SYMBOLS[address.toLowerCase()] || "TOKEN";
};

const formatUsd = (value: number): string => {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function RevenueFlowPanel({
  revenueEstimate,
  bribesData,
  strategyDataMap,
  ethPrice,
}: RevenueFlowPanelProps) {
  // Calculate revenue per strategy based on vote percentages
  const strategyRevenues = useMemo(() => {
    if (!revenueEstimate || bribesData.length === 0) return [];

    return bribesData.map((bribe, i) => {
      const strategyData = strategyDataMap.get(bribe.strategy.toLowerCase());
      const symbol = strategyData ? getPaymentTokenSymbol(strategyData.paymentToken) : "Unknown";
      const votePercent = Number(bribe.votePercent) / 1e18;

      // Weekly revenue for this strategy in ETH
      const weeklyEth = revenueEstimate.weeklyRevenue * (votePercent / 100);
      const weeklyUsd = weeklyEth * ethPrice;

      return {
        strategy: bribe.strategy,
        paymentToken: strategyData?.paymentToken,
        symbol,
        votePercent,
        weeklyEth,
        weeklyUsd,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [revenueEstimate, bribesData, strategyDataMap, ethPrice]);

  const totalWeeklyUsd = revenueEstimate ? revenueEstimate.weeklyRevenue * ethPrice : 0;
  const revenuePerGlazeUsd = revenueEstimate ? revenueEstimate.revenuePerGlaze * ethPrice : 0;

  if (!revenueEstimate) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-600 text-xs font-mono">Loading revenue data...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Weekly Revenue
        </span>
        <span className="text-lg font-mono font-bold text-glaze-400">
          ~${formatUsd(totalWeeklyUsd)}
        </span>
      </div>

      {/* Strategy Revenue List */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {strategyRevenues.map((s) => (
          <div
            key={s.strategy}
            className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-2"
          >
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            {s.paymentToken && (
              <StrategyIcon paymentToken={s.paymentToken} size={24} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono text-white">{s.symbol}</div>
              <div className="text-[10px] font-mono text-zinc-500">
                {s.votePercent.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono font-semibold text-white">
                ${formatUsd(s.weeklyUsd)}
              </div>
              <div className="text-[9px] font-mono text-zinc-500">/week</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
