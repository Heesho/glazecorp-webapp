"use client";

import React, { useMemo } from "react";
import { formatUnits, type Address } from "viem";

import { Card, GDonutLogo } from "@/components/ui";
import { PAYMENT_TOKEN_SYMBOLS } from "@/lib/blockchain/contracts";
import { DONUT_DECIMALS } from "@/config/constants";
import { RevenueFlowPanel } from "./RevenueFlowPanel";
import type { RevenueEstimate } from "@/lib/api/graph";
import type { VoterData, BribeData, StrategyData } from "../hooks/useGovernData";

interface GlobalStatsPanelProps {
  voterData: VoterData | null;
  bribesData: BribeData[];
  strategyDataMap: Map<string, StrategyData>;
  ethPrice: number;
  donutTotalSupply: bigint;
  revenueEstimate: RevenueEstimate | null;
}

// Pie chart colors
const CHART_COLORS = [
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

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 38;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = circumference * 0.25;

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
              style={{ transition: 'all 0.3s' }}
            />
          );
        })
    : null;

  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 100 100"
      className="block shrink-0"
    >
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
      {segments}
    </svg>
  );
}

export function GlobalStatsPanel({
  voterData,
  bribesData,
  strategyDataMap,
  ethPrice,
  donutTotalSupply,
  revenueEstimate,
}: GlobalStatsPanelProps) {
  // Pie chart data from vote distribution
  const pieChartData = useMemo(() => {
    return bribesData.map((bribe, i) => {
      const strategyData = strategyDataMap.get(bribe.strategy.toLowerCase());
      const symbol = strategyData ? getPaymentTokenSymbol(strategyData.paymentToken) : "Unknown";
      const votePercent = Number(bribe.votePercent) / 1e18;

      return {
        label: symbol,
        value: votePercent,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });
  }, [bribesData, strategyDataMap]);

  // Total gDONUT staked (total supply)
  const totalVotingPower = voterData?.governanceTokenTotalSupply ?? 0n;

  // Calculate staking percentage
  const stakingPercentage = useMemo(() => {
    if (donutTotalSupply === 0n) return 0;
    return (Number(totalVotingPower) / Number(donutTotalSupply)) * 100;
  }, [totalVotingPower, donutTotalSupply]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      {/* Protocol Overview Card */}
      <Card noPadding>
        <div className="p-4 h-full">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">
            Overview
          </div>

          <div className="flex items-center gap-5">
            <DonutChart data={pieChartData} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <GDonutLogo className="w-4 h-4" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  Staked
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {formatTokenAmount(totalVotingPower, DONUT_DECIMALS, 0)}
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {stakingPercentage.toFixed(1)}% of supply
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Revenue Flow Card */}
      <Card noPadding className="lg:col-span-2">
        <div className="p-4 h-full">
          <RevenueFlowPanel
            revenueEstimate={revenueEstimate}
            bribesData={bribesData}
            strategyDataMap={strategyDataMap}
            ethPrice={ethPrice}
          />
        </div>
      </Card>
    </div>
  );
}
