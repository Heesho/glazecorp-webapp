"use client";

import React, { useMemo } from "react";
import { formatUnits } from "viem";
import { AnimatedPipe, GlowFilter } from "./AnimatedPipe";
import { FlowNode } from "./FlowNode";
import type { SystemOverview, StrategyOverview } from "../hooks/useSystemData";

interface PriceData {
  ethPrice: number;
  btcPrice: number;
  donutPriceUsd: number;
  lpPriceUsd: number;
}

interface SystemFlowVisualizationProps {
  systemOverview: SystemOverview | null;
  strategies: StrategyOverview[];
  prices: PriceData;
}

// Get USD price for a token
const getTokenUsdPrice = (symbol: string, prices: PriceData): number => {
  const s = symbol.toUpperCase();
  if (s === "DONUT") return prices.donutPriceUsd;
  if (s === "UNI-V2" || s.includes("LP")) return prices.lpPriceUsd;
  if (s === "USDC") return 1;
  if (s === "CBBTC") return prices.btcPrice;
  return 0;
};

// Get friendly display name for token
const getTokenDisplayName = (symbol: string): string => {
  const s = symbol.toUpperCase();
  if (s === "UNI-V2") return "DONUT-ETH LP";
  return symbol;
};

// Calculate USD value
const calcUsd = (amount: bigint, decimals: number, priceUsd: number): number => {
  return Number(formatUnits(amount, decimals)) * priceUsd;
};

// Calculate WETH USD value
const calcWethUsd = (amount: bigint, ethPrice: number): number => {
  return Number(formatUnits(amount, 18)) * ethPrice;
};

export function SystemFlowVisualization({
  systemOverview,
  strategies,
  prices,
}: SystemFlowVisualizationProps) {
  // Consistent box dimensions
  const boxWidth = 130;
  const boxHeight = 55;

  // Column positions (evenly spaced across width)
  const col1 = 80;    // Revenue Router
  const col2 = 250;   // Voter
  const col3 = 440;   // Strategy
  const col4 = 640;   // Bribe Router
  const col5 = 840;   // Bribe

  // Row spacing
  const rowSpacing = 85;
  const topPadding = 50;

  // Calculate positions for strategies
  const strategyPositions = useMemo(() => {
    const count = strategies.length;
    if (count === 0) return [];

    return strategies.map((s, i) => ({
      ...s,
      x: col3,
      y: topPadding + i * rowSpacing,
    }));
  }, [strategies]);

  // SVG dimensions
  const width = 970;
  const height = Math.max(380, strategies.length * rowSpacing + topPadding + 30);

  // Left nodes centered vertically with strategies
  const centerY = topPadding + ((strategies.length - 1) * rowSpacing) / 2;
  const revenueRouterPos = { x: col1, y: centerY };
  const voterPos = { x: col2, y: centerY };

  if (!systemOverview) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 font-mono text-sm">
        Loading system data...
      </div>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block min-w-[800px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <GlowFilter />

        {/* === Main flow pipes === */}
        {/* Revenue Router -> Voter pipe */}
        <AnimatedPipe
          id="router-voter"
          path={`M ${revenueRouterPos.x + boxWidth/2} ${revenueRouterPos.y} L ${voterPos.x - boxWidth/2} ${voterPos.y}`}
          flowPercent={100}
          strokeWidth={4}
          isActive={true}
          particleColor="#ec4899"
        />

        {/* Voter -> Each Strategy pipes (based on vote percentage) */}
        {strategyPositions.map((strategy, index) => {
          const startX = voterPos.x + boxWidth/2;
          const startY = voterPos.y;
          const endX = strategy.x - (boxWidth + 20)/2;
          const endY = strategy.y;
          const midX = (startX + endX) / 2;
          const votePercent = Number(strategy.votePercent) / 1e18;

          return (
            <AnimatedPipe
              key={`voter-${strategy.strategy}`}
              id={`voter-strategy-${index}`}
              path={`M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`}
              flowPercent={votePercent}
              strokeWidth={3}
              isActive={strategy.isAlive}
              particleColor="#ec4899"
            />
          );
        })}

        {/* Strategy -> Bribe Router pipes */}
        {strategyPositions.map((strategy, index) => {
          const votePercent = Number(strategy.votePercent) / 1e18;
          return (
            <AnimatedPipe
              key={`strategy-router-${strategy.strategy}`}
              id={`strategy-briberouter-${index}`}
              path={`M ${col3 + (boxWidth + 20)/2} ${strategy.y} L ${col4 - (boxWidth + 10)/2} ${strategy.y}`}
              flowPercent={votePercent}
              strokeWidth={3}
              isActive={strategy.isAlive}
              particleColor="#ec4899"
            />
          );
        })}

        {/* Bribe Router -> Bribe pipes */}
        {strategyPositions.map((strategy, index) => {
          const votePercent = Number(strategy.votePercent) / 1e18;
          return (
            <AnimatedPipe
              key={`router-bribe-${strategy.strategy}`}
              id={`briberouter-bribe-${index}`}
              path={`M ${col4 + (boxWidth + 10)/2} ${strategy.y} L ${col5 - boxWidth/2} ${strategy.y}`}
              flowPercent={votePercent}
              strokeWidth={3}
              isActive={strategy.isAlive}
              particleColor="#ec4899"
            />
          );
        })}

        {/* === LAYER 3: All Nodes (on top of pipes) === */}

        {/* Revenue Router Node */}
        <FlowNode
          label="REVENUE ROUTER"
          balance={systemOverview.revenueRouterWethBalance}
          symbol="WETH"
          usdValue={calcWethUsd(systemOverview.revenueRouterWethBalance, prices.ethPrice)}
          x={revenueRouterPos.x}
          y={revenueRouterPos.y}
          variant="primary"
          width={boxWidth}
          height={boxHeight}
        />

        {/* Voter Node */}
        <FlowNode
          label="VOTER"
          balance={systemOverview.voterTotalClaimable}
          symbol="WETH"
          usdValue={calcWethUsd(systemOverview.voterTotalClaimable, prices.ethPrice)}
          x={voterPos.x}
          y={voterPos.y}
          variant="secondary"
          width={boxWidth}
          height={boxHeight}
        />

        {/* Strategy Rows */}
        {strategyPositions.map((strategy) => {
          const tokenPrice = getTokenUsdPrice(strategy.paymentTokenSymbol, prices);
          const displayName = getTokenDisplayName(strategy.paymentTokenSymbol);

          return (
            <g key={strategy.strategy}>
              {/* Strategy Node (WETH balance) */}
              <FlowNode
                label={`${displayName} STRATEGY`}
                balance={strategy.strategyWethBalance}
                symbol="WETH"
                usdValue={calcWethUsd(strategy.strategyWethBalance, prices.ethPrice)}
                pending={strategy.strategyClaimable}
                pendingUsd={calcWethUsd(strategy.strategyClaimable, prices.ethPrice)}
                x={strategy.x}
                y={strategy.y}
                variant="tertiary"
                width={boxWidth + 20}
                height={boxHeight}
              />

              {/* Bribe Router Node */}
              <FlowNode
                label="BRIBE ROUTER"
                balance={strategy.bribeRouterTokenBalance}
                decimals={strategy.paymentTokenDecimals}
                symbol={displayName}
                usdValue={calcUsd(strategy.bribeRouterTokenBalance, strategy.paymentTokenDecimals, tokenPrice)}
                x={col4}
                y={strategy.y}
                variant="tertiary"
                width={boxWidth + 10}
                height={boxHeight}
              />

              {/* Bribe Contract Node */}
              <FlowNode
                label="BRIBE"
                balance={strategy.bribeTokensLeft}
                decimals={strategy.paymentTokenDecimals}
                symbol={displayName}
                usdValue={calcUsd(strategy.bribeTokensLeft, strategy.paymentTokenDecimals, tokenPrice)}
                x={col5}
                y={strategy.y}
                variant="tertiary"
                width={boxWidth}
                height={boxHeight}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
