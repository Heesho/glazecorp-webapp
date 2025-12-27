"use client";

import React from "react";
import { formatUnits } from "viem";

interface FlowNodeProps {
  label: string;
  balance: bigint;
  decimals?: number;
  symbol?: string;
  usdValue?: number;
  pending?: bigint;
  pendingUsd?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  variant?: "primary" | "secondary" | "tertiary";
}

const formatAmount = (value: bigint, decimals: number): string => {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1000) return num.toFixed(0);
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return "0";
};

const formatUsd = (value: number): string => {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return "$0";
};

export function FlowNode({
  label,
  balance,
  decimals = 18,
  symbol = "WETH",
  usdValue,
  pending,
  pendingUsd,
  x,
  y,
  width = 120,
  height = 60,
  variant = "secondary",
}: FlowNodeProps) {
  const variantStyles = {
    primary: {
      bg: "#ec4899",
      border: "#f472b6",
      text: "#ffffff",
      subtext: "#fce7f3",
    },
    secondary: {
      bg: "#27272a",
      border: "#3f3f46",
      text: "#fafafa",
      subtext: "#a1a1aa",
    },
    tertiary: {
      bg: "#18181b",
      border: "#27272a",
      text: "#a1a1aa",
      subtext: "#71717a",
    },
  };

  const style = variantStyles[variant];
  const hasPending = pending && pending > 0n;
  const adjustedHeight = hasPending ? height + 12 : height;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Node background */}
      <rect
        x={-width / 2}
        y={-adjustedHeight / 2}
        width={width}
        height={adjustedHeight}
        rx={8}
        fill={style.bg}
        stroke={style.border}
        strokeWidth={1}
      />

      {/* Label */}
      <text
        x={0}
        y={-adjustedHeight / 2 + 14}
        textAnchor="middle"
        fill={style.text}
        fontSize={9}
        fontFamily="var(--font-jetbrains-mono), monospace"
        opacity={0.7}
      >
        {label}
      </text>

      {/* Balance */}
      <text
        x={0}
        y={hasPending ? -4 : 2}
        textAnchor="middle"
        fill={style.text}
        fontSize={12}
        fontWeight="bold"
        fontFamily="var(--font-jetbrains-mono), monospace"
      >
        {formatAmount(balance, decimals)} {symbol}
      </text>

      {/* USD value */}
      {usdValue !== undefined && (
        <text
          x={0}
          y={hasPending ? 10 : 16}
          textAnchor="middle"
          fill={style.subtext}
          fontSize={9}
          fontFamily="var(--font-jetbrains-mono), monospace"
        >
          {formatUsd(usdValue)}
        </text>
      )}

      {/* Pending amount (if any) */}
      {hasPending && (
        <>
          <text
            x={0}
            y={adjustedHeight / 2 - 10}
            textAnchor="middle"
            fill="#f59e0b"
            fontSize={9}
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            +{formatAmount(pending, decimals)} pending
          </text>
          {pendingUsd !== undefined && pendingUsd > 0 && (
            <text
              x={0}
              y={adjustedHeight / 2 - 1}
              textAnchor="middle"
              fill="#d97706"
              fontSize={8}
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              (+{formatUsd(pendingUsd)})
            </text>
          )}
        </>
      )}
    </g>
  );
}
