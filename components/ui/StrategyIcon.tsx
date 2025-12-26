"use client";

import React from "react";
import { type Address } from "viem";
import { DonutLogo } from "./DonutLogo";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";

// Token icon URLs
const TOKEN_ICONS: Record<string, string> = {
  [TOKEN_ADDRESSES.weth.toLowerCase()]: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png",
  [TOKEN_ADDRESSES.usdc.toLowerCase()]: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png",
  "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "https://coin-images.coingecko.com/coins/images/40143/small/cbbtc.webp", // cbBTC
};

// LP token mappings (payment token -> [token0, token1])
const LP_TOKEN_PAIRS: Record<string, [string, string]> = {
  [TOKEN_ADDRESSES.donutEthLp.toLowerCase()]: [TOKEN_ADDRESSES.donut.toLowerCase(), TOKEN_ADDRESSES.weth.toLowerCase()],
};

interface StrategyIconProps {
  paymentToken: Address;
  size?: number;
  className?: string;
}

export function StrategyIcon({ paymentToken, size = 24, className }: StrategyIconProps) {
  const tokenLower = paymentToken.toLowerCase();
  const lpPair = LP_TOKEN_PAIRS[tokenLower];

  // Check if it's DONUT
  const isDonut = tokenLower === TOKEN_ADDRESSES.donut.toLowerCase();

  // For LP tokens, show both icons overlapping
  if (lpPair) {
    const iconSize = size * 0.75;
    const overlap = size * 0.35;

    return (
      <div
        className={`relative flex-shrink-0 ${className}`}
        style={{ width: size + overlap, height: size }}
      >
        {/* First token (DONUT) */}
        {lpPair[0] === TOKEN_ADDRESSES.donut.toLowerCase() ? (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{ width: iconSize, height: iconSize }}
          >
            <DonutLogo className="w-full h-full" />
          </div>
        ) : (
          <img
            src={TOKEN_ICONS[lpPair[0]] || "/tokens/unknown.svg"}
            alt=""
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
            style={{ width: iconSize, height: iconSize }}
          />
        )}
        {/* Second token (ETH/WETH) */}
        <img
          src={TOKEN_ICONS[lpPair[1]] || "/tokens/unknown.svg"}
          alt=""
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{ width: iconSize, height: iconSize, left: overlap + iconSize * 0.25 }}
        />
      </div>
    );
  }

  // Single token icon
  if (isDonut) {
    return (
      <div className={className} style={{ width: size, height: size }}>
        <DonutLogo className="w-full h-full" />
      </div>
    );
  }

  // External token icon
  const iconUrl = TOKEN_ICONS[tokenLower];
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={`rounded-full flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  // Unknown token fallback
  return (
    <div
      className={`rounded-full bg-corp-700 flex items-center justify-center text-xs font-bold text-corp-300 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      ?
    </div>
  );
}
