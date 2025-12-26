"use client";

import React, { useMemo, useCallback, useState } from "react";
import { formatUnits } from "viem";
import { ExternalLink } from "lucide-react";
import type { Address } from "viem";

import { Card, Button, StrategyIcon } from "@/components/ui";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/contracts";
import { useAuctions, type StrategyAuctionData } from "../hooks/useAuctions";

interface AuctionsPanelProps {
  userAddress?: Address;
  ethPrice: number;
  donutPriceInEth: bigint;
  lpPriceUsd: number;
}

const formatTokenAmount = (value: bigint, decimals = 18, maxDecimals = 2) => {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  if (num < 0.01 && num > 0) return num.toFixed(6);
  return num.toFixed(maxDecimals);
};

// Get USD price for a payment token
const getPaymentTokenUsdPrice = (
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
  if (tokenLower === TOKEN_ADDRESSES.cbbtc.toLowerCase()) return ethPrice * 28; // BTC ~28x ETH
  return 0;
};

// Get link to acquire the asset
const getAcquireLink = (token: Address): { href: string; label: string; external: boolean } => {
  const tokenLower = token.toLowerCase();
  // LP tokens go to Uniswap pools page
  if (tokenLower === TOKEN_ADDRESSES.donutEthLp.toLowerCase()) {
    return {
      href: `https://app.uniswap.org/explore/pools/base/${token}`,
      label: "Get",
      external: true
    };
  }
  // Regular tokens go to Uniswap token swap page
  return {
    href: `https://app.uniswap.org/explore/tokens/base/${token}?inputCurrency=NATIVE`,
    label: "Get",
    external: true
  };
};

interface AuctionCardProps {
  strategy: StrategyAuctionData;
  userAddress?: Address;
  ethPrice: number;
  donutPriceUsd: number;
  lpPriceUsd: number;
  getPaymentTokenSymbol: (address: Address) => string;
  needsApprovalForToken: (paymentToken: Address, amount: bigint) => boolean;
  handleApproveAndBuy: (strategy: StrategyAuctionData, amount: bigint) => Promise<void>;
  handleBuyForStrategy: (strategy: StrategyAuctionData, amount: bigint) => Promise<void>;
  isBusy: boolean;
  buyStep: string;
  buyResult: "success" | "failure" | null;
  activeStrategy: Address | null;
}

function AuctionCard({
  strategy,
  userAddress,
  ethPrice,
  donutPriceUsd,
  lpPriceUsd,
  getPaymentTokenSymbol,
  needsApprovalForToken,
  handleApproveAndBuy,
  handleBuyForStrategy,
  isBusy,
  buyStep,
  buyResult,
  activeStrategy,
}: AuctionCardProps) {
  const paymentDecimals = strategy.paymentTokenDecimals;
  const paymentSymbol = getPaymentTokenSymbol(strategy.paymentToken);
  const paymentTokenPriceUsd = getPaymentTokenUsdPrice(strategy.paymentToken, ethPrice, donutPriceUsd, lpPriceUsd);

  // PAY: currentPrice is the payment token amount to spend
  const payAmount = strategy.currentPrice;

  // GET: revenueBalance is the WETH accumulated (18 decimals)
  const getAmount = strategy.revenueBalance;

  // USD values
  const payUsd = Number(formatUnits(payAmount, paymentDecimals)) * paymentTokenPriceUsd;
  const getUsd = Number(formatUnits(getAmount, 18)) * ethPrice; // GET is WETH
  const difference = getUsd - payUsd;
  const profitPercent = payUsd > 0 ? (difference / payUsd) * 100 : 0;

  const hasSufficientBalance = strategy.accountPaymentTokenBalance >= payAmount;
  const requiresApproval = needsApprovalForToken(strategy.paymentToken, payAmount);
  const acquireLink = getAcquireLink(strategy.paymentToken);

  const isThisCardActive = activeStrategy === strategy.strategy;
  const cardIsBusy = isBusy && isThisCardActive;

  const handleSubmit = async () => {
    if (!userAddress || payAmount === 0n) return;
    if (requiresApproval) {
      await handleApproveAndBuy(strategy, payAmount);
    } else {
      await handleBuyForStrategy(strategy, payAmount);
    }
  };

  const getButtonText = () => {
    if (isThisCardActive) {
      if (buyResult === "success") return "SUCCESS!";
      if (buyResult === "failure") return "FAILED";
      if (buyStep === "approving") return "APPROVING...";
      if (buyStep === "buying") return "BUYING...";
    }
    if (!userAddress) return "CONNECT WALLET";
    return "BUY";
  };

  const canBuy = userAddress && payAmount > 0n && hasSufficientBalance;

  return (
    <Card noPadding>
      <div className="p-3">
        {/* Header with strategy name */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StrategyIcon paymentToken={strategy.paymentToken} size={24} />
            <span className="text-sm font-bold text-white">{paymentSymbol}</span>
          </div>
        </div>

        {/* Profitability */}
        <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded bg-black/30">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Profit</span>
          <span
            className={`text-sm font-bold font-mono ${
              difference >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {difference >= 0 ? "+" : ""}{profitPercent.toFixed(1)}% ({difference >= 0 ? "+" : ""}${Math.abs(difference).toFixed(2)})
          </span>
        </div>

        {/* PAY / GET Display - Compact */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* PAY */}
          <div className="bg-black/40 border border-white/10 rounded p-2">
            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">PAY</div>
            <div className="flex items-center gap-1.5">
              <StrategyIcon paymentToken={strategy.paymentToken} size={16} />
              <span className="text-sm font-bold font-mono text-white">
                {formatTokenAmount(payAmount, paymentDecimals, 2)}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">${payUsd.toFixed(2)}</div>
          </div>

          {/* GET */}
          <div className="bg-black/40 border border-white/10 rounded p-2">
            <div className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">GET</div>
            <div className="flex items-center gap-1.5">
              <img
                src="https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
                alt="ETH"
                className="w-4 h-4 rounded-full"
              />
              <span className="text-sm font-bold font-mono text-glaze-400">
                {formatTokenAmount(getAmount, 18, 5)}
              </span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">${getUsd.toFixed(2)}</div>
          </div>
        </div>

        {/* Balance + Get Link */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-[9px] font-mono text-zinc-500">
            Bal: <span className="text-white">{formatTokenAmount(strategy.accountPaymentTokenBalance, paymentDecimals)}</span>
          </div>
          <a
            href={acquireLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] font-mono text-glaze-400 hover:text-glaze-300"
          >
            {acquireLink.label}
            <ExternalLink size={9} />
          </a>
        </div>

        {/* Buy Button */}
        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={cardIsBusy || !canBuy}
          className="!py-2 !text-xs"
        >
          {getButtonText()}
        </Button>
      </div>
    </Card>
  );
}

export function AuctionsPanel({
  userAddress,
  ethPrice,
  donutPriceInEth,
  lpPriceUsd,
}: AuctionsPanelProps) {
  const [activeStrategy, setActiveStrategy] = useState<Address | null>(null);

  const {
    strategies,
    isLoading,
    buyStep,
    buyResult,
    isBusy,
    needsApprovalForToken,
    handleApproveAndBuy: originalHandleApproveAndBuy,
    handleBuyForStrategy: originalHandleBuy,
    getPaymentTokenSymbol,
  } = useAuctions(userAddress);

  // Calculate donut price in USD
  const donutPriceUsd = useMemo(() => {
    if (donutPriceInEth === 0n || ethPrice === 0) return 0;
    return Number(formatUnits(donutPriceInEth, 18)) * ethPrice;
  }, [donutPriceInEth, ethPrice]);

  // Sort strategies by profitability (most profitable first)
  const sortedStrategies = useMemo(() => {
    if (ethPrice === 0) return strategies;

    return [...strategies].sort((a, b) => {
      // Calculate profit for each strategy
      // PAY: currentPrice in payment token
      // GET: revenueBalance in WETH
      const aPaymentPrice = getPaymentTokenUsdPrice(a.paymentToken, ethPrice, donutPriceUsd, lpPriceUsd);
      const bPaymentPrice = getPaymentTokenUsdPrice(b.paymentToken, ethPrice, donutPriceUsd, lpPriceUsd);

      const aPayUsd = Number(formatUnits(a.currentPrice, a.paymentTokenDecimals)) * aPaymentPrice;
      const bPayUsd = Number(formatUnits(b.currentPrice, b.paymentTokenDecimals)) * bPaymentPrice;

      const aGetUsd = Number(formatUnits(a.revenueBalance, 18)) * ethPrice;
      const bGetUsd = Number(formatUnits(b.revenueBalance, 18)) * ethPrice;

      const aProfit = aPayUsd > 0 ? (aGetUsd - aPayUsd) / aPayUsd : -Infinity;
      const bProfit = bPayUsd > 0 ? (bGetUsd - bPayUsd) / bPayUsd : -Infinity;

      // Sort descending (highest profit % first)
      return bProfit - aProfit;
    });
  }, [strategies, ethPrice, donutPriceUsd, lpPriceUsd]);

  // Wrapper to set active strategy before buying
  const handleBuyForStrategy = useCallback(
    async (strategy: StrategyAuctionData, amount: bigint) => {
      setActiveStrategy(strategy.strategy);
      await originalHandleBuy(strategy, amount);
    },
    [originalHandleBuy]
  );

  // Wrapper for approve+buy that tracks active strategy
  const handleApproveAndBuy = useCallback(
    async (strategy: StrategyAuctionData, amount: bigint) => {
      setActiveStrategy(strategy.strategy);
      await originalHandleApproveAndBuy(strategy, amount);
    },
    [originalHandleApproveAndBuy]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 text-xs font-mono">Loading auctions...</div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600 text-xs font-mono">No auctions available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">
        Rig Auctions
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sortedStrategies.map((strategy) => (
          <AuctionCard
            key={strategy.strategy}
            strategy={strategy}
            userAddress={userAddress}
            ethPrice={ethPrice}
            donutPriceUsd={donutPriceUsd}
            lpPriceUsd={lpPriceUsd}
            getPaymentTokenSymbol={getPaymentTokenSymbol}
            needsApprovalForToken={needsApprovalForToken}
            handleApproveAndBuy={handleApproveAndBuy}
            handleBuyForStrategy={handleBuyForStrategy}
            isBusy={isBusy}
            buyStep={buyStep}
            buyResult={buyResult}
            activeStrategy={activeStrategy}
          />
        ))}
      </div>
    </div>
  );
}
